import assert from 'node:assert/strict';
import {database} from './d1-fixture.mjs';
import {indexLizenz,indexZusatz,merkeKontakt,geraeteKontakte,speicherPersonen,lizenzIdentitaet} from '../lib/admin/betrieb.js';
import {onRequestGet,onRequestPost} from '../functions/api/admin/lizenzen.js';
import {KEYGEN_PRODUCT,KEYGEN_POLICY,keygenListe} from '../lib/keygen.js';
const {db,sqlite}=database(),env={BETRIEB:db,KEYGEN_PRODUCT_TOKEN:'fixture'},id='keygen:11111111-1111-4111-8111-111111111111';
const person={id,kunde:'ONE@EXAMPLE.ORG',kundenName:'One',status:'active',limit:3};
await indexLizenz(env,person);
const first=sqlite.prepare('SELECT person_id FROM license_index WHERE id=?').get(id).person_id;
await indexLizenz(env,{...person,kunde:'new@example.org'});
assert.equal(sqlite.prepare('SELECT person_id FROM license_index WHERE id=?').get(id).person_id,first);
assert.equal(sqlite.prepare('SELECT email FROM person WHERE id=?').get(first).email,'new@example.org');
for(const device of ['a','b'])await merkeKontakt(env,id,{instanz:device,zeit:'2026-10-17T00:00:00Z',validiert_am:device==='a'?'2026-10-16T23:59:00Z':null,version:'0.1.1',system:'macos',status:'aktiv'});
const contacts=await geraeteKontakte(env,id);assert.equal(Object.keys(contacts).length,2);assert.equal(contacts.a.last_validated,'2026-10-16T23:59:00Z');assert.equal(contacts.b.last_validated,null);
assert.equal((await indexZusatz(env,[id]))[id].letzteBestaetigung,'2026-10-16T23:59:00Z');
assert.ok(lizenzIdentitaet(id));assert.ok(!lizenzIdentitaet('keygen:../../other'));assert.ok(!lizenzIdentitaet('arbitrary-secret-key'));
let deleted=0,missingPermission=false,suspended=false,pages=0;
const fixture=()=>({id:id.slice(7),type:'licenses',attributes:{key:'private-fixture',suspended,maxMachines:3,expiry:null,metadata:{name:'One',email:'new@example.org'}},relationships:{product:{data:{id:KEYGEN_PRODUCT}},policy:{data:{id:KEYGEN_POLICY}}}});
globalThis.fetch=async(url,init={})=>{
  const u=new URL(url),ok=(data,status=200)=>new Response(status===204?null:JSON.stringify(data),{status});
  if(u.pathname.endsWith('/actions/suspend'))suspended=true;
  if(u.pathname.endsWith('/actions/reinstate'))suspended=false;
  if(init.method==='DELETE'){if(missingPermission)return ok({},403);deleted++;return ok(null,204);}
  if(u.pathname.endsWith('/licenses')){if(!u.searchParams.has('page[cursor]')){assert.equal(u.searchParams.get('limit'),'100');assert.equal(u.searchParams.has('page[size]'),false);}pages++;return ok({data:[fixture()],links:{next:u.searchParams.has('page[cursor]')?null:`${u.pathname}?product=${KEYGEN_PRODUCT}&page[cursor]=${id.slice(7)}`}});}
  return ok({data:fixture()});
};
assert.equal((await keygenListe(env,`licenses?product=${KEYGEN_PRODUCT}`)).liste.length,1);assert.equal(pages,2);
const ctx=(body)=>({request:new Request('https://example.org/api/admin/lizenzen',{method:'POST',body:JSON.stringify({id,...body})}),data:{env,benutzer:'fixture'}});
assert.equal((await onRequestPost(ctx({aktion:'loeschen',bestaetigung:id}))).status,422);assert.equal(deleted,0);
assert.equal((await onRequestPost(ctx({aktion:'archivieren'}))).status,200);assert.ok((await indexZusatz(env,[id]))[id].archiviert);
missingPermission=true;assert.equal((await onRequestPost(ctx({aktion:'loeschen',bestaetigung:id}))).status,403);assert.equal(deleted,0);
missingPermission=false;assert.equal((await onRequestPost(ctx({aktion:'loeschen',bestaetigung:'wrong'}))).status,422);
assert.equal((await onRequestPost(ctx({aktion:'loeschen',bestaetigung:id}))).status,200);assert.equal(deleted,1);
assert.ok((await indexZusatz(env,[id]))[id].geloescht);
const storage=await speicherPersonen(env,[{lizenz:id,belegt:123}]);assert.equal(storage[0].person.email,'new@example.org');assert.ok(storage[0].person.deleted_at,'Speicher bleibt nach Lizenzlöschung auffindbar');
assert.equal(sqlite.prepare('SELECT prefix FROM storage_owner WHERE license_id=?').get(id).prefix,`l/${id}/`);
assert.ok(!JSON.stringify(sqlite.prepare('SELECT * FROM license_index').all()).includes('private-fixture'));
console.log('D1: stabile Person, geräteweise Kontakte/Bestätigungen, Pagination, Archiv-/Löschschutz, Tokenfehler und Speicher-Tombstone: ok');
