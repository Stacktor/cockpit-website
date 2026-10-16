import assert from 'node:assert/strict';
import {KEYGEN_PRODUCT,KEYGEN_POLICY,KEYGEN_PREFIX,keygenAlphaLizenz,pruefeKeygen} from '../lib/keygen.js';
import {pruefeLizenz} from '../lib/app-lizenz.js';
import {onRequestPost as einladen,onRequestGet as anmeldungen} from '../functions/api/admin/alpha.js';
import {onRequestPost as aendern,onRequestGet as lizenzen} from '../functions/api/admin/lizenzen.js';
class KV {m=new Map();async get(k){return this.m.get(k)||null;}async put(k,v){this.m.set(k,v);}async delete(k){this.m.delete(k);}async list({prefix}){return {keys:[...this.m.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name})),list_complete:true};}}
const id='11111111-1111-4111-8111-111111111111', machine='22222222-2222-4222-8222-222222222222';
const env={ALPHA:new KV(),KEYGEN_PRODUCT_TOKEN:'server-token-test',RESEND_API_KEY:'resend-test',ALPHA_DOWNLOAD_URL:'https://cockpit.mesco.cc/download/'};
let valid=true,suspended=false,foreign=false,foreignPolicy=false,wrongMachine=false,offline=false,mailsFail=false,created=0,mails=0,storedKey='',deviceDeletes=0;
const fixture=()=>({id,type:'licenses',attributes:{name:'Test',key:storedKey||'test-key',suspended,expiry:null,metadata:{email:'test@example.org',name:'Test'},maxMachines:3},relationships:{product:{data:{id:foreign?'fremd':KEYGEN_PRODUCT}},policy:{data:{id:foreignPolicy?'fremd':KEYGEN_POLICY}},machines:{meta:{count:1}}}});
const response=(v,status=200)=>new Response(status===204?null:JSON.stringify(v),{status});
globalThis.fetch=async(url,init={})=>{
  url=String(url);
  if(url.includes('api.resend.com')) {mails++;assert.ok(JSON.parse(init.body).html.includes(KEYGEN_PREFIX));return response(mailsFail?{message:'mail fail'}:{id:'mail'},mailsFail?500:200);}
  assert.ok(url.startsWith('https://api.keygen.sh/v1/accounts/'));
  if(offline) return response({},503);
  const body=init.body?JSON.parse(init.body):null;
  if(url.endsWith('/licenses/actions/validate-key')) {
    assert.equal(init.headers.Authorization,'License test-key');
    assert.equal(body.meta.scope.product,KEYGEN_PRODUCT);assert.equal(body.meta.scope.policy,KEYGEN_POLICY);
    return response({meta:{valid:valid && !suspended,code:suspended?'SUSPENDED':valid?'VALID':'NO_MACHINES'},data:fixture()});
  }
  if(url.includes('/machines/')) {
    if(init.method==='DELETE'){deviceDeletes++;return response(null,204);}
    return response({data:{id:machine,type:'machines',attributes:{fingerprint:'fp'},relationships:{license:{data:{id:wrongMachine?'other':id}}}}});
  }
  if(url.includes('/machines?')) return response({data:[]});
  if(url.endsWith('/licenses') && init.method==='POST') {assert.equal(body.data.relationships.policy.data.id,KEYGEN_POLICY);created++;storedKey=body.data.attributes.key;return response({data:fixture()},201);}
  if(url.endsWith('/actions/suspend') || url.endsWith('/actions/reinstate')) {suspended=url.endsWith('/actions/suspend');return response({data:fixture()});}
  if(url.includes('/licenses?')) return response({data:[fixture()]});
  if(url.includes('/licenses/')) return response({data:fixture()});
  throw new Error('Unerwarteter Dienstpfad');
};
const key=KEYGEN_PREFIX+'test-key';
assert.equal((await pruefeKeygen(env,key,machine)).gueltig,true);
for(const property of ['foreign','foreignPolicy','wrongMachine','suspended']) {
  if(property==='foreign')foreign=true;if(property==='foreignPolicy')foreignPolicy=true;if(property==='wrongMachine')wrongMachine=true;if(property==='suspended')suspended=true;
  assert.equal((await pruefeKeygen(env,key,machine)).gueltig,false,property);
  foreign=foreignPolicy=wrongMachine=suspended=false;
}
offline=true;assert.equal(await pruefeKeygen(env,key,machine),null);offline=false;
valid=false;assert.equal((await pruefeKeygen(env,key,'',false)).gueltig,true);assert.equal((await pruefeKeygen(env,key,machine,true)).gueltig,false);valid=true;
// Geräteprüfung darf den Cache für allgemeine App-/Sync-Anfragen nicht freischalten.
assert.equal((await pruefeLizenz(env,key,'',{instanzPflicht:false})).ok,true);
assert.equal((await pruefeLizenz(env,key,'',{instanzPflicht:true})).ok,false);
const entry={mail:'test@example.org',name:'Test',status:'angenommen'};
await env.ALPHA.put('alpha:'+entry.mail,JSON.stringify(entry));
const call=()=>einladen({request:new Request('https://cockpit.mesco.cc/api/admin/alpha',{method:'POST',body:JSON.stringify({aktion:'einladen',mail:entry.mail})}),data:{env,benutzer:'test'}});
mailsFail=true;assert.equal((await call()).status,502);assert.equal(created,1);assert.equal(JSON.parse(await env.ALPHA.get('alpha:'+entry.mail)).keygen_lizenz_id,id);
mailsFail=false;assert.equal((await call()).status,200);assert.equal(created,1);assert.equal(mails,2);
const saved=await env.ALPHA.get('alpha:'+entry.mail);assert.ok(!saved.includes(storedKey));assert.ok(!saved.includes(KEYGEN_PREFIX));
const ready=await anmeldungen({data:{env:{...env,ALPHA_DOWNLOAD_URL:''}}});assert.equal((await ready.json()).einladenBereit,false);
const list=await lizenzen({request:new Request('https://cockpit.mesco.cc/api/admin/lizenzen'),data:{env}});assert.equal((await list.json()).lizenzen[0].id,'keygen:'+id);
const mailsBeforeManual=mails;
const manual=await aendern({request:new Request('https://cockpit.mesco.cc/api/admin/lizenzen',{method:'POST',body:JSON.stringify({aktion:'alpha-anlegen',name:'Manueller Tester',mail:'manual@example.org'})}),data:{env,benutzer:'test'}});
assert.equal(manual.status,200);assert.equal((await manual.json()).lizenz.id,'keygen:'+id);assert.equal(mails,mailsBeforeManual,'Manuelle Lizenzanlage darf keine Mail senden');
wrongMachine=true;
const denied=await aendern({request:new Request('https://cockpit.mesco.cc/api/admin/lizenzen',{method:'POST',body:JSON.stringify({id:'keygen:'+id,aktion:'geraet-abmelden',instanz:machine})}),data:{env,benutzer:'test'}});
assert.equal(denied.status,404);assert.equal(deviceDeletes,0);
console.log('Keygen: Produkt/Policy/Gerät, Sperrung, Netzfehler, Cachetrennung, Mail-Wiederholung ohne Doppellizenz, Admin-Geräteschutz: ok');
