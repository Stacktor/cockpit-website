/**
 * Eigene Alarme: Regeln der Form „Kennzahl Vergleich Schwelle“, z. B.
 * „Offene Fehlerberichte > 5“. Ausgewertet wird
 *  - beim Laden des Dashboards (mit dessen Kennzahlen) und
 *  - im Hintergrund, wenn eine Anmeldung, ein Fehlerbericht oder eine
 *    Lizenzprüfung eingeht (höchstens alle 15 Minuten, nur die Quellen,
 *    die aktive Regeln brauchen).
 * Eine Mail geht einmal je Auslösung an MAIL_AN. Erst wenn die Bedingung
 * wieder erfüllt war, kann dieselbe Regel erneut melden.
 *
 * KV: `alarme:regeln` (Liste), `alarme:zustand` ({ id: { aktiv, seit, wert } }),
 * `alarme:geprueft` (Zeitpunkt der letzten Hintergrundprüfung).
 */
import { resend } from "./daten.js";
import { protokolliere } from "./protokoll.js";
import { mitSchluesseln } from "./tresor.js";
import { sammleUebersicht } from "./uebersicht.js";
import { absatz, alsText, escapeHtml, kasten, knopf, mailHtml, titel } from "../mail/vorlage.js";

const MB = 1024 * 1024;
const ADMIN = "https://cockpit.mesco.cc/admin/#/alarme";
export const MAX_REGELN = 30;
export const PAUSE_MS = 15 * 60_000;

const anzahl = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const ausStatus = (d, name) => (d?.ok ? (d.nachStatus ?? []).find((x) => x.name === name)?.anzahl ?? 0 : null);

/** Kennzahlen, auf die sich Regeln beziehen können. `quelle` = Block aus sammleUebersicht. */
export const METRIKEN = [
  { id: "anmeldungen_neu", titel: "Neue Anmeldungen (ungeprüft)", quelle: "alpha", einheit: "", wert: (d) => ausStatus(d.alpha, "neu") },
  { id: "anmeldungen_7", titel: "Anmeldungen in 7 Tagen", quelle: "alpha", einheit: "", wert: (d) => (d.alpha?.ok ? d.alpha.letzte7 : null) },
  { id: "plaetze_frei", titel: "Freie Alpha-Plätze", quelle: "alpha", einheit: "", wert: (d) => (d.alpha?.ok ? d.alpha.frei : null) },
  { id: "fehler_offen", titel: "Offene Fehlerberichte", quelle: "fehler", einheit: "", wert: (d) => (d.fehler?.ok ? d.fehler.offen : null) },
  { id: "fehler_24h", titel: "Fehlerberichte in 24 Stunden", quelle: "fehler", einheit: "", wert: (d) => (d.fehler?.ok ? d.fehler.letzte24 : null) },
  { id: "nps", titel: "NPS aus den Umfragen", quelle: "umfragen", einheit: "", wert: (d) => (d.umfragen?.ok ? (d.umfragen.nps?.wert ?? null) : null) },
  { id: "mail_probleme", titel: "Mail-Probleme (letzte 100)", quelle: "mails", einheit: "", wert: (d) => (d.mails?.ok ? d.mails.probleme : null) },
  { id: "lizenzen_aktiv", titel: "Aktive Lizenzen", quelle: "lizenzen", einheit: "", wert: (d) => (d.lizenzen?.ok ? d.lizenzen.aktiv : null) },
  { id: "bestellungen_30", titel: "Bestellungen in 30 Tagen", quelle: "lizenzen", einheit: "", wert: (d) => (d.lizenzen?.ok ? d.lizenzen.bestellungen30 : null) },
  { id: "umsatz_30", titel: "Umsatz in 30 Tagen", quelle: "lizenzen", einheit: "€", wert: (d) => (d.lizenzen?.ok ? d.lizenzen.umsatz30 : null) },
  { id: "downloads", titel: "Downloads gesamt", quelle: "downloads", einheit: "", wert: (d) => (d.downloads?.ok ? d.downloads.gesamt : null) },
  { id: "sync_belegt_mb", titel: "Sync-Speicher gesamt", quelle: "sync", einheit: "MB", wert: (d) => (d.sync?.ok ? Math.round((d.sync.belegt / MB) * 10) / 10 : null) },
  { id: "sync_max_prozent", titel: "Sync-Speicher der vollsten Lizenz", quelle: "sync", einheit: "%", wert: (d) => (d.sync?.ok ? Math.round(d.sync.maxAnteil * 100) : null) },
  { id: "sync_bereit", titel: "Sync-Server eingerichtet (1 = ja, 0 = nein)", quelle: "sync", einheit: "", wert: (d) => (d.sync?.ok ? 1 : d.sync?.einrichten ? 0 : null) },
];
const METRIK = new Map(METRIKEN.map((m) => [m.id, m]));

export const VERGLEICHE = {
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  "=": (a, b) => a === b,
};
const ZEICHEN = { ">": ">", ">=": "≥", "<": "<", "<=": "≤", "=": "=" };

/** Vorschläge zum schnellen Anlegen. */
export const VORLAGEN = [
  { name: "Viele offene Fehlerberichte", metrik: "fehler_offen", vergleich: ">=", schwelle: 5, stufe: "wichtig", mail: true },
  { name: "Fehlerwelle nach einem Update", metrik: "fehler_24h", vergleich: ">=", schwelle: 3, stufe: "wichtig", mail: true },
  { name: "Mails kommen nicht an", metrik: "mail_probleme", vergleich: ">", schwelle: 0, stufe: "wichtig", mail: true },
  { name: "Sync-Speicher einer Lizenz fast voll", metrik: "sync_max_prozent", vergleich: ">=", schwelle: 80, stufe: "info", mail: true },
  { name: "Sync-Server nicht eingerichtet", metrik: "sync_bereit", vergleich: "=", schwelle: 0, stufe: "info", mail: false },
  { name: "Alpha-Plätze fast weg", metrik: "plaetze_frei", vergleich: "<=", schwelle: 5, stufe: "info", mail: true },
];

export const bedingung = (r) => `${METRIK.get(r.metrik)?.titel ?? r.metrik} ${ZEICHEN[r.vergleich] ?? r.vergleich} ${r.schwelle}${METRIK.get(r.metrik)?.einheit ? ` ${METRIK.get(r.metrik).einheit}` : ""}`;

/** Prüft und säubert eine Regel aus dem Admin. Wirft bei Unsinn. */
export function pruefeRegel(e, id) {
  if (!e || typeof e !== "object") throw new Error("Regel fehlt.");
  const name = String(e.name ?? "").trim().slice(0, 80);
  if (!name) throw new Error("Bitte einen Namen angeben.");
  if (!METRIK.has(e.metrik)) throw new Error("Unbekannte Kennzahl.");
  if (!(e.vergleich in VERGLEICHE)) throw new Error("Unbekannter Vergleich.");
  const schwelle = Number(String(e.schwelle ?? "").replace(",", "."));
  if (!Number.isFinite(schwelle) || Math.abs(schwelle) > 1e9) throw new Error("Die Schwelle muss eine Zahl sein.");
  return {
    id: /^[a-z0-9]{4,16}$/.test(String(id ?? e.id ?? "")) ? String(id ?? e.id) : crypto.getRandomValues(new Uint32Array(2)).reduce((s, x) => s + x.toString(36), "").slice(0, 12).padEnd(4, "0"),
    name,
    metrik: e.metrik,
    vergleich: e.vergleich,
    schwelle,
    stufe: e.stufe === "info" ? "info" : "wichtig",
    mail: Boolean(e.mail),
    aktiv: e.aktiv !== false,
  };
}

async function lies(env, key, leer) {
  try {
    return JSON.parse((await env.ALPHA.get(key)) || "null") ?? leer;
  } catch {
    return leer;
  }
}

export const leseRegeln = (env) => (env.ALPHA ? lies(env, "alarme:regeln", []) : Promise.resolve([]));
export const leseZustand = (env) => (env.ALPHA ? lies(env, "alarme:zustand", {}) : Promise.resolve({}));
export const speichereRegeln = (env, regeln) => env.ALPHA.put("alarme:regeln", JSON.stringify(regeln.slice(0, MAX_REGELN)));

/** Quellen, die die aktiven Regeln brauchen. */
export const quellenFuer = (regeln) => new Set(regeln.filter((r) => r.aktiv).map((r) => METRIK.get(r.metrik)?.quelle).filter(Boolean));

/** Wertet Regeln gegen Kennzahlen aus (rein, ohne Seiteneffekte). */
export function werteAus(regeln, d) {
  return regeln.map((r) => {
    const m = METRIK.get(r.metrik);
    const wert = m ? anzahl(m.wert(d)) : null;
    const ausgeloest = Boolean(r.aktiv && wert !== null && VERGLEICHE[r.vergleich]?.(wert, r.schwelle));
    return { ...r, bedingung: bedingung(r), wert, einheit: m?.einheit ?? "", unbekannt: wert === null, ausgeloest };
  });
}

async function sendeAlarmMail(env, a, test = false) {
  if (!env.RESEND_API_KEY) return { ok: false, text: "Resend-Schlüssel fehlt." };
  const html = mailHtml(
    [
      titel(test ? `Test: ${a.name}` : `Alarm: ${a.name}`),
      absatz(
        test
          ? "So sieht die Mail aus, wenn diese Regel auslöst."
          : `Die Regel <b>${escapeHtml(a.name)}</b> hat ausgelöst.`,
      ),
      kasten("Bedingung", `${escapeHtml(a.bedingung)}<br>Aktueller Wert: <b>${a.wert === null ? "unbekannt" : escapeHtml(`${a.wert}${a.einheit ? ` ${a.einheit}` : ""}`)}</b>`),
      knopf(ADMIN, "Im Admin ansehen"),
    ].join(""),
    { vorschau: `${a.bedingung}: aktuell ${a.wert ?? "unbekannt"}`, grund: "Diese Mail kommt, weil du im Admin einen Alarm mit Mail-Benachrichtigung angelegt hast." },
  );
  const r = await resend(env, "emails", {
    method: "POST",
    body: JSON.stringify({
      from: env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>",
      to: [env.MAIL_AN || "Kontakt@mesco.cc"],
      subject: `${test ? "Test-Alarm" : "Alarm"}: ${a.name}`,
      html,
      text: alsText(html),
    }),
  });
  return r.ok ? { ok: true } : { ok: false, text: `Resend: ${r.status}` };
}

export const testMail = (env, regel, d) => sendeAlarmMail(env, werteAus([regel], d)[0], true);

/**
 * Wertet aus, merkt sich den Zustand und meldet neue Auslösungen
 * (Audit-Log, Mail falls gewünscht). Gibt die Auswertung zurück.
 */
export async function pruefeUndMelde(env, d) {
  if (!env.ALPHA) return { ok: true, auswertung: [], neu: [] };
  const regeln = await leseRegeln(env);
  const auswertung = werteAus(regeln, d);
  if (!regeln.length) return { ok: true, auswertung, neu: [] };
  const vorher = await leseZustand(env);
  const zustand = {};
  const neu = [];
  let geaendert = false;
  for (const a of auswertung) {
    const alt = vorher[a.id];
    if (!a.aktiv) continue; // ausgeschaltet: Zustand vergessen, beim Einschalten neu bewerten
    if (a.unbekannt) {
      // Ohne Daten bleibt der letzte Zustand, damit ein Ausfall keine Doppelmeldung erzeugt.
      if (alt) zustand[a.id] = alt;
      continue;
    }
    if (a.ausgeloest && !alt?.aktiv) {
      zustand[a.id] = { aktiv: true, seit: new Date().toISOString(), wert: a.wert };
      neu.push(a);
      geaendert = true;
    } else if (!a.ausgeloest && alt?.aktiv) {
      zustand[a.id] = { aktiv: false, seit: new Date().toISOString(), wert: a.wert };
      await protokolliere(env, "Alarm", "Alarm beendet", `${a.name}: ${a.wert}${a.einheit ? ` ${a.einheit}` : ""}`);
      geaendert = true;
    } else {
      zustand[a.id] = alt ? { ...alt, wert: a.wert } : { aktiv: a.ausgeloest, seit: new Date().toISOString(), wert: a.wert };
      if (!alt) geaendert = true;
    }
  }
  for (const a of neu) {
    const post = a.mail ? await sendeAlarmMail(env, a).catch((e) => ({ ok: false, text: String(e?.message || e) })) : null;
    await protokolliere(env, "Alarm", "Alarm ausgelöst", `${a.name}: ${a.wert}${a.einheit ? ` ${a.einheit}` : ""}${post ? (post.ok ? " · Mail gesendet" : ` · Mail fehlgeschlagen (${post.text})`) : ""}`);
  }
  if (geaendert || Object.keys(vorher).length !== Object.keys(zustand).length) await env.ALPHA.put("alarme:zustand", JSON.stringify(zustand));
  return { ok: true, auswertung: auswertung.map((a) => ({ ...a, seit: zustand[a.id]?.seit ?? null })), neu: neu.map((a) => a.id) };
}

/**
 * Hintergrundprüfung aus öffentlichen Endpunkten (per waitUntil). Gedrosselt
 * auf einmal je PAUSE_MS; holt nur die Quellen, die aktive Regeln brauchen.
 */
export async function alarmeImHintergrund(rohEnv) {
  try {
    if (!rohEnv?.ALPHA) return;
    const regeln = await leseRegeln(rohEnv);
    const quellen = quellenFuer(regeln);
    if (!quellen.size) return;
    const zuletzt = Number(await rohEnv.ALPHA.get("alarme:geprueft")) || 0;
    if (Date.now() - zuletzt < PAUSE_MS) return;
    await rohEnv.ALPHA.put("alarme:geprueft", String(Date.now()), { expirationTtl: 86400 });
    const env = await mitSchluesseln(rohEnv);
    await pruefeUndMelde(env, await sammleUebersicht(env, quellen));
  } catch {
    /* Hintergrund: nie die eigentliche Anfrage stören */
  }
}
