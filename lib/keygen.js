/** Keygen-Lizenzen der geschlossenen Alpha. Administrativer Token nur serverseitig. */
export const KEYGEN_ACCOUNT = 'faef6df0-789d-4a6a-889b-ffa38ee22039';
export const KEYGEN_PRODUCT = '8788b1db-b3c3-4375-b2c2-5677f73259b5';
export const KEYGEN_POLICY = 'af9cc4aa-8fa8-4960-846c-53dcc0dec239';
export const KEYGEN_PREFIX = 'COCKPIT-KG-';
export const istKeygenSchluessel = (s) => String(s || '').startsWith(KEYGEN_PREFIX);
export const istKeygenId = (s) => /^keygen:[0-9a-f-]{36}$/i.test(String(s || ''));
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const ids = (env) => ({account: env.KEYGEN_ACCOUNT_ID || KEYGEN_ACCOUNT, product: env.KEYGEN_PRODUCT_ID || KEYGEN_PRODUCT, policy: env.KEYGEN_ALPHA_POLICY_ID || KEYGEN_POLICY});
export async function keygen(env, path, {method = 'GET', body, schluessel} = {}) {
  const c = ids(env);
  if (!UUID.test(c.account)) return {ok:false,status:0,daten:null};
  const raw = schluessel?.slice(KEYGEN_PREFIX.length);
  if (schluessel && (!istKeygenSchluessel(schluessel) || !raw || /[\r\n]/.test(raw) || raw.length > 4096)) return {ok:false,status:401,daten:null};
  try {
    const r = await fetch(`https://api.keygen.sh/v1/accounts/${c.account}/${path}`, {method,
      headers: {Authorization: schluessel ? `License ${raw}` : `Bearer ${env.KEYGEN_PRODUCT_TOKEN}`, Accept:'application/vnd.api+json','Content-Type':'application/vnd.api+json','Keygen-Version':'1.7'},
      body: body ? JSON.stringify(body) : undefined});
    return {ok:r.ok,status:r.status,daten:r.status===204 ? null : await r.json()};
  } catch { return {ok:false,status:0,daten:null}; }
}
export function cockpitLizenz(env, d) {
  const c = ids(env), a = d?.attributes;
  return d?.type === 'licenses' && UUID.test(d.id) && d.relationships?.product?.data?.id === c.product && d.relationships?.policy?.data?.id === c.policy
    && a && a.suspended === false && (!a.expiry || Number.isFinite(Date.parse(a.expiry)) && Date.parse(a.expiry) > Date.now());
}
/** Mit Instanz immer deren serverseitige Gerätekennung prüfen. Ohne Instanz nur Geräteverwaltung. */
export async function pruefeKeygen(env, schluessel, instanz, instanzPflicht = true) {
  const c = ids(env), scope = {product:c.product,policy:c.policy};
  let machine;
  if (instanz) {
    if (!UUID.test(instanz)) return {gueltig:false};
    const m = await keygen(env,`machines/${instanz}`,{schluessel});
    if (m.status === 0 || m.status === 402 || m.status === 429 || m.status >= 500) return null;
    if (!m.ok || !m.daten?.data?.attributes?.fingerprint) return {gueltig:false};
    machine=m.daten.data; scope.machine=instanz; scope.fingerprint=machine.attributes.fingerprint;
  } else if (instanzPflicht) return {gueltig:false};
  const r=await keygen(env,'licenses/actions/validate-key',{method:'POST',schluessel,body:{meta:{key:schluessel.slice(KEYGEN_PREFIX.length),scope}}});
  if (r.status === 0 || r.status === 402 || r.status === 429 || r.status >= 500) return null;
  const d=r.daten?.data, meta=r.daten?.meta;
  const fehltNurGeraet = !instanzPflicht && !instanz && ['NO_MACHINE','NO_MACHINES','FINGERPRINT_SCOPE_REQUIRED'].includes(meta?.code);
  const gueltig=Boolean(r.ok && cockpitLizenz(env,d) && (meta?.valid === true || fehltNurGeraet) && (!machine || machine.relationships?.license?.data?.id === d.id));
  return {gueltig, alpha:gueltig, lizenz:gueltig ? {id:`keygen:${d.id}`, email:d.attributes.metadata?.email || null,name:d.attributes.metadata?.name || null} : null};
}
export async function keygenAlphaLizenz(env, eintrag) {
  // Schlüssel bei Wiederholung über die gespeicherte ID laden; niemals im KV ablegen.
  if (eintrag.keygen_lizenz_id) return keygen(env,`licenses/${eintrag.keygen_lizenz_id}`);
  // Alte 256-Bit-Schlüssel wiederfinden, damit ein Update keine zweite Lizenz für
  // dieselbe Person erzeugt. Keygen erlaubt das Abrufen per URL-sicherem Lizenzschlüssel.
  const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.KEYGEN_PRODUCT_TOKEN),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(`cockpit-alpha-v1:${eintrag.mail}`));
  const bytes=new Uint8Array(hash);
  const hex=(werte)=>Array.from(werte,b=>b.toString(16).padStart(2,'0')).join('');
  const alt=await keygen(env,`licenses/${hex(bytes)}`);
  if (alt.ok && cockpitLizenz(env,alt.daten?.data)) return alt;
  if (![404].includes(alt.status)) return alt;
  // 128 HMAC-Bits (32 Hexzeichen) sind für nicht erratbare Alpha-Schlüssel
  // mehr als ausreichend und deutlich leichter abtippbar als die früheren 64.
  // Der HMAC-Schlüssel bleibt der geheime serverseitige Produkttoken.
  const raw=hex(bytes.slice(0,16));
  const r=await keygen(env,'licenses',{method:'POST',body:{data:{type:'licenses',attributes:{key:raw,name:`Alpha ${eintrag.name || eintrag.mail}`.slice(0,120),metadata:{email:eintrag.mail,name:eintrag.name || ''}},relationships:{policy:{data:{type:'policies',id:ids(env).policy}}}}}});
  if (r.status === 422) return keygen(env,`licenses/${raw}`);
  return r;
}
export function keygenAnsicht(d) {
  const a=d.attributes || {};
  return {id:`keygen:${d.id}`,anbieter:'Keygen',schluessel:KEYGEN_PREFIX+a.key,kurz:`…${String(a.key || '').slice(-8)}`,status:a.suspended?'disabled':a.expiry && Date.parse(a.expiry)<=Date.now()?'expired':'active',deaktiviert:Boolean(a.suspended),genutzt:d.relationships?.machines?.meta?.count ?? 0,limit:a.maxMachines ?? 3,kunde:a.metadata?.email || null,kundenName:a.metadata?.name || a.name,produkt:'cockpit Alpha',varianteId:d.relationships?.policy?.data?.id,bestellung:null,testmodus:false,erstellt:a.created,laeuftAb:a.expiry};
}
