/**
 * POST /api/app/lizenz-ping — die App meldet nach ihrer Lizenzprüfung kurz,
 * mit welcher Version und auf welchem System sie läuft. Der Admin sieht so
 * „zuletzt geprüft“ je Lizenz.
 *
 * Körper: { schluessel, instanz, version, system, status }
 * Gespeichert unter `lping:<Lizenz-ID>` (nur das Neueste, 400 Tage); keine
 * Inhalte aus der App, kein Schlüssel.
 */
import { imKontingent, json, pruefeLizenz } from "../../../lib/app-lizenz.js";
import { alarmeImHintergrund } from "../../../lib/admin/alarme.js";

const TTL = 400 * 86400;
const kurz = (v, n) => String(v ?? "").trim().slice(0, n);

export async function onRequestPost({ request, env, waitUntil }) {
  const d = await request.json().catch(() => null);
  if (!d) return json(400, { ok: false, fehler: "Anfrage konnte nicht gelesen werden." });
  if (!env.ALPHA) return json(503, { ok: false, fehler: "Gerade nicht erreichbar." });
  const p = await pruefeLizenz(env, d.schluessel, d.instanz, { nurAlpha: false });
  if (!p.ok) return json(p.status, { ok: false, fehler: p.fehler });
  if (!(await imKontingent(env, p.lizenz.id, "ping", 30)))
    return json(429, { ok: false, fehler: "Zu viele Meldungen." });
  const eintrag = {
    zeit: new Date().toISOString(),
    version: kurz(d.version, 20),
    system: kurz(d.system, 40),
    status: kurz(d.status, 30),
    instanz: kurz(d.instanz, 60),
  };
  await env.ALPHA.put(`lping:${p.lizenz.id}`, JSON.stringify(eintrag), { expirationTtl: TTL });
  waitUntil?.(alarmeImHintergrund(env));
  return json(200, { ok: true });
}
