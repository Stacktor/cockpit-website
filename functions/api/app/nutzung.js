/**
 * POST /api/app/nutzung — anonyme Nutzungsstatistik der App (abschaltbar).
 *
 * Körper: { version, system, tage: { "JJJJ-MM-TT": { funktion: anzahl } } }
 * Keine Lizenz, keine Geräte-ID, keine Inhalte. Gegen Missbrauch höchstens
 * 20 Meldungen je Stunde und Absender; die IP wird dafür nur mit dem
 * Tagesdatum gehasht und nie gespeichert. Gespeichert werden Tagessummen
 * unter `nutzung:<tag>` (400 Tage), siehe lib/nutzung.js.
 */
import { imKontingent, json, sha256 } from "../../../lib/app-lizenz.js";
import { addiere, pruefeMeldung, TTL } from "../../../lib/nutzung.js";

export async function onRequestPost({ request, env }) {
  if (!env.ALPHA) return json(503, { ok: false, fehler: "Gerade nicht erreichbar." });
  const d = await request.json().catch(() => null);
  const m = pruefeMeldung(d);
  if (m.fehler) return json(422, { ok: false, fehler: m.fehler });
  const ip = request.headers.get("cf-connecting-ip") || "unbekannt";
  const kennung = "anon-" + (await sha256(`${ip}|${m.heute}`)).slice(0, 16);
  if (!(await imKontingent(env, kennung, "nutzung", 20)))
    return json(429, { ok: false, fehler: "Zu viele Meldungen." });
  for (const [tag, werte] of m.tage) {
    const key = `nutzung:${tag}`;
    const stand = JSON.parse((await env.ALPHA.get(key)) || "null");
    await env.ALPHA.put(key, JSON.stringify(addiere(stand, werte, m.version, m.system)), { expirationTtl: TTL });
  }
  return json(200, { ok: true, tage: m.tage.length });
}
