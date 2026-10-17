import {json} from '../../../lib/admin/zugang.js';
import {betrieb,indexLizenz,lizenzIdentitaet,merkeKontakt} from '../../../lib/admin/betrieb.js';
import {alleSchluessel,leseAlle} from '../../../lib/admin/daten.js';
import {protokolliere} from '../../../lib/admin/protokoll.js';
import {alleObjekte} from '../../../lib/sync.js';
import {onRequestGet as licenses} from './lizenzen.js';
export async function onRequestGet({data}) {
  const db=betrieb(data.env);
  if(!db)return json(200,{eingerichtet:false});
  const counts=await db.prepare(`SELECT
    (SELECT COUNT(*) FROM license_index) AS lizenzen,
    (SELECT COUNT(*) FROM person) AS personen,
    (SELECT COUNT(*) FROM license_device) AS geraete,
    (SELECT COUNT(*) FROM storage_owner) AS speicherzuordnungen`).first();
  return json(200,{eingerichtet:true,...counts});
}
/** Idempotente Bestandsübernahme. Kein R2-Objekt wird verschoben oder gelöscht. */
export async function onRequestPost(ctx) {
  const d=await ctx.request.json().catch(()=>null),env=ctx.data.env,db=betrieb(env);
  if(d?.aktion!=='migrieren')return json(400,{fehler:'Unbekannte Aktion.'});
  if(!db)return json(503,{fehler:'D1-Binding BETRIEB fehlt. Zuerst Migration 0001_betrieb.sql anwenden.'});
  let indexed=0;
  for(let page=1;page<=100;page++){
    const r=await licenses({...ctx,request:new Request(`https://cockpit.mesco.cc/api/admin/lizenzen?archiv=alle&limit=500&seite=${page}`)});
    if(!r.ok)return r;
    const body=await r.json();indexed+=body.lizenzen.length;
    if(page>=body.seiten)break;
  }
  const pings=await leseAlle(env,await alleSchluessel(env,'lping:'));
  for(const p of pings){
    const id=p._key.slice(6);
    if(lizenzIdentitaet(id)&&p.instanz)await merkeKontakt(env,id,p);
  }
  const grouped=new Map();
  if(env.SYNC)for(const o of await alleObjekte(env.SYNC,'l/')){
    const id=o.key.split('/')[1];if(!lizenzIdentitaet(id))continue;
    const current=grouped.get(id)||{bytes:0,objects:0,last:null};
    current.bytes+=o.size||0;current.objects++;
    const time=o.uploaded?new Date(o.uploaded).toISOString():null;
    if(time&&(!current.last||time>current.last))current.last=time;
    grouped.set(id,current);
  }
  for(const [id,v] of grouped){
    if(!await db.prepare('SELECT id FROM license_index WHERE id=?').bind(id).first())await indexLizenz(env,{id,status:'unknown'});
    await db.prepare(`INSERT INTO storage_owner(license_id,prefix,bytes,objects,last_activity,scanned_at) VALUES(?,?,?,?,?,?)
      ON CONFLICT(license_id) DO UPDATE SET bytes=excluded.bytes,objects=excluded.objects,last_activity=excluded.last_activity,scanned_at=excluded.scanned_at`)
      .bind(id,`l/${id}/`,v.bytes,v.objects,v.last,new Date().toISOString()).run();
  }
  await protokolliere(env,ctx.data.benutzer,'Betriebsindex abgeglichen',`${indexed} Lizenzen, ${pings.length} alte Kontaktmeldungen, ${grouped.size} Speicherräume`);
  return json(200,{ok:true,meldung:`${indexed} Lizenzen und ${grouped.size} Speicherräume abgeglichen. Vorhandene verschlüsselte Dateien bleiben erhalten.`});
}
