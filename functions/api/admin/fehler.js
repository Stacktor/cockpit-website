/**
 * /api/admin/fehler — Fehlerberichte aus der App.
 *   GET
 *   POST { schluessel, status, notiz? }   Status: neu | in-arbeit | erledigt | verworfen
 *        { aktion: "loeschen", schluessel }
 */
import { json } from "../../../lib/admin/zugang.js";
import { fehlerberichte } from "../../../lib/admin/daten.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";

const STATUS = ["neu", "in-arbeit", "erledigt", "verworfen"];

export async function onRequestGet({ data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  const liste = await fehlerberichte(env);
  return json(200, { status: STATUS, berichte: liste.map((b) => ({ ...b, status: b.status || "neu", schluessel: b._key, _key: undefined })) });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  const d = await request.json().catch(() => null);
  const key = String(d?.schluessel || "");
  if (!key.startsWith("bug:")) return json(400, { fehler: "Ungültiger Bericht." });
  const roh = await env.ALPHA.get(key);
  if (!roh) return json(404, { fehler: "Bericht nicht gefunden." });
  if (d.aktion === "loeschen") {
    await env.ALPHA.delete(key);
    await protokolliere(env, data.benutzer, "Fehlerbericht gelöscht", key);
    return json(200, { ok: true, meldung: "Bericht gelöscht." });
  }
  if (!STATUS.includes(d.status)) return json(422, { fehler: "Unbekannter Status." });
  const b = JSON.parse(roh);
  b.status = d.status;
  if (typeof d.notiz === "string") b.notiz = d.notiz.slice(0, 2000);
  b.geaendert = new Date().toISOString();
  await env.ALPHA.put(key, JSON.stringify(b));
  await protokolliere(env, data.benutzer, "Fehlerbericht", `${key} → ${d.status}`);
  return json(200, { ok: true, meldung: "Gespeichert." });
}
