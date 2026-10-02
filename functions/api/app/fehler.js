/**
 * POST /api/app/fehler — „Fehler melden“ aus der App, für alle Nutzer.
 *
 * Körper: { schluessel?, instanz?, beschreibung, protokoll?, kontakt?, version?, system? }
 * - Mit gültiger Lizenz (Alpha oder Pro) wird der Bericht ihr zugeordnet; die
 *   E-Mail für Rückfragen kommt dann von Lemon Squeezy.
 * - Ohne (gültige) Lizenz kommt er anonym an; `kontakt` ist eine freiwillige
 *   E-Mail für Rückfragen. Gegen Missbrauch: 5 Berichte je Stunde und
 *   Absender. Die IP wird dafür nur gehasht (mit Tagesdatum) und nie gespeichert.
 * Das Protokoll hat die App vor dem Senden angezeigt (Version, System, letzte
 * Fehlermeldungen — keine Bewerbungsdaten). Gespeichert unter `bug:<zeit>:<id>`,
 * optional Benachrichtigung per Resend.
 */
import { imKontingent, json, pruefeLizenz, sha256 } from "../../../lib/app-lizenz.js";
import { mitSchluesseln } from "../../../lib/admin/tresor.js";
import { escapeHtml, mailHtml, textZuHtml } from "../../../lib/mail/vorlage.js";

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env: roh }) {
  const env = await mitSchluesseln(roh);
  const d = await request.json().catch(() => null);
  if (!d) return json(400, { ok: false, fehler: "Anfrage konnte nicht gelesen werden." });

  const beschreibung = String(d.beschreibung || "").trim().slice(0, 4000);
  if (beschreibung.length < 5)
    return json(422, { ok: false, fehler: "Beschreib bitte kurz, was passiert ist." });

  let lizenz = null;
  if (d.schluessel && d.instanz) {
    const pruefung = await pruefeLizenz(env, d.schluessel, d.instanz, { nurAlpha: false });
    // Eine ungültige Lizenz ist kein Grund, den Bericht zu verlieren → dann anonym.
    if (pruefung.ok) lizenz = pruefung.lizenz;
  }
  const kontaktRoh = String(d.kontakt || "").trim();
  const kontakt = kontaktRoh.length <= 200 && MAIL.test(kontaktRoh) ? kontaktRoh : null;

  const ip = request.headers.get("cf-connecting-ip") || "unbekannt";
  const kennung = lizenz
    ? lizenz.id
    : "anon-" + (await sha256(`${ip}|${new Date().toISOString().slice(0, 10)}`)).slice(0, 16);
  if (!(await imKontingent(env, kennung, "fehler", lizenz ? 10 : 5)))
    return json(429, { ok: false, fehler: "Zu viele Meldungen in kurzer Zeit — danke für deine Geduld." });
  if (!env.ALPHA) return json(503, { ok: false, fehler: "Fehlerberichte sind gerade nicht erreichbar." });

  const zeit = new Date().toISOString();
  const bericht = {
    lizenzId: lizenz?.id ?? null,
    quelle: lizenz ? (lizenz.alpha ? "alpha" : "lizenz") : "anonym",
    email: lizenz?.email ?? kontakt,
    name: lizenz?.name ?? null,
    beschreibung,
    protokoll: d.protokoll ? String(d.protokoll).slice(0, 12000) : null,
    version: String(d.version || "").slice(0, 20),
    system: String(d.system || "").slice(0, 40),
    status: "neu",
    zeit,
  };
  const id = lizenz ? lizenz.id : `anonym-${crypto.randomUUID().slice(0, 8)}`;
  await env.ALPHA.put(`bug:${zeit}:${id}`, JSON.stringify(bericht));

  if (env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>",
        to: [env.MAIL_AN || "Kontakt@mesco.cc"],
        ...(bericht.email ? { reply_to: bericht.email } : {}),
        subject: `Fehlerbericht ${bericht.version || ""} (${bericht.system || "?"}) · ${bericht.quelle}`,
        text: `${bericht.email || "ohne E-Mail"} · ${bericht.quelle}\n\n${beschreibung}\n\n---\n${bericht.protokoll || "(kein Protokoll)"}`,
        html: mailHtml(
          `<p style="margin:0 0 6px;font-size:13px;color:#5b6675;">${escapeHtml(bericht.email || "ohne E-Mail")} · ${escapeHtml(bericht.quelle)} · ${escapeHtml(bericht.version || "?")} · ${escapeHtml(bericht.system || "?")}</p>
          ${textZuHtml(beschreibung)}
          <pre style="margin:16px 0 0;padding:12px 14px;background:#f6f8fb;border:1px solid #e4e8ee;border-radius:8px;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;">${escapeHtml(bericht.protokoll || "(kein Protokoll)")}</pre>`,
          { vorschau: beschreibung.slice(0, 120) },
        ),
      }),
    }).catch(() => {});
  }
  return json(200, { ok: true });
}
