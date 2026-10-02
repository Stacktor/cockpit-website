/**
 * GET/POST /api/admin/layout — Aufbau des Dashboards je Person (Kacheln,
 * Größen, Reihenfolge, Zeitraum, automatisches Aktualisieren). Nur Struktur,
 * keine Inhalte; der Browser prüft die Kachel-IDs zusätzlich gegen seinen Katalog.
 */
import { json } from "../../../lib/admin/zugang.js";

const GROESSEN = new Set(["s", "m", "l", "xl", "voll"]);
const ID = /^[a-z0-9-]{1,40}$/;
const MAX_KACHELN = 60;

const schluessel = (benutzer) => `admin:layout:${String(benutzer || "admin").toLowerCase().slice(0, 120)}`;

/** Prüft und normalisiert ein Layout; wirft bei Unsinn. */
export function pruefeLayout(body) {
  if (!body || !Array.isArray(body.layout)) throw new Error("Layout fehlt.");
  if (body.layout.length > MAX_KACHELN) throw new Error(`Höchstens ${MAX_KACHELN} Kacheln.`);
  const gesehen = new Set();
  const layout = [];
  for (const p of body.layout) {
    if (!p || typeof p.id !== "string" || !ID.test(p.id) || gesehen.has(p.id)) continue;
    gesehen.add(p.id);
    layout.push({ id: p.id, groesse: GROESSEN.has(p.groesse) ? p.groesse : "m" });
  }
  const tage = [7, 14, 30].includes(Number(body.tage)) ? Number(body.tage) : 7;
  const auto = [0, 1, 5, 15].includes(Number(body.auto)) ? Number(body.auto) : 0;
  return { layout, tage, auto };
}

export async function onRequestGet({ data }) {
  const env = data.env;
  if (!env.ALPHA) return json(200, { layout: null });
  const roh = await env.ALPHA.get(schluessel(data.benutzer));
  if (!roh) return json(200, { layout: null });
  try {
    return json(200, pruefeLayout(JSON.parse(roh)));
  } catch {
    return json(200, { layout: null });
  }
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { fehler: "Ungültiges JSON." });
  }
  let sauber;
  try {
    sauber = pruefeLayout(body);
  } catch (e) {
    return json(400, { fehler: e.message });
  }
  await env.ALPHA.put(schluessel(data.benutzer), JSON.stringify({ ...sauber, geaendert: new Date().toISOString() }));
  return json(200, { ok: true });
}
