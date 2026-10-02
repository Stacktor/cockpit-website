/** DELETE /api/sync/alles — löscht alle Sync-Daten der Lizenz. */
import { json } from "../../../lib/app-lizenz.js";
import { allesLoeschen, anmelden } from "../../../lib/sync.js";

export async function onRequestDelete({ request, env }) {
  const a = await anmelden(request, env);
  if (!a.ok) return a.antwort;
  const geloescht = await allesLoeschen(env.SYNC, a.ns);
  return json(200, { ok: true, geloescht });
}
