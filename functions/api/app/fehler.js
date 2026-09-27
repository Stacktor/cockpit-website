/**
 * POST /api/app/fehler — „Fehler melden“ aus der App.
 *
 * Körper: { schluessel, instanz, beschreibung, protokoll?, version?, system? }
 * Das Protokoll hat die App vor dem Senden angezeigt (Version, System, letzte
 * Fehlermeldungen — keine Bewerbungsdaten). Gespeichert unter
 * `bug:<zeit>:<lizenzId>`, optional Benachrichtigung per Resend.
 */
import { imKontingent, json, pruefeAlphaLizenz } from "../../../lib/app-lizenz.js";

export async function onRequestPost({ request, env }) {
  const d = await request.json().catch(() => null);
  if (!d) return json(400, { ok: false, fehler: "Anfrage konnte nicht gelesen werden." });

  const beschreibung = String(d.beschreibung || "").trim().slice(0, 4000);
  if (beschreibung.length < 5)
    return json(422, { ok: false, fehler: "Beschreib bitte kurz, was passiert ist." });

  const pruefung = await pruefeAlphaLizenz(env, d.schluessel, d.instanz);
  if (!pruefung.ok) return json(pruefung.status, { ok: false, fehler: pruefung.fehler });
  if (!(await imKontingent(env, pruefung.lizenz.id, "fehler", 10)))
    return json(429, { ok: false, fehler: "Zu viele Meldungen in kurzer Zeit — danke für deine Geduld." });
  if (!env.ALPHA) return json(503, { ok: false, fehler: "Fehlerberichte sind gerade nicht erreichbar." });

  const zeit = new Date().toISOString();
  const bericht = {
    lizenzId: pruefung.lizenz.id,
    email: pruefung.lizenz.email,
    name: pruefung.lizenz.name,
    beschreibung,
    protokoll: d.protokoll ? String(d.protokoll).slice(0, 12000) : null,
    version: String(d.version || "").slice(0, 20),
    system: String(d.system || "").slice(0, 40),
    status: "neu",
    zeit,
  };
  await env.ALPHA.put(`bug:${zeit}:${pruefung.lizenz.id}`, JSON.stringify(bericht));

  if (env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>",
        to: [env.MAIL_AN || "Kontakt@mesco.cc"],
        ...(bericht.email ? { reply_to: bericht.email } : {}),
        subject: `Fehlerbericht ${bericht.version || ""} (${bericht.system || "?"})`,
        text: `${bericht.email || "unbekannt"}\n\n${beschreibung}\n\n---\n${bericht.protokoll || "(kein Protokoll)"}`,
      }),
    }).catch(() => {});
  }
  return json(200, { ok: true });
}
