/** GET /api/sync/speicher — belegter Speicher der Lizenz. */
import { json } from "../../../lib/app-lizenz.js";
import { anmelden, belegt, GESAMT_MAX } from "../../../lib/sync.js";

export async function onRequestGet({ request, env }) {
  const a = await anmelden(request, env);
  if (!a.ok) return a.antwort;
  const s = await belegt(env.SYNC, a.ns);
  return json(200, { ok: true, belegt: s.belegt, grenze: GESAMT_MAX, dateien: s.dateien });
}
