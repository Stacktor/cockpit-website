/**
 * /api/admin/mail — Resend: Zustellung, Listen, Rundmail an Tester.
 *   GET
 *   POST { aktion: "vorschau", gruppe }
 *        { aktion: "senden", gruppe, betreff, text, test? }   test = nur an MAIL_AN
 * Gruppen: eingeladen | angenommen | warteliste | alle
 */
import { json } from "../../../lib/admin/zugang.js";
import { anmeldungen, hinweis, resend, zaehle } from "../../../lib/admin/daten.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";
import { rahmen, textZuHtml } from "../../../lib/admin/mail-vorlage.js";

const GRUPPEN = {
  eingeladen: { titel: "Alpha-Tester (eingeladen)", passt: (e) => e.status === "eingeladen" },
  angenommen: { titel: "Angenommen, noch nicht eingeladen", passt: (e) => e.status === "angenommen" },
  warteliste: { titel: "Warteliste", passt: (e) => e.status === "warteliste" },
  alle: { titel: "Alle Anmeldungen (ohne Abgelehnte)", passt: (e) => e.status !== "abgelehnt" },
};

export async function onRequestGet({ data }) {
  const env = data.env;
  const liste = env.ALPHA ? await anmeldungen(env) : [];
  const gruppen = Object.entries(GRUPPEN).map(([id, g]) => ({ id, titel: g.titel, anzahl: liste.filter(g.passt).length }));
  if (!env.RESEND_API_KEY) return json(200, { gruppen, resend: hinweis("Resend-Schlüssel fehlt — unter Einstellungen eintragen.") });
  const [mails, listen, domains] = await Promise.all([resend(env, "emails?limit=100"), resend(env, "audiences"), resend(env, "domains")]);
  if (!mails.ok)
    return json(200, { gruppen, resend: hinweis(mails.status === 401 || mails.status === 403 ? "Der Resend-Schlüssel darf nur senden. Für die Übersicht „Full access“ eintragen." : `Resend: ${mails.status}`) });
  const alle = mails.daten?.data || [];
  return json(200, {
    gruppen,
    absender: env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>",
    resend: {
      ok: true,
      nachStatus: zaehle(alle.map((m) => m.last_event || "unbekannt")),
      letzte: alle.slice(0, 50).map((m) => ({ an: Array.isArray(m.to) ? m.to.join(", ") : m.to, betreff: m.subject, status: m.last_event, zeit: m.created_at })),
      listen: (listen.daten?.data || []).map((l) => ({ id: l.id, name: l.name })),
      domains: (domains.daten?.data || []).map((d) => ({ name: d.name, status: d.status, region: d.region })),
    },
  });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  const d = await request.json().catch(() => null);
  const g = GRUPPEN[d?.gruppe];
  if (!g) return json(422, { fehler: "Unbekannte Gruppe." });
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  const empfaenger = (await anmeldungen(env)).filter(g.passt).map((e) => ({ mail: e.mail, name: e.name }));

  if (d.aktion === "vorschau") return json(200, { anzahl: empfaenger.length, beispiele: empfaenger.slice(0, 5).map((e) => e.mail) });
  if (d.aktion !== "senden") return json(400, { fehler: "Unbekannte Aktion." });
  if (!env.RESEND_API_KEY) return json(412, { fehler: "Resend-Schlüssel fehlt." });

  const betreff = String(d.betreff || "").trim().slice(0, 150);
  const text = String(d.text || "").trim().slice(0, 10000);
  if (betreff.length < 3 || text.length < 10) return json(422, { fehler: "Betreff und Text dürfen nicht leer sein." });

  const html = (name) =>
    rahmen(
      `${name ? `<p style="margin:0 0 14px;">Hallo ${String(name).split(/\s+/)[0].replace(/[<>&"']/g, "")},</p>` : ""}${textZuHtml(text)}
      <p style="margin:18px 0 0;font-size:13px;color:#5b6675;">Du bekommst diese Mail, weil du dich für die Alpha von Bewerbungs-Cockpit angemeldet hast. Antworte einfach, wenn du keine weiteren Mails möchtest.</p>`,
    );
  const von = env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>";
  const antwortAn = env.MAIL_AN || "Kontakt@mesco.cc";

  const ziel = d.test ? [{ mail: antwortAn, name: "Test" }] : empfaenger;
  if (!ziel.length) return json(422, { fehler: "Die Gruppe ist leer." });
  let gesendet = 0;
  for (let i = 0; i < ziel.length; i += 100) {
    const paket = ziel.slice(i, i + 100).map((e) => ({ from: von, to: [e.mail], reply_to: antwortAn, subject: betreff, html: html(e.name) }));
    const r = await resend(env, "emails/batch", { method: "POST", body: JSON.stringify(paket) });
    if (!r.ok) return json(502, { fehler: `Resend ${r.status} — ${gesendet} von ${ziel.length} gesendet.` });
    gesendet += paket.length;
  }
  if (!d.test) await protokolliere(env, data.benutzer, "Rundmail gesendet", `${betreff} → ${g.titel} (${gesendet})`);
  return json(200, { ok: true, meldung: d.test ? `Testmail an ${antwortAn} gesendet.` : `${gesendet} Mails gesendet.` });
}
