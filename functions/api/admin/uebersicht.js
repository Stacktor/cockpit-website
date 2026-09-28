/**
 * GET /api/admin/uebersicht — Kennzahlen für die Startseite des Dashboards.
 * Jede Quelle einzeln abgesichert: Fehlt ein Schlüssel, zeigt die Kachel einen Hinweis.
 */
import { json } from "../../../lib/admin/zugang.js";
import { anmeldungen, antworten, belegtStatus, fehlerberichte, github, hinweis, lemon, proTag, resend, sicher, zaehle } from "../../../lib/admin/daten.js";
import { nps } from "../../../lib/admin/auswertung.js";
import { leseProtokoll } from "../../../lib/admin/protokoll.js";
import { plaetze } from "../../../lib/alpha-optionen.js";

export async function onRequestGet({ data }) {
  const env = data.env;
  const [alpha, umfragen, fehler, lizenzen, mails, downloads, protokoll] = await Promise.all([
    sicher(async () => {
      if (!env.ALPHA) return hinweis("KV-Namespace ALPHA ist nicht verbunden.");
      const liste = await anmeldungen(env);
      const max = await plaetze(env);
      const belegt = liste.filter((e) => belegtStatus(e.status)).length;
      const woche = Date.now() - 7 * 864e5;
      return {
        ok: true,
        gesamt: liste.length,
        plaetze: max,
        belegt,
        frei: Math.max(0, max - belegt),
        nachStatus: zaehle(liste.map((e) => e.status)),
        letzte7: liste.filter((e) => new Date(e.zeit).getTime() > woche).length,
        proTag: proTag(liste.map((e) => e.zeit), 30),
        quellen: zaehle(liste.map((e) => e.herkunft || e.utm?.utm_source || "unbekannt")).slice(0, 8),
        neueste: liste.slice(0, 6).map((e) => ({ name: e.name, mail: e.mail, os: e.os, status: e.status, zeit: e.zeit })),
      };
    }),
    sicher(async () => {
      if (!env.ALPHA) return hinweis("KV-Namespace ALPHA ist nicht verbunden.");
      const liste = await antworten(env);
      const npsWerte = liste.map((a) => a.antworten?.nps).filter((x) => Number.isInteger(x));
      return { ok: true, gesamt: liste.length, jeUmfrage: zaehle(liste.map((a) => a.umfrage)), nps: nps(npsWerte) };
    }),
    sicher(async () => {
      if (!env.ALPHA) return hinweis("KV-Namespace ALPHA ist nicht verbunden.");
      const liste = await fehlerberichte(env);
      return { ok: true, gesamt: liste.length, offen: liste.filter((b) => ["neu", "in-arbeit"].includes(b.status || "neu")).length, neueste: liste.slice(0, 5).map((b) => ({ beschreibung: b.beschreibung?.slice(0, 120), version: b.version, zeit: b.zeit, status: b.status })) };
    }),
    sicher(async () => {
      if (!env.LEMONSQUEEZY_API_KEY) return hinweis("Lemon-Squeezy-Schlüssel fehlt (Einstellungen).");
      const [lz, be] = await Promise.all([lemon(env, "license-keys?page[size]=100"), lemon(env, "orders?page[size]=100&sort=-createdAt")]);
      if (!lz.ok) return hinweis(`Lemon Squeezy: ${lz.status}`);
      const lizenzen = lz.daten?.data || [];
      const bestellungen = be.daten?.data || [];
      const monat = Date.now() - 30 * 864e5;
      const neu = bestellungen.filter((o) => new Date(o.attributes.created_at).getTime() > monat);
      return {
        ok: true,
        lizenzen: lizenzen.length,
        aktiv: lizenzen.filter((l) => l.attributes.status === "active").length,
        geraete: lizenzen.reduce((s, l) => s + (l.attributes.activation_usage || 0), 0),
        bestellungen30: neu.length,
        umsatz30: neu.reduce((s, o) => s + (o.attributes.total || 0), 0) / 100,
        waehrung: bestellungen[0]?.attributes.currency || "EUR",
      };
    }),
    sicher(async () => {
      if (!env.RESEND_API_KEY) return hinweis("Resend-Schlüssel fehlt (Einstellungen).");
      const r = await resend(env, "emails?limit=100");
      if (!r.ok) return hinweis(r.status === 401 || r.status === 403 ? "Resend-Schlüssel darf nur senden — für Statistik „Full access“ verwenden." : `Resend: ${r.status}`);
      const alle = r.daten?.data || [];
      const status = zaehle(alle.map((m) => m.last_event || "unbekannt"));
      const z = (n) => status.find((s) => s.name === n)?.anzahl || 0;
      return { ok: true, gesendet: alle.length, zugestellt: z("delivered"), probleme: z("bounced") + z("complained") + z("failed") };
    }),
    sicher(async () => {
      const r = await github(env, "repos/Stacktor/cockpit-releases/releases?per_page=20");
      if (!r.ok) return hinweis(`GitHub: ${r.status}`);
      const releases = r.daten || [];
      const summe = releases.reduce((s, rel) => s + (rel.assets || []).reduce((a, x) => a + (x.download_count || 0), 0), 0);
      return { ok: true, gesamt: summe, neueste: releases[0] ? { tag: releases[0].tag_name, datum: releases[0].published_at } : null };
    }),
    sicher(() => leseProtokoll(env, 8)),
  ]);

  return json(200, { stand: new Date().toISOString(), benutzer: data.benutzer, alpha, umfragen, fehler, lizenzen, mails, downloads, protokoll });
}
