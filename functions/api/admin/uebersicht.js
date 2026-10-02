/**
 * GET /api/admin/uebersicht — Kennzahlen für die Startseite des Dashboards.
 * Jede Quelle einzeln abgesichert: Fehlt ein Schlüssel, zeigt die Kachel einen
 * Hinweis. Dabei werden auch die eigenen Alarme geprüft (Mail bei Auslösung).
 */
import { json } from "../../../lib/admin/zugang.js";
import { sicher } from "../../../lib/admin/daten.js";
import { leseProtokoll } from "../../../lib/admin/protokoll.js";
import { sammleUebersicht } from "../../../lib/admin/uebersicht.js";
import { pruefeUndMelde } from "../../../lib/admin/alarme.js";

export async function onRequestGet({ data }) {
  const env = data.env;
  const [d, protokoll] = await Promise.all([sammleUebersicht(env), sicher(() => leseProtokoll(env, 8))]);
  const alarme = await sicher(() => pruefeUndMelde(env, d));
  return json(200, { stand: new Date().toISOString(), benutzer: data.benutzer, ...d, protokoll, alarme });
}
