/**
 * Audit-Log des Admin-Portals: jede ändernde Aktion mit Zeit, Person und
 * Kurzbeschreibung. Liegt im KV unter „audit:<Zeit>:<Zufall>“, 180 Tage.
 * Geheime Werte werden nie protokolliert — nur, dass sie geändert wurden.
 */
const TTL = 180 * 86400;

export async function protokolliere(env, benutzer, aktion, details = "") {
  if (!env.ALPHA) return;
  const zeit = new Date().toISOString();
  const id = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  await env.ALPHA.put(
    `audit:${zeit}:${id}`,
    JSON.stringify({ zeit, benutzer, aktion, details: String(details).slice(0, 300) }),
    { expirationTtl: TTL },
  );
}

export async function leseProtokoll(env, max = 100) {
  if (!env.ALPHA) return [];
  const schluessel = [];
  let cursor;
  do {
    const r = await env.ALPHA.list({ prefix: "audit:", cursor, limit: 1000 });
    schluessel.push(...r.keys.map((k) => k.name));
    cursor = r.list_complete === false ? r.cursor : undefined;
  } while (cursor && schluessel.length < 5000);
  const neueste = schluessel.sort().slice(-max).reverse();
  const eintraege = await Promise.all(
    neueste.map(async (k) => {
      try {
        return JSON.parse((await env.ALPHA.get(k)) || "null");
      } catch {
        return null;
      }
    }),
  );
  return eintraege.filter(Boolean);
}
