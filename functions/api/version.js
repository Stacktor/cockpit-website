/**
 * GET /api/version — neueste öffentliche Version aus Stacktor/cockpit-releases.
 *
 * Fragt GitHub serverseitig (der Browser der Besucher spricht nicht mit GitHub)
 * und hält das Ergebnis 10 Minuten im Cloudflare-Cache. Gibt es noch kein
 * Release, kommt `{ version: null }` — die Download-Seite zeigt dann einen Hinweis.
 */
const QUELLE = "https://api.github.com/repos/Stacktor/cockpit-releases/releases/latest";

export async function onRequestGet({ request, waitUntil }) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const schluessel = new Request(new URL("/api/version", request.url).href);
  if (cache) {
    const gemerkt = await cache.match(schluessel);
    if (gemerkt) return gemerkt;
  }

  let koerper = { version: null, datum: null };
  try {
    const r = await fetch(QUELLE, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "cockpit-website" },
    });
    if (r.ok) {
      const d = await r.json();
      koerper = {
        version: typeof d.tag_name === "string" ? d.tag_name : null,
        datum: d.published_at || null,
        dateien: Array.isArray(d.assets) ? d.assets.map((a) => a.name) : [],
      };
    }
  } catch {
    /* ohne GitHub eben ohne Versionsangabe */
  }

  const antwort = new Response(JSON.stringify(koerper), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=600" },
  });
  if (cache) waitUntil(cache.put(schluessel, antwort.clone()));
  return antwort;
}
