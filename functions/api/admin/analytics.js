/**
 * GET /api/admin/analytics — Besuche (Cloudflare) + eigene Zahlen (Anmeldungen, Quellen, Trichter).
 * Cloudflare braucht CF_ANALYTICS_TOKEN (Analytics lesen) und CF_ZONE_ID; ohne beides
 * gibt es nur die eigenen Zahlen.
 */
import { json } from "../../../lib/admin/zugang.js";
import { anmeldungen, antworten, cloudflareGraphql, hinweis, proTag, sicher, zaehle } from "../../../lib/admin/daten.js";

const HOST = "cockpit.mesco.cc";

export async function onRequestGet({ data }) {
  const env = data.env;
  const seit = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);

  const [besuche, details, eigene] = await Promise.all([
    sicher(async () => {
      if (!env.CF_ANALYTICS_TOKEN || !env.CF_ZONE_ID) return hinweis("Für Besucherzahlen: Cloudflare-Token und Zonen-ID unter Einstellungen eintragen.");
      const r = await cloudflareGraphql(
        env,
        `query($zone: String!, $seit: Date!) { viewer { zones(filter: {zoneTag: $zone}) {
          tage: httpRequests1dGroups(limit: 31, filter: {date_geq: $seit}, orderBy: [date_ASC]) {
            dimensions { date }
            sum { requests pageViews countryMap { clientCountryName requests } }
            uniq { uniques }
          } } } }`,
        { zone: env.CF_ZONE_ID, seit },
      );
      if (!r.ok || r.daten?.errors?.length) return hinweis(`Cloudflare: ${r.daten?.errors?.[0]?.message || r.status}`);
      const tage = r.daten?.data?.viewer?.zones?.[0]?.tage || [];
      const laender = {};
      for (const t of tage) for (const c of t.sum.countryMap || []) laender[c.clientCountryName] = (laender[c.clientCountryName] || 0) + c.requests;
      return {
        ok: true,
        hinweis: "Tageswerte gelten für die ganze Zone (alle Subdomains).",
        proTag: tage.map((t) => ({ tag: t.dimensions.date, besucher: t.uniq.uniques, seiten: t.sum.pageViews, anfragen: t.sum.requests })),
        besucher30: tage.reduce((s, t) => s + t.uniq.uniques, 0),
        seiten30: tage.reduce((s, t) => s + t.sum.pageViews, 0),
        laender: Object.entries(laender).map(([name, anzahl]) => ({ name, anzahl })).sort((a, b) => b.anzahl - a.anzahl).slice(0, 10),
      };
    }),
    sicher(async () => {
      if (!env.CF_ANALYTICS_TOKEN || !env.CF_ZONE_ID) return hinweis("Nicht eingerichtet.");
      const ab = new Date(Date.now() - 24 * 3600e3).toISOString();
      const r = await cloudflareGraphql(
        env,
        `query($zone: String!, $ab: Time!, $host: String!) { viewer { zones(filter: {zoneTag: $zone}) {
          pfade: httpRequestsAdaptiveGroups(limit: 15, filter: {datetime_geq: $ab, clientRequestHTTPHost: $host, requestSource: "eyeball", edgeResponseContentTypeName: "html"}, orderBy: [count_DESC]) { count dimensions { clientRequestPath } }
          herkunft: httpRequestsAdaptiveGroups(limit: 10, filter: {datetime_geq: $ab, clientRequestHTTPHost: $host, requestSource: "eyeball", edgeResponseContentTypeName: "html"}, orderBy: [count_DESC]) { count dimensions { clientRefererHost } }
        } } }`,
        { zone: env.CF_ZONE_ID, ab, host: HOST },
      );
      if (!r.ok || r.daten?.errors?.length) return hinweis(`Seiten und Herkunft (24 h) nicht verfügbar: ${r.daten?.errors?.[0]?.message || r.status}`);
      const z = r.daten?.data?.viewer?.zones?.[0] || {};
      return {
        ok: true,
        pfade: (z.pfade || []).map((p) => ({ name: p.dimensions.clientRequestPath, anzahl: p.count })),
        herkunft: (z.herkunft || []).map((p) => ({ name: p.dimensions.clientRefererHost || "direkt", anzahl: p.count })),
      };
    }),
    sicher(async () => {
      if (!env.ALPHA) return hinweis("KV-Namespace ALPHA ist nicht verbunden.");
      const [liste, antw] = await Promise.all([anmeldungen(env), antworten(env)]);
      const monat = Date.now() - 30 * 864e5;
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
          anmeldungen: liste.length,
          eingeladen: liste.filter((e) => e.status === "eingeladen").length,
          ersteUmfrage: new Set(antw.filter((a) => a.umfrage === "puls-tag3").map((a) => a.lizenzId)).size,
          grosseUmfrage: new Set(antw.filter((a) => a.umfrage === "alpha-gross").map((a) => a.lizenzId)).size,
        },
      };
    }),
  ]);

  return json(200, { besuche, details, eigene });
}
