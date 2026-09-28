/**
 * POST /api/app/antwort — Antwort eines Alpha-Testers auf eine Umfrage.
 *
 * Körper: { schluessel, instanz, umfrage, antworten, version?, system? }
 * Gespeichert unter `survey:resp:<umfrage>:<lizenzId>` (eine Antwort je
 * Lizenz; erneutes Senden ersetzt). E-Mail/Name kommen aus Lemon Squeezy, nicht
 * aus der App.
 */
import { imKontingent, json, pruefeAlphaLizenz } from "../../../lib/app-lizenz.js";
import { ladeUmfragen, pruefeAntworten } from "../../../lib/umfragen.js";

export async function onRequestPost({ request, env }) {
  const d = await request.json().catch(() => null);
  if (!d) return json(400, { ok: false, fehler: "Anfrage konnte nicht gelesen werden." });

  const pruefung = await pruefeAlphaLizenz(env, d.schluessel, d.instanz);
  if (!pruefung.ok) return json(pruefung.status, { ok: false, fehler: pruefung.fehler });
  if (!(await imKontingent(env, pruefung.lizenz.id, "antwort", 20)))
    return json(429, { ok: false, fehler: "Zu viele Antworten in kurzer Zeit." });
  if (!env.ALPHA)
    return json(503, { ok: false, fehler: "Umfragen sind gerade nicht erreichbar." });

  const umfrage = (await ladeUmfragen(env, { nurAktive: false })).find((u) => u.id === d.umfrage);
  if (!umfrage) return json(404, { ok: false, fehler: "Diese Umfrage gibt es nicht (mehr)." });

  const { antworten, fehler } = pruefeAntworten(umfrage, d.antworten);
  if (fehler.length)
    return json(422, { ok: false, fehler: "Bitte beantworte alle Pflichtfragen.", felder: fehler });

  const key = `survey:resp:${umfrage.id}:${pruefung.lizenz.id}`;
  const vorher = await env.ALPHA.get(key);
  await env.ALPHA.put(
    key,
    JSON.stringify({
      umfrage: umfrage.id,
      lizenzId: pruefung.lizenz.id,
      email: pruefung.lizenz.email,
      name: pruefung.lizenz.name,
      antworten,
      version: String(d.version || "").slice(0, 20),
      system: String(d.system || "").slice(0, 40),
      zeit: new Date().toISOString(),
    }),
  );
  return json(200, { ok: true, aktualisiert: Boolean(vorher) });
}
