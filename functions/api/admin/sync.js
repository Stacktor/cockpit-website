/**
 * /api/admin/sync — Sync-Speicher je Lizenz (nur Admin).
 *   GET  ?lizenz=<id>   belegter Speicher; ohne id: alle Lizenzen mit Daten
 *   POST { lizenz, aktion: "leeren" }   löscht alle Sync-Daten dieser Lizenz
 * Inhalte sind Ende-zu-Ende verschlüsselt; hier gibt es nur Größen.
 */
import { json } from "../../../lib/admin/zugang.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";
import { alleObjekte, allesLoeschen, belegt, GESAMT_MAX, praefixFuer } from "../../../lib/sync.js";

const ID = /^[0-9A-Za-z_-]{1,40}$/;

export async function onRequestGet({ request, data }) {
  const env = data.env;
  if (!env.SYNC) return json(200, { eingerichtet: false, lizenzen: [] });
  const id = new URL(request.url).searchParams.get("lizenz");
  if (id) {
    if (!ID.test(id)) return json(400, { fehler: "Ungültige Lizenz-ID." });
    return json(200, { eingerichtet: true, grenze: GESAMT_MAX, ...(await belegt(env.SYNC, praefixFuer(id))) });
  }
  const je = new Map();
  for (const o of await alleObjekte(env.SYNC, "l/")) {
    const lizenz = o.key.split("/")[1];
    const s = je.get(lizenz) || { lizenz, belegt: 0, dateien: 0, zuletzt: null };
    s.belegt += o.size || 0;
    s.dateien += 1;
    const t = o.uploaded ? new Date(o.uploaded).toISOString() : null;
    if (t && (!s.zuletzt || t > s.zuletzt)) s.zuletzt = t;
    je.set(lizenz, s);
  }
  return json(200, { eingerichtet: true, grenze: GESAMT_MAX, lizenzen: [...je.values()].sort((a, b) => b.belegt - a.belegt) });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  const d = await request.json().catch(() => ({}));
  if (!env.SYNC) return json(503, { fehler: "Kein R2-Bucket `SYNC` gebunden." });
  if (!ID.test(String(d.lizenz || ""))) return json(400, { fehler: "Ungültige Lizenz-ID." });
  if (d.aktion !== "leeren") return json(400, { fehler: "Unbekannte Aktion." });
  const geloescht = await allesLoeschen(env.SYNC, praefixFuer(d.lizenz));
  await protokolliere(env, data.benutzer, "sync-leeren", `Lizenz ${d.lizenz}: ${geloescht} Dateien gelöscht`);
  return json(200, { ok: true, geloescht });
}
