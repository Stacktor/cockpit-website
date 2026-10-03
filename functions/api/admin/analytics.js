/**
 * GET /api/admin/analytics — Besuche auf cockpit.mesco.cc (Cloudflare) und eigene
 * Zahlen (Anmeldungen, Quellen, Trichter).
 *
 * Alle Besucherzahlen gelten nur für den Host cockpit.mesco.cc, nicht für die
 * ganze Zone mesco.cc. Gezählt werden HTML-Seitenaufrufe echter Besucher
 * (requestSource "eyeball"), dazu Besuche (`sum.visits`). Wie weit die Daten
 * zurückreichen, hängt vom Cloudflare-Tarif ab; die Grenzen fragt die Function
 * zuerst ab und teilt den Zeitraum bei Bedarf in Tagesstücke.
 *
 * Braucht CF_ANALYTICS_TOKEN (Analytics lesen) und CF_ZONE_ID; ohne beides gibt
 * es nur die eigenen Zahlen.
 */
import { json } from "../../../lib/admin/zugang.js";
import { anmeldungen, antworten, cloudflareGraphql, hinweis, proTag, sicher, zaehle } from "../../../lib/admin/daten.js";

export const HOST = "cockpit.mesco.cc";
const TAG = 86400;
const MAX_TAGE = 30;
const FILTER = `clientRequestHTTPHost: $host, requestSource: "eyeball", edgeResponseContentTypeName: "html"`;

const cfFehler = (r) => r.daten?.errors?.[0]?.message || (r.status ? `Status ${r.status}` : "nicht erreichbar");

/** Grenzen des Tarifs für httpRequestsAdaptiveGroups (Sekunden). */
export async function grenzen(env) {
  const r = await cloudflareGraphql(
    env,
    `query($zone: String!) { viewer { zones(filter: {zoneTag: $zone}) { settings { httpRequestsAdaptiveGroups { maxDuration notOlderThan } } } } }`,
    { zone: env.CF_ZONE_ID },
  );
  const g = r.ok ? r.daten?.data?.viewer?.zones?.[0]?.settings?.httpRequestsAdaptiveGroups : null;
  // Ohne Antwort vorsichtig bleiben: Tagesstücke, eine Woche zurück.
  return {
    maxDauer: Number(g?.maxDuration) > 0 ? Number(g.maxDuration) : TAG,
    zurueck: Number(g?.notOlderThan) > 0 ? Number(g.notOlderThan) : 7 * TAG,
  };
}

/** Tagesfenster (UTC), neuestes zuletzt; das älteste beginnt nicht vor `ab`. */
export function tagesFenster(jetzt, tage, ab) {
  const heute = Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate());
  const liste = [];
  for (let i = tage - 1; i >= 0; i--) {
    const von = Math.max(heute - i * TAG * 1000, ab);
    const bis = Math.min(heute - (i - 1) * TAG * 1000, jetzt.getTime());
    if (bis > von) liste.push({ tag: new Date(heute - i * TAG * 1000).toISOString().slice(0, 10), von: new Date(von).toISOString(), bis: new Date(bis).toISOString() });
  }
  return liste;
}

async function besuche(env, jetzt) {
  const { maxDauer, zurueck } = await grenzen(env);
  // Fünf Minuten Puffer, damit das älteste Fenster nicht knapp außerhalb liegt.
  const ab = jetzt.getTime() - (zurueck - 300) * 1000;
  const tage = Math.max(1, Math.min(MAX_TAGE, Math.floor(zurueck / TAG)));
  const fenster = tagesFenster(jetzt, tage, ab);
  if (!fenster.length) return hinweis("Cloudflare liefert für diesen Tarif keine Tageswerte.");

  // Je Tag ein Alias: funktioniert in jedem Tarif, auch wenn eine Abfrage höchstens einen Tag umfassen darf.
  const teile = fenster.map(
    (f, i) => `t${i}: httpRequestsAdaptiveGroups(limit: 1, filter: {datetime_geq: "${f.von}", datetime_lt: "${f.bis}", ${FILTER}}) { count sum { visits } }`,
  );
  const r = await cloudflareGraphql(env, `query($zone: String!, $host: String!) { viewer { zones(filter: {zoneTag: $zone}) { ${teile.join("\n")} } } }`, {
    zone: env.CF_ZONE_ID,
    host: HOST,
  });
  if (!r.ok || r.daten?.errors?.length) return hinweis(`Cloudflare: ${cfFehler(r)}`);
  const z = r.daten?.data?.viewer?.zones?.[0] || {};
  const proTag = fenster.map((f, i) => {
    const g = z[`t${i}`]?.[0];
    return { tag: f.tag, seiten: g?.count ?? 0, besuche: g?.sum?.visits ?? 0 };
  });
  const summe = (liste, feld) => liste.reduce((s, t) => s + (t[feld] || 0), 0);
  const letzte7 = proTag.slice(-7);
  const davor7 = proTag.length >= 14 ? proTag.slice(-14, -7) : null;
  return {
    ok: true,
    host: HOST,
    tage: proTag.length,
    proTag,
    seiten: summe(proTag, "seiten"),
    besuche: summe(proTag, "besuche"),
    woche: { seiten: summe(letzte7, "seiten"), besuche: summe(letzte7, "besuche") },
    vorwoche: davor7 ? { seiten: summe(davor7, "seiten"), besuche: summe(davor7, "besuche") } : null,
    stueckweise: maxDauer < tage * TAG,
  };
}

async function details(env, jetzt) {
  const { maxDauer, zurueck } = await grenzen(env);
  // Ein Abfragefenster: so lang wie erlaubt, höchstens 7 Tage.
  const sekunden = Math.min(maxDauer, zurueck - 300, 7 * TAG);
  const ab = new Date(jetzt.getTime() - sekunden * 1000).toISOString();
  const gruppe = (alias, dimension, limit) =>
    `${alias}: httpRequestsAdaptiveGroups(limit: ${limit}, filter: {datetime_geq: $ab, ${FILTER}}, orderBy: [count_DESC]) { count dimensions { ${dimension} } }`;
  const r = await cloudflareGraphql(
    env,
    `query($zone: String!, $ab: Time!, $host: String!) { viewer { zones(filter: {zoneTag: $zone}) {
      ${gruppe("pfade", "clientRequestPath", 12)}
      ${gruppe("herkunft", "clientRefererHost", 10)}
      ${gruppe("laender", "clientCountryName", 10)}
    } } }`,
    { zone: env.CF_ZONE_ID, ab, host: HOST },
  );
  if (!r.ok || r.daten?.errors?.length) return hinweis(`Seiten, Herkunft und Länder nicht verfügbar: ${cfFehler(r)}`);
  const z = r.daten?.data?.viewer?.zones?.[0] || {};
  const liste = (xs, feld, leer) => (xs || []).map((p) => ({ name: p.dimensions[feld] || leer, anzahl: p.count }));
  const tage = Math.round(sekunden / TAG);
  return {
    ok: true,
    zeitraum: tage >= 2 ? `${tage} Tage` : "24 Std.",
    pfade: liste(z.pfade, "clientRequestPath", "/"),
    herkunft: liste(z.herkunft, "clientRefererHost", "direkt oder unbekannt"),
    laender: liste(z.laender, "clientCountryName", "unbekannt"),
  };
}

export async function onRequestGet({ data }) {
  const env = data.env;
  const jetzt = new Date();
  const ohneCf = !env.CF_ANALYTICS_TOKEN || !env.CF_ZONE_ID;

  const [b, d, eigene] = await Promise.all([
    ohneCf ? hinweis("Für Besucherzahlen: Cloudflare-Token und Zonen-ID unter Einstellungen eintragen.") : sicher(() => besuche(env, jetzt)),
    ohneCf ? hinweis("Nicht eingerichtet.") : sicher(() => details(env, jetzt)),
    sicher(async () => {
      if (!env.ALPHA) return hinweis("KV-Namespace ALPHA ist nicht verbunden.");
      const [liste, antw] = await Promise.all([anmeldungen(env), antworten(env)]);
      const monat = Date.now() - 30 * 864e5;
      const woche = Date.now() - 7 * 864e5;
      const neu = liste.filter((e) => new Date(e.zeit).getTime() > monat);
      return {
        ok: true,
        anmeldungenProTag: proTag(liste.map((e) => e.zeit), 30),
        quellen: zaehle(liste.map((e) => e.herkunft || "unbekannt")),
        kampagnen: zaehle(liste.filter((e) => e.utm).map((e) => [e.utm.utm_source, e.utm.utm_campaign].filter(Boolean).join(" · "))),
        systeme: zaehle(liste.map((e) => e.os)),
        situation: zaehle(liste.map((e) => e.situation || "—")),
        trichter: {
          anmeldungen30: neu.length,
          anmeldungen7: liste.filter((e) => new Date(e.zeit).getTime() > woche).length,
          anmeldungen: liste.length,
          eingeladen: liste.filter((e) => e.status === "eingeladen").length,
          ersteUmfrage: new Set(antw.filter((a) => a.umfrage === "puls-tag3").map((a) => a.lizenzId)).size,
          grosseUmfrage: new Set(antw.filter((a) => a.umfrage === "alpha-gross").map((a) => a.lizenzId)).size,
        },
      };
    }),
  ]);

  return json(200, { besuche: b, details: d, eigene });
}
