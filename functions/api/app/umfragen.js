/**
 * POST /api/app/umfragen — aktive Umfragen für einen Alpha-Tester.
 *
 * Körper: { schluessel, instanz }
 * Antwort: { ok, umfragen: [{ …definition, beantwortet }] }
 *
 * Die App entscheidet selbst anhand ihrer lokalen Zähler (Tage seit Start,
 * Anzahl Bewerbungen …), wann eine Umfrage erscheint — diese Zahlen werden
 * nicht übertragen.
 */
import { imKontingent, json, pruefeAlphaLizenz } from "../../../lib/app-lizenz.js";
import { ladeUmfragen } from "../../../lib/umfragen.js";

export async function onRequestPost({ request, env }) {
  const d = await request.json().catch(() => null);
  if (!d) return json(400, { ok: false, fehler: "Anfrage konnte nicht gelesen werden." });

  const pruefung = await pruefeAlphaLizenz(env, d.schluessel, d.instanz);
  if (!pruefung.ok) return json(pruefung.status, { ok: false, fehler: pruefung.fehler });
  if (!(await imKontingent(env, pruefung.lizenz.id, "umfragen", 60)))
    return json(429, { ok: false, fehler: "Zu viele Anfragen — bitte später erneut." });

  const umfragen = await ladeUmfragen(env);
  const mitStatus = await Promise.all(
    umfragen.map(async (u) => ({
      ...u,
      beantwortet: env.ALPHA
        ? Boolean(await env.ALPHA.get(`survey:resp:${u.id}:${pruefung.lizenz.id}`))
        : false,
    })),
  );
  return json(200, { ok: true, umfragen: mitStatus });
}
