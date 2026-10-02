/**
 * Kennzahlen für das Dashboard und die Alarme. Jede Quelle ist einzeln
 * abgesichert: Fehlt ein Schlüssel oder ein Binding, steht dort ein Hinweis
 * statt einer Zahl. `nur` begrenzt die Abfrage auf bestimmte Quellen (die
 * Alarm-Prüfung im Hintergrund holt nur, was ihre Regeln brauchen).
 */
import { anmeldungen, antworten, belegtStatus, fehlerberichte, github, hinweis, lemon, proTag, resend, sicher, zaehle } from "./daten.js";
import { nps } from "./auswertung.js";
import { plaetze } from "../alpha-optionen.js";
import { alleObjekte, GESAMT_MAX } from "../sync.js";

export const QUELLEN = ["alpha", "umfragen", "fehler", "lizenzen", "mails", "downloads", "sync"];

const KV_FEHLT = "KV-Namespace ALPHA ist nicht verbunden.";

const LADER = {
  alpha: async (env) => {
    if (!env.ALPHA) return hinweis(KV_FEHLT);
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
  },
  umfragen: async (env) => {
    if (!env.ALPHA) return hinweis(KV_FEHLT);
    const liste = await antworten(env);
    const npsWerte = liste.map((a) => a.antworten?.nps).filter((x) => Number.isInteger(x));
    return { ok: true, gesamt: liste.length, jeUmfrage: zaehle(liste.map((a) => a.umfrage)), nps: nps(npsWerte) };
  },
  fehler: async (env) => {
    if (!env.ALPHA) return hinweis(KV_FEHLT);
    const liste = await fehlerberichte(env);
    const tag = Date.now() - 864e5;
    return {
      ok: true,
      gesamt: liste.length,
      offen: liste.filter((b) => ["neu", "in-arbeit"].includes(b.status || "neu")).length,
      letzte24: liste.filter((b) => new Date(b.zeit).getTime() > tag).length,
      neueste: liste.slice(0, 5).map((b) => ({ beschreibung: b.beschreibung?.slice(0, 120), version: b.version, zeit: b.zeit, status: b.status })),
    };
  },
  lizenzen: async (env) => {
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
  },
  mails: async (env) => {
    if (!env.RESEND_API_KEY) return hinweis("Resend-Schlüssel fehlt (Einstellungen).");
    const r = await resend(env, "emails?limit=100");
    if (!r.ok) return hinweis(r.status === 401 || r.status === 403 ? "Resend-Schlüssel darf nur senden. Für die Statistik „Full access“ verwenden." : `Resend: ${r.status}`);
    const alle = r.daten?.data || [];
    const status = zaehle(alle.map((m) => m.last_event || "unbekannt"));
    const z = (n) => status.find((s) => s.name === n)?.anzahl || 0;
    return { ok: true, gesendet: alle.length, zugestellt: z("delivered"), probleme: z("bounced") + z("complained") + z("failed") };
  },
  downloads: async (env) => {
    const r = await github(env, "repos/Stacktor/cockpit-releases/releases?per_page=20");
    if (!r.ok) return hinweis(`GitHub: ${r.status}`);
    const releases = r.daten || [];
    const summe = releases.reduce((s, rel) => s + (rel.assets || []).reduce((a, x) => a + (x.download_count || 0), 0), 0);
    return { ok: true, gesamt: summe, neueste: releases[0] ? { tag: releases[0].tag_name, datum: releases[0].published_at } : null };
  },
  sync: async (env) => {
    if (!env.SYNC) return { ...hinweis("R2-Bucket „SYNC“ ist nicht gebunden."), einrichten: true };
    const je = new Map();
    for (const o of await alleObjekte(env.SYNC, "l/")) {
      const id = o.key.split("/")[1];
      je.set(id, (je.get(id) || 0) + (o.size || 0));
    }
    const werte = [...je.values()];
    const belegt = werte.reduce((s, x) => s + x, 0);
    const groesste = werte.length ? Math.max(...werte) : 0;
    return { ok: true, belegt, lizenzen: je.size, grenze: GESAMT_MAX, groesste, maxAnteil: groesste / GESAMT_MAX };
  },
};

/** Sammelt die Kennzahlen; `nur` (Set/Array von Quellen) begrenzt die Abfrage. */
export async function sammleUebersicht(env, nur = null) {
  const auswahl = nur ? QUELLEN.filter((q) => (nur instanceof Set ? nur.has(q) : nur.includes(q))) : QUELLEN;
  const werte = await Promise.all(auswahl.map((q) => sicher(() => LADER[q](env))));
  return Object.fromEntries(auswahl.map((q, i) => [q, werte[i]]));
}
