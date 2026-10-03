/**
 * GET /api/sync/speicher — belegter Speicher der Lizenz.
 * `belegt`/`grenze`/`dateien` gelten für den Sync (wie bisher), `sicherungen` für die Cloud-Sicherungen.
 */
import { json } from "../../../lib/app-lizenz.js";
import { anmelden, belegtGeteilt, GESAMT_MAX, SICHERUNG_MAX } from "../../../lib/sync.js";

export async function onRequestGet({ request, env }) {
  const a = await anmelden(request, env);
  if (!a.ok) return a.antwort;
  const s = await belegtGeteilt(env.SYNC, a.ns);
  return json(200, {
    ok: true,
    belegt: s.sync.belegt,
    grenze: GESAMT_MAX,
    dateien: s.sync.dateien,
    sicherungen: { belegt: s.sicherungen.belegt, grenze: SICHERUNG_MAX, dateien: s.sicherungen.dateien },
  });
}
