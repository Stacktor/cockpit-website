/**
 * /api/admin/alarme — eigene Alarm-Regeln.
 *   GET   Kennzahlen-Katalog, Vorlagen, Regeln mit aktuellem Wert, Verlauf
 *   POST  { aktion: "speichern", regel }       anlegen oder ändern (regel.id)
 *         { aktion: "umschalten", id }         an/aus
 *         { aktion: "loeschen", id }
 *         { aktion: "pruefen" }                jetzt auswerten (Mail bei neuer Auslösung)
 *         { aktion: "test", id }               Test-Mail für eine Regel
 */
import { json } from "../../../lib/admin/zugang.js";
import { leseProtokoll, protokolliere } from "../../../lib/admin/protokoll.js";
import { sammleUebersicht } from "../../../lib/admin/uebersicht.js";
import {
  MAX_REGELN,
  METRIKEN,
  VERGLEICHE,
  VORLAGEN,
  bedingung,
  leseRegeln,
  pruefeRegel,
  pruefeUndMelde,
  quellenFuer,
  speichereRegeln,
  testMail,
} from "../../../lib/admin/alarme.js";

const katalog = () => METRIKEN.map(({ id, titel, quelle, einheit }) => ({ id, titel, quelle, einheit }));

async function ansicht(env) {
  const regeln = await leseRegeln(env);
  const d = regeln.length ? await sammleUebersicht(env, quellenFuer(regeln.map((r) => ({ ...r, aktiv: true })))) : {};
  const ergebnis = await pruefeUndMelde(env, d);
  const verlauf = (await leseProtokoll(env, 300)).filter((p) => /^Alarm/.test(p.aktion)).slice(0, 40);
  return {
    metriken: katalog(),
    vergleiche: Object.keys(VERGLEICHE),
    vorlagen: VORLAGEN.map((v) => ({ ...v, bedingung: bedingung(v) })),
    regeln: ergebnis.auswertung,
    neu: ergebnis.neu,
    verlauf,
    empfaenger: env.MAIL_AN || "Kontakt@mesco.cc",
    mailBereit: Boolean(env.RESEND_API_KEY),
    grenze: MAX_REGELN,
  };
}

export async function onRequestGet({ data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  return json(200, await ansicht(env));
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  const d = await request.json().catch(() => ({}));
  const regeln = await leseRegeln(env);
  const finde = () => regeln.findIndex((r) => r.id === d.id);
  try {
    switch (d.aktion) {
      case "speichern": {
        const vorhanden = regeln.findIndex((r) => r.id === d.regel?.id);
        if (vorhanden < 0 && regeln.length >= MAX_REGELN) return json(422, { fehler: `Höchstens ${MAX_REGELN} Regeln.` });
        const regel = pruefeRegel(d.regel, vorhanden >= 0 ? regeln[vorhanden].id : undefined);
        if (vorhanden >= 0) regeln[vorhanden] = regel;
        else regeln.push(regel);
        await speichereRegeln(env, regeln);
        await protokolliere(env, data.benutzer, vorhanden >= 0 ? "Alarm geändert" : "Alarm angelegt", `${regel.name} (${bedingung(regel)})`);
        return json(200, { ok: true, meldung: "Gespeichert.", id: regel.id });
      }
      case "umschalten": {
        const i = finde();
        if (i < 0) return json(404, { fehler: "Regel nicht gefunden." });
        regeln[i] = { ...regeln[i], aktiv: !regeln[i].aktiv };
        await speichereRegeln(env, regeln);
        await protokolliere(env, data.benutzer, regeln[i].aktiv ? "Alarm eingeschaltet" : "Alarm ausgeschaltet", regeln[i].name);
        return json(200, { ok: true, meldung: regeln[i].aktiv ? "Eingeschaltet." : "Ausgeschaltet." });
      }
      case "loeschen": {
        const i = finde();
        if (i < 0) return json(404, { fehler: "Regel nicht gefunden." });
        const [weg] = regeln.splice(i, 1);
        await speichereRegeln(env, regeln);
        await protokolliere(env, data.benutzer, "Alarm gelöscht", weg.name);
        return json(200, { ok: true, meldung: "Gelöscht." });
      }
      case "pruefen": {
        const a = await ansicht(env);
        const n = a.regeln.filter((r) => r.ausgeloest).length;
        return json(200, { ok: true, meldung: n ? `${n} ${n === 1 ? "Alarm ist" : "Alarme sind"} ausgelöst.` : "Alles im grünen Bereich.", ...a });
      }
      case "test": {
        const i = finde();
        if (i < 0) return json(404, { fehler: "Regel nicht gefunden." });
        const werte = await sammleUebersicht(env, quellenFuer([{ ...regeln[i], aktiv: true }]));
        const r = await testMail(env, regeln[i], werte);
        if (!r.ok) return json(422, { fehler: `Test-Mail nicht gesendet: ${r.text}` });
        return json(200, { ok: true, meldung: `Test-Mail an ${env.MAIL_AN || "Kontakt@mesco.cc"} gesendet.` });
      }
      default:
        return json(400, { fehler: "Unbekannte Aktion." });
    }
  } catch (e) {
    return json(422, { fehler: String(e?.message || e) });
  }
}
