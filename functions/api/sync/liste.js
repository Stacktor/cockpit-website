/** GET /api/sync/liste?praefix=geraete/ — Dateinamen (relativ) mit Größe. */
import { json } from "../../../lib/app-lizenz.js";
import { alleObjekte, anmelden } from "../../../lib/sync.js";

export async function onRequestGet({ request, env }) {
  const a = await anmelden(request, env);
  if (!a.ok) return a.antwort;
  const praefix = new URL(request.url).searchParams.get("praefix") || "";
  if (praefix && !/^[A-Za-z0-9._/-]{0,200}$/.test(praefix))
    return json(400, { ok: false, fehler: "Ungültiges Präfix." });
  const objekte = await alleObjekte(env.SYNC, a.ns + praefix);
  return json(200, {
    ok: true,
    dateien: objekte.map((o) => ({ name: o.key.slice(a.ns.length), groesse: o.size })),
  });
}
