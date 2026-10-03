/**
 * /api/admin/mail — Resend: Zustellung, Listen, Rundmail an Tester.
 *   GET            Kennzahlen, Verlauf (letzte 100), Domains, Listen, Gruppen
 *   GET ?id=…      eine gesendete Mail mit HTML (für die Vorschau im Verlauf)
 *   POST { aktion: "vorschau", gruppe }                    Anzahl + Beispiele
 *        { aktion: "entwurf", betreff, text }               fertiges HTML für die Live-Vorschau
 *        { aktion: "senden", gruppe, betreff, text, test? }   test = nur an MAIL_AN
 * Gruppen: eingeladen | angenommen | warteliste | alle
 */
import { json } from "../../../lib/admin/zugang.js";
import { anmeldungen, hinweis, resend, zaehle } from "../../../lib/admin/daten.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";
import { alsText, escapeHtml, mailHtml, textZuHtml } from "../../../lib/mail/vorlage.js";

const GRUPPEN = {
  eingeladen: { titel: "Alpha-Tester (eingeladen)", passt: (e) => e.status === "eingeladen" },
  angenommen: { titel: "Angenommen, noch nicht eingeladen", passt: (e) => e.status === "angenommen" },
  warteliste: { titel: "Warteliste", passt: (e) => e.status === "warteliste" },
  alle: { titel: "Alle Anmeldungen (ohne Abgelehnte)", passt: (e) => e.status !== "abgelehnt" },
};

/** Resend-Ereignisse zu Kennzahlen: was ankam, geöffnet wurde, zurückkam. */
export function kennzahlen(mails) {
  const z = (...arten) => mails.filter((m) => arten.includes(m.last_event)).length;
  const zugestellt = z("delivered", "opened", "clicked");
  return {
    gesamt: mails.length,
    zugestellt,
    geoeffnet: z("opened", "clicked"),
    geklickt: z("clicked"),
    probleme: z("bounced", "complained", "delivery_delayed", "failed"),
    unterwegs: z("sent", "queued", "scheduled"),
  };
}

const VON = (env) => env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>";

function rundmailHtml(text, name) {
  return mailHtml(`${name ? `<p style="margin:0 0 14px;">Hallo ${escapeHtml(String(name).split(/\s+/)[0])},</p>` : ""}${textZuHtml(text)}`, {
    vorschau: text.split("\n")[0].slice(0, 120),
    grund: "Du bekommst diese Mail, weil du dich für die Alpha von Bewerbungs-Cockpit angemeldet hast. Antworte einfach, wenn du keine weiteren Mails möchtest.",
  });
}

export async function onRequestGet({ request, data }) {
  const env = data.env;
  const id = request ? new URL(request.url).searchParams.get("id") : null;
  if (id) {
    if (!env.RESEND_API_KEY) return json(412, { fehler: "Resend-Schlüssel fehlt." });
    const m = await resend(env, `emails/${encodeURIComponent(id)}`);
    if (!m.ok) return json(m.status || 502, { fehler: `Resend: ${m.status}` });
    const x = m.daten || {};
    return json(200, { id: x.id, an: [].concat(x.to || []).join(", "), von: x.from, betreff: x.subject, status: x.last_event, zeit: x.created_at, html: x.html || null, text: x.text || null });
  }
  const liste = env.ALPHA ? await anmeldungen(env) : [];
  const gruppen = Object.entries(GRUPPEN).map(([id, g]) => ({ id, titel: g.titel, anzahl: liste.filter(g.passt).length }));
  if (!env.RESEND_API_KEY) return json(200, { gruppen, resend: hinweis("Der Resend-Schlüssel fehlt. Trag ihn unter Einstellungen ein.") });
  const [mails, listen, domains] = await Promise.all([resend(env, "emails?limit=100"), resend(env, "audiences"), resend(env, "domains")]);
  if (!mails.ok)
    return json(200, { gruppen, resend: hinweis(mails.status === 401 || mails.status === 403 ? "Der Resend-Schlüssel darf nur senden. Für die Übersicht „Full access“ eintragen." : `Resend: ${mails.status}`) });
  const alle = mails.daten?.data || [];
  return json(200, {
    gruppen,
    absender: VON(env),
    testAn: env.MAIL_AN || "Kontakt@mesco.cc",
    resend: {
      ok: true,
      kennzahlen: kennzahlen(alle),
      nachStatus: zaehle(alle.map((m) => m.last_event || "unbekannt")),
      letzte: alle.map((m) => ({ id: m.id, an: Array.isArray(m.to) ? m.to.join(", ") : m.to, betreff: m.subject, status: m.last_event, zeit: m.created_at })),
      listen: (listen.daten?.data || []).map((l) => ({ id: l.id, name: l.name })),
      domains: (domains.daten?.data || []).map((d) => ({ name: d.name, status: d.status, region: d.region })),
    },
  });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  const d = await request.json().catch(() => null);
  if (d?.aktion === "entwurf") {
    const text = String(d.text || "").slice(0, 10000);
    return json(200, { html: rundmailHtml(text || "Hier steht gleich dein Text.", "Anna Beispiel"), betreff: String(d.betreff || "").slice(0, 150) });
  }
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

  const html = (name) => rundmailHtml(text, name);
  const von = VON(env);
  const antwortAn = env.MAIL_AN || "Kontakt@mesco.cc";

  const ziel = d.test ? [{ mail: antwortAn, name: "Test" }] : empfaenger;
  if (!ziel.length) return json(422, { fehler: "Die Gruppe ist leer." });
  let gesendet = 0;
  for (let i = 0; i < ziel.length; i += 100) {
    const paket = ziel.slice(i, i + 100).map((e) => ({ from: von, to: [e.mail], reply_to: antwortAn, subject: betreff, html: html(e.name), text: alsText(html(e.name)) }));
    const r = await resend(env, "emails/batch", { method: "POST", body: JSON.stringify(paket) });
    if (!r.ok) return json(502, { fehler: `Resend meldet ${r.status}. ${gesendet} von ${ziel.length} Mails sind raus.` });
    gesendet += paket.length;
  }
  if (!d.test) await protokolliere(env, data.benutzer, "Rundmail gesendet", `${betreff} → ${g.titel} (${gesendet})`);
  return json(200, { ok: true, meldung: d.test ? `Testmail an ${antwortAn} gesendet.` : `${gesendet} Mails gesendet.` });
}
