/**
 * /api/sync/datei?name=… — eine verschlüsselte Datei.
 *   GET    liefert die Bytes (404, wenn es sie nicht gibt)
 *   PUT    speichert (bis 11 MB, Lizenz gesamt bis 200 MB)
 *   DELETE entfernt (auch, wenn es sie nicht gibt)
 */
import { json } from "../../../lib/app-lizenz.js";
import { anmelden, belegt, DATEI_MAX, GESAMT_MAX, nameAus } from "../../../lib/sync.js";

export async function onRequestGet({ request, env }) {
  const a = await anmelden(request, env);
  if (!a.ok) return a.antwort;
  const name = nameAus(request);
  if (!name) return json(400, { ok: false, fehler: "Ungültiger Dateiname." });
  const obj = await env.SYNC.get(a.ns + name);
  if (!obj) return json(404, { ok: false, fehler: "Datei nicht gefunden." });
  return new Response(obj.body, {
    headers: { "content-type": "application/octet-stream", "cache-control": "no-store" },
  });
}

export async function onRequestPut({ request, env }) {
  const a = await anmelden(request, env);
  if (!a.ok) return a.antwort;
  const name = nameAus(request);
  if (!name) return json(400, { ok: false, fehler: "Ungültiger Dateiname." });
  const laenge = Number(request.headers.get("content-length") || "0");
  if (laenge > DATEI_MAX) return json(413, { ok: false, fehler: "Die Datei ist größer als 11 MB." });
  const daten = await request.arrayBuffer();
  if (daten.byteLength > DATEI_MAX) return json(413, { ok: false, fehler: "Die Datei ist größer als 11 MB." });

  const vorher = await env.SYNC.head(a.ns + name);
  const stand = await belegt(env.SYNC, a.ns);
  if (stand.belegt - (vorher?.size || 0) + daten.byteLength > GESAMT_MAX)
    return json(507, {
      ok: false,
      fehler: "Der Sync-Speicher deiner Lizenz ist voll (200 MB). Große Dokumente lokal lassen oder Daten auf dem Server löschen.",
    });
  await env.SYNC.put(a.ns + name, daten, { httpMetadata: { contentType: "application/octet-stream" } });
  return json(200, { ok: true });
}

export async function onRequestDelete({ request, env }) {
  const a = await anmelden(request, env);
  if (!a.ok) return a.antwort;
  const name = nameAus(request);
  if (!name) return json(400, { ok: false, fehler: "Ungültiger Dateiname." });
  await env.SYNC.delete(a.ns + name);
  return json(200, { ok: true });
}
