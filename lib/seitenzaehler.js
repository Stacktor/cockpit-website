/**
 * Eigener Seitenzähler für cockpit.mesco.cc: zählt Aufrufe der HTML-Seiten, ohne Cookies, ohne Skript im Browser und
 * ohne IP-Adresse. Gespeichert werden nur Tagessummen unter `seiten:<tag>` in KV: Aufrufe je Pfad (auch Unterseiten), je
 * Herkunft (Referrer-Host), Land, Gerätetyp und Kampagne, dazu je Pfad die Herkunft. Es gibt keine Besucher-ID; „Besucher“
 * lassen sich damit nicht zählen, nur Aufrufe. Das Zählen passiert auf dem Server beim Ausliefern der Seite und greift nicht
 * auf das Gerät des Besuchers zu (kein Fall für § 25 TDDDG).
 */
export const TTL = 400 * 86400;
const MAX_EINTRAEGE = 300;
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|fetch|curl|wget|python|axios|http-?client|facebookexternalhit|embedly|discord|telegram|whatsapp|pingdom|uptime|check/i;

export const schluessel = (tag) => `seiten:${tag}`;

/** Pfad ohne Query, klein, mit Schrägstrich am Ende (außer bei Dateien), höchstens 80 Zeichen. */
export function pfadSauber(pfad) {
  let p = String(pfad || "/").split(/[?#]/)[0].toLowerCase().replace(/\/{2,}/g, "/");
  if (!p.startsWith("/")) p = "/" + p;
  if (!/\.[a-z0-9]{2,5}$/.test(p) && !p.endsWith("/")) p += "/";
  return p.slice(0, 80);
}

const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Zählbarer Aufruf oder null (kein GET, Bot, Vorabruf, Admin/API, keine HTML-Seite). */
export function ereignis(request, antwort) {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/")) return null;
  if (antwort.status !== 200) return null;
  if (!String(antwort.headers.get("content-type") || "").includes("text/html")) return null;
  const k = request.headers;
  if (/prefetch|prerender/i.test(`${k.get("sec-purpose") || ""} ${k.get("purpose") || ""}`)) return null;
  const dest = k.get("sec-fetch-dest");
  if (dest && dest !== "document") return null;
  const ua = k.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return null;
  const ref = host(k.get("referer") || "");
  const eigen = url.hostname.replace(/^www\./, "");
  const quelle = url.searchParams.get("utm_source") || "";
  const kampagne = url.searchParams.get("utm_campaign") || "";
  return {
    pfad: pfadSauber(url.pathname),
    ref: !ref ? "direkt" : ref === eigen ? "intern" : ref,
    land: (request.cf && request.cf.country) || k.get("cf-ipcountry") || "unbekannt",
    geraet: /ipad|tablet/i.test(ua) ? "Tablet" : /mobi|android|iphone/i.test(ua) ? "Handy" : "Computer",
    kampagne: [quelle, kampagne].filter(Boolean).join(" · ").slice(0, 60),
  };
}

const plus = (m, name) => {
  const k = String(name).slice(0, 80);
  if (k in m || Object.keys(m).length < MAX_EINTRAEGE) m[k] = (m[k] || 0) + 1;
  else m.sonstige = (m.sonstige || 0) + 1;
};

/** Addiert einen Aufruf auf den Tagesstand. */
export function addiere(stand, e) {
  const s = stand && typeof stand === "object" ? stand : {};
  const aus = {
    aufrufe: (Number(s.aufrufe) || 0) + 1,
    pfade: { ...(s.pfade || {}) },
    herkunft: { ...(s.herkunft || {}) },
    laender: { ...(s.laender || {}) },
    geraete: { ...(s.geraete || {}) },
    kampagnen: { ...(s.kampagnen || {}) },
    pfadHerkunft: { ...(s.pfadHerkunft || {}) },
  };
  plus(aus.pfade, e.pfad);
  plus(aus.herkunft, e.ref);
  plus(aus.laender, e.land);
  plus(aus.geraete, e.geraet);
  if (e.kampagne) plus(aus.kampagnen, e.kampagne);
  if (e.pfad in aus.pfadHerkunft || Object.keys(aus.pfadHerkunft).length < 100) {
    const m = { ...(aus.pfadHerkunft[e.pfad] || {}) };
    plus(m, e.ref);
    aus.pfadHerkunft[e.pfad] = m;
  }
  return aus;
}

/** Zählt einen Aufruf in KV (Lesen-Ändern-Schreiben; bei gleichzeitigen Aufrufen kann einer fehlen, das ist für Zahlen dieser Größe vertretbar). */
export async function erfasse(env, request, antwort, jetzt = new Date()) {
  if (!env.ALPHA) return false;
  const e = ereignis(request, antwort);
  if (!e) return false;
  const key = schluessel(jetzt.toISOString().slice(0, 10));
  const roh = await env.ALPHA.get(key);
  let stand = null;
  try {
    stand = roh ? JSON.parse(roh) : null;
  } catch {
    stand = null;
  }
  await env.ALPHA.put(key, JSON.stringify(addiere(stand, e)), { expirationTtl: TTL });
  return true;
}

const liste = (m, n = 12) =>
  Object.entries(m)
    .map(([name, anzahl]) => ({ name, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl)
    .slice(0, n);

/** Auswertung über mehrere Tage für das Admin. `tage`: [[tag, stand|null], …] alt → neu. */
export function auswerten(tage) {
  const summe = (feld) => {
    const m = {};
    for (const [, s] of tage) for (const [k, v] of Object.entries(s?.[feld] || {})) m[k] = (m[k] || 0) + v;
    return m;
  };
  const proTag = tage.map(([tag, s]) => ({ tag, aufrufe: Number(s?.aufrufe) || 0 }));
  const gesamt = proTag.reduce((a, t) => a + t.aufrufe, 0);
  const woche = proTag.slice(-7).reduce((a, t) => a + t.aufrufe, 0);
  const davor = proTag.length >= 14 ? proTag.slice(-14, -7).reduce((a, t) => a + t.aufrufe, 0) : null;
  const pfade = summe("pfade");
  const ph = {};
  for (const [, s] of tage)
    for (const [p, refs] of Object.entries(s?.pfadHerkunft || {}))
      for (const [r, n] of Object.entries(refs)) {
        ph[p] = ph[p] || {};
        ph[p][r] = (ph[p][r] || 0) + n;
      }
  return {
    proTag,
    aufrufe: gesamt,
    woche,
    vorwoche: davor,
    pfade: liste(pfade, 25).map((p) => ({ ...p, herkunft: liste(ph[p.name] || {}, 3) })),
    herkunft: liste(summe("herkunft"), 10),
    laender: liste(summe("laender"), 10),
    geraete: liste(summe("geraete"), 4),
    kampagnen: liste(summe("kampagnen"), 8),
  };
}
