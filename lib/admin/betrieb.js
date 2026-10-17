/** D1 ist ein Index. Keygen bleibt die Lizenzquelle; vorhandene R2-Präfixe bleiben stabil. */
export function betrieb(env) {
  const db = env.BETRIEB;
  return db?.withSession ? db.withSession('first-primary') : db;
}
export const lizenzIdentitaet = (id) => /^(?:keygen:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|[0-9]{1,20})$/i.test(String(id || ''));
export async function indexLizenz(env, l) {
  const db = betrieb(env);
  if (!db) return;
  const now = new Date().toISOString(), email = String(l.kunde || '').trim().toLowerCase();
  const old = await db.prepare('SELECT person_id FROM license_index WHERE id=?').bind(l.id).first();
  // Person bleibt bei Änderung der Mail dieselbe. Keine Rohschlüssel als ID/Hashquelle.
  const person = old?.person_id || `person:${l.id}`;
  await db.batch([
    db.prepare(`INSERT INTO person(id,name,email,created_at,updated_at) VALUES(?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,updated_at=excluded.updated_at
      WHERE person.name IS NOT excluded.name OR person.email IS NOT excluded.email`)
      .bind(person, l.kundenName || '', email, now, now),
    db.prepare(`INSERT INTO license_index(id,provider,provider_ref,person_id,status,expires_at,device_limit,updated_at)
      VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,expires_at=excluded.expires_at,
      device_limit=excluded.device_limit,updated_at=excluded.updated_at
      WHERE license_index.status IS NOT excluded.status OR license_index.expires_at IS NOT excluded.expires_at OR license_index.device_limit IS NOT excluded.device_limit`)
      .bind(l.id, l.anbieter || (l.id.startsWith('keygen:') ? 'Keygen' : 'Altbestand'), l.id.replace(/^keygen:/,''), person, l.status || 'unknown', l.laeuftAb || null, l.limit ?? null, now),
    db.prepare('INSERT INTO storage_owner(license_id,prefix) VALUES(?,?) ON CONFLICT(license_id) DO NOTHING').bind(l.id, `l/${l.id}/`),
  ]);
}
export async function indexZusatz(env, ids) {
  const db = betrieb(env);
  if (!db || !ids.length) return {};
  const result = {};
  // D1 hat ein Parameterlimit; in kleinen Batches lesen.
  for (let i=0; i<ids.length; i+=50) {
    const batch = ids.slice(i,i+50);
    const r = await db.prepare(`SELECT * FROM license_index WHERE id IN (${batch.map(()=>'?').join(',')})`).bind(...batch).all();
    for (const l of r.results || []) result[l.id] = {archiviert:l.archived_at, geloescht:l.deleted_at, letzterKontakt:l.last_contact, letzteBestaetigung:l.last_validated,systeme:[],versionen:[]};
    const devices=await db.prepare(`SELECT license_id,platform,version FROM license_device WHERE license_id IN (${batch.map(()=>'?').join(',')})`).bind(...batch).all();
    for(const g of devices.results||[]){
      const l=result[g.license_id];if(!l)continue;
      if(g.platform&&!l.systeme.includes(g.platform))l.systeme.push(g.platform);
      if(g.version&&!l.versionen.includes(g.version))l.versionen.push(g.version);
    }
  }
  return result;
}
export async function merkeKontakt(env, id, ping, person = {}) {
  const db = betrieb(env);
  if (!db || !ping.instanz) return;
  const now = ping.zeit, valid = ping.validiert_am || null; // Tatsächlicher Anbieterzeitpunkt, nicht Client-Status oder bloßer Kontakt.
  const existing = await db.prepare('SELECT id FROM license_index WHERE id=?').bind(id).first();
  if (!existing) await indexLizenz(env,{id,kunde:person.email,kundenName:person.name,status:'active'});
  await db.batch([
    db.prepare(`INSERT INTO license_device(license_id,id,platform,version,last_contact,last_validated,status)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(license_id,id) DO UPDATE SET platform=excluded.platform,version=excluded.version,
      last_contact=excluded.last_contact,last_validated=COALESCE(excluded.last_validated,license_device.last_validated),status=excluded.status`)
      .bind(id,ping.instanz,ping.system,ping.version,now,valid,ping.status),
    db.prepare('UPDATE license_index SET last_contact=?,last_validated=COALESCE(?,last_validated) WHERE id=?').bind(now,valid,id),
  ]);
}
export async function geraeteKontakte(env,id) {
  const db = betrieb(env);
  if (!db) return {};
  const r = await db.prepare('SELECT * FROM license_device WHERE license_id=?').bind(id).all();
  return Object.fromEntries((r.results || []).map(g=>[g.id,g]));
}
export async function speicherPersonen(env, list) {
  const db = betrieb(env);
  if (!db) return list;
  const r = await db.prepare(`SELECT l.id,l.deleted_at,p.name,p.email FROM license_index l LEFT JOIN person p ON p.id=l.person_id`).all();
  const people = Object.fromEntries((r.results || []).map(l=>[l.id,l]));
  return list.map(l=>({...l,person:people[l.lizenz] || null}));
}
