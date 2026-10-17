import {betrieb,lizenzIdentitaet} from './admin/betrieb.js';
export const dispatchId=(id)=>/^send-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(id||''));
export function zielgruppe(d={}) {
  const list=Array.isArray(d.lizenzen)?[...new Set(d.lizenzen.map(String))]:[];
  if(list.length>500 || list.some(id=>!lizenzIdentitaet(id)))throw new Error('Bitte höchstens 500 gültige Lizenz-IDs angeben.');
  return {lizenzen:list,version:String(d.version||'').trim().slice(0,30),system:String(d.system||'').trim().slice(0,80)};
}
export function passt(audience,license,version,system) {
  return (!audience.lizenzen.length || audience.lizenzen.includes(license)) && (!audience.version || audience.version===version) && (!audience.system || String(system||'').toLowerCase().includes(audience.system.toLowerCase()));
}
export async function aussenden(env,definition,audience,user) {
  const db=betrieb(env);if(!db)throw new Error('Für Sofortzustellung fehlt das D1-Binding BETRIEB.');
  const id=crypto.randomUUID(),now=new Date().toISOString();
  const snapshot={...structuredClone(definition),id:`send-${id}`,erzwingen:false,ausloeser:{art:'sofort'},verzoegerungStunden:0,start:now,ende:null,quelle:definition.id};
  await db.prepare('INSERT INTO survey_dispatch(id,survey_id,definition,audience,created_at,created_by) VALUES(?,?,?,?,?,?)')
    .bind(id,definition.id,JSON.stringify(snapshot),JSON.stringify(zielgruppe(audience)),now,user).run();
  return {id,zeit:now};
}
export async function dispatchLaden(env,appId,license,version,system) {
  const db=betrieb(env);if(!db||!dispatchId(appId))return null;
  const row=await db.prepare('SELECT * FROM survey_dispatch WHERE id=?').bind(appId.slice(5)).first();
  if(!row||!passt(JSON.parse(row.audience),license,version,system))return null;
  return {...row,definition:JSON.parse(row.definition)};
}
export async function quittieren(env,id,license,device,event) {
  const db=betrieb(env);if(!db)return;
  const column={received:'received_at',opened:'opened_at',answered:'answered_at'}[event];
  if(!column)throw new Error('Unbekannte Quittung.');
  await db.prepare(`INSERT INTO survey_receipt(dispatch_id,license_id,device_id,${column}) VALUES(?,?,?,?)
    ON CONFLICT(dispatch_id,license_id,device_id) DO UPDATE SET ${column}=excluded.${column} WHERE survey_receipt.${column} IS NULL`)
    .bind(id,license,device,new Date().toISOString()).run();
}
