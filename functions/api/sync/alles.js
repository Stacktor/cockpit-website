/**
 * DELETE /api/sync/alles — löscht die Sync-Daten der Lizenz.
 *   ?bereich=sync          (Standard) nur Sync-Pakete und Dateien, Cloud-Sicherungen bleiben
 *   ?bereich=sicherungen   nur die Cloud-Sicherungen
 *   ?bereich=alles         beides
 */
import { json } from "../../../lib/app-lizenz.js";
import { allesLoeschen, anmelden } from "../../../lib/sync.js";

export async function onRequestDelete({ request, env }) {
  const a = await anmelden(request, env);
  if (!a.ok) return a.antwort;
  const bereich = new URL(request.url).searchParams.get("bereich") || "sync";
  if (!["sync", "sicherungen", "alles"].includes(bereich)) return json(400, { ok: false, fehler: "Unbekannter Bereich." });
  const geloescht = await allesLoeschen(env.SYNC, a.ns, bereich === "alles" ? null : bereich);
  return json(200, { ok: true, geloescht });
}
