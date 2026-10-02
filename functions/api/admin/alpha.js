/**
 * /api/admin/alpha — Anmeldungen verwalten.
 *   GET   alle Anmeldungen + Plätze
 *   POST  { aktion: "status", mail, status }
 *         { aktion: "notiz", mail, notiz }
 *         { aktion: "einladen", mail, ohneCode? }   Rabattcode (100 %) + Mail mit Checkout-Link
 *         { aktion: "loeschen", mail }              DSGVO: Eintrag entfernen
 *         { aktion: "plaetze", plaetze }
 */
import { json } from "../../../lib/admin/zugang.js";
import { anmeldungen, escapeHtml, lemon, lsFehler, resend, zaehleBelegt } from "../../../lib/admin/daten.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";
import { alsText, kasten, knopf, link as mailLink, mailHtml, titel } from "../../../lib/mail/vorlage.js";
import { plaetze } from "../../../lib/alpha-optionen.js";

const STATUS = ["neu", "angenommen", "eingeladen", "warteliste", "abgelehnt"];

export async function onRequestGet({ data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  const liste = await anmeldungen(env);
  const einladenBereit = Boolean(env.LEMONSQUEEZY_API_KEY && env.LS_STORE_ID && env.LS_ALPHA_VARIANT_ID && env.LS_ALPHA_CHECKOUT_URL && env.RESEND_API_KEY);
  return json(200, { plaetze: await plaetze(env), status: STATUS, einladenBereit, eintraege: liste.map(({ _key, ...e }) => e) });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  const d = await request.json().catch(() => null);
  if (!d?.aktion) return json(400, { fehler: "Aktion fehlt." });

  if (d.aktion === "plaetze") {
    const n = Number(d.plaetze);
    if (!Number.isInteger(n) || n < 0 || n > 10000) return json(422, { fehler: "Bitte eine ganze Zahl zwischen 0 und 10000." });
    await env.ALPHA.put("config:alpha", JSON.stringify({ plaetze: n }));
    await protokolliere(env, data.benutzer, "Alpha-Plätze geändert", `auf ${n}`);
    return json(200, { ok: true, meldung: `Plätze auf ${n} gesetzt.` });
  }

  const mail = String(d.mail || "").trim().toLowerCase();
  const key = "alpha:" + mail;
  const roh = mail.includes("@") ? await env.ALPHA.get(key) : null;
  if (!roh) return json(404, { fehler: "Anmeldung nicht gefunden." });
  const eintrag = JSON.parse(roh);

  switch (d.aktion) {
    case "status": {
      if (!STATUS.includes(d.status)) return json(422, { fehler: "Unbekannter Status." });
      eintrag.status = d.status;
      eintrag.geaendert = new Date().toISOString();
      await env.ALPHA.put(key, JSON.stringify(eintrag));
      await zaehleBelegt(env);
      await protokolliere(env, data.benutzer, "Alpha-Status", `${mail} → ${d.status}`);
      return json(200, { ok: true, meldung: `Status: ${d.status}.`, eintrag });
    }
    case "notiz": {
      eintrag.notiz = String(d.notiz || "").slice(0, 2000);
      await env.ALPHA.put(key, JSON.stringify(eintrag));
      await protokolliere(env, data.benutzer, "Alpha-Notiz", mail);
      return json(200, { ok: true, meldung: "Notiz gespeichert.", eintrag });
    }
    case "loeschen": {
      await env.ALPHA.delete(key);
      await zaehleBelegt(env);
      await protokolliere(env, data.benutzer, "Alpha-Anmeldung gelöscht", mail);
      return json(200, { ok: true, meldung: "Anmeldung gelöscht." });
    }
    case "einladen":
      return einladen(env, data.benutzer, key, eintrag, Boolean(d.ohneCode));
    default:
      return json(400, { fehler: "Unbekannte Aktion." });
  }
}

async function einladen(env, benutzer, key, eintrag, ohneCode) {
  const fehlt = ["LS_ALPHA_CHECKOUT_URL", "RESEND_API_KEY", ...(ohneCode ? [] : ["LEMONSQUEEZY_API_KEY", "LS_STORE_ID", "LS_ALPHA_VARIANT_ID"])].filter((n) => !env[n]);
  if (fehlt.length) return json(412, { fehler: `Für Einladungen fehlt in den Einstellungen: ${fehlt.join(", ")}.` });

  let code = null;
  if (!ohneCode) {
    code = "ALPHA" + crypto.getRandomValues(new Uint32Array(2)).reduce((s, x) => s + x.toString(36).toUpperCase(), "").slice(0, 8);
    const r = await lemon(env, "discounts", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "discounts",
          attributes: {
            name: `Alpha ${eintrag.mail}`.slice(0, 60),
            code,
            amount: 100,
            amount_type: "percent",
            is_limited_to_products: true,
            is_limited_redemptions: true,
            max_redemptions: 1,
          },
          relationships: {
            store: { data: { type: "stores", id: String(env.LS_STORE_ID) } },
            variants: { data: [{ type: "variants", id: String(env.LS_ALPHA_VARIANT_ID) }] },
          },
        },
      }),
    });
    if (!r.ok) return json(502, { fehler: `Rabattcode konnte nicht angelegt werden: ${lsFehler(r)}` });
  }

  const link = new URL(env.LS_ALPHA_CHECKOUT_URL);
  link.searchParams.set("checkout[email]", eintrag.mail);
  if (eintrag.name) link.searchParams.set("checkout[name]", eintrag.name);
  if (code) link.searchParams.set("checkout[discount_code]", code);

  const vorname = String(eintrag.name || "").split(/\s+/)[0] || "hallo";
  const html = mailHtml(
    `${titel(`Du bist dabei, ${vorname}!`)}
    <p style="margin:0 0 14px;">Danke für deine Anmeldung. Schön, dass du die <b>0.1 Alpha</b> von cockpit testest.
    So kommst du an deinen Alpha-Schlüssel:</p>
    ${knopf(link.href, "Alpha-Schlüssel abholen")}
    <p style="margin:0 0 14px;font-size:14px;color:#5b6675;">Der Link führt zu Lemon Squeezy, über die cockpit später verkauft wird.
    ${code ? `Der Code <b>${escapeHtml(code)}</b> ist schon eingetragen, du zahlst <b>0 €</b>.` : "Die Alpha-Variante kostet 0 €."}
    Danach kommt der Schlüssel per Mail.</p>
    ${kasten(
      "Dann",
      `1. App laden: ${mailLink("https://cockpit.mesco.cc/download/", "cockpit.mesco.cc/download")}<br>
      2. Schlüssel beim ersten Start eintragen (${mailLink("https://cockpit.mesco.cc/hilfe/alpha-schluessel/", "Anleitung")})<br>
      3. Nach ein paar Tagen fragt dich die App kurz, wie es läuft. Unter „Feedback geben“ kannst du jederzeit Fehler melden.`,
    )}
    ${env.DISCORD_URL ? `<p style="margin:0 0 14px;">Austausch mit den anderen Testern: ${mailLink(env.DISCORD_URL, "Discord")}.</p>` : ""}
    <p style="margin:0 0 14px;">Bei Fragen antworte einfach auf diese Mail.</p>
    <p style="margin:0;">Viele Grüße<br>Thomas</p>`,
    { vorschau: "Hier holst du deinen Alpha-Schlüssel ab.", grund: "Du bekommst diese Mail, weil du dich auf cockpit.mesco.cc für die Alpha angemeldet hast." },
  );

  const r = await resend(env, "emails", {
    method: "POST",
    body: JSON.stringify({
      from: env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>",
      to: [eintrag.mail],
      reply_to: env.MAIL_AN || "Kontakt@mesco.cc",
      subject: "Du bist in der Alpha von Bewerbungs-Cockpit",
      html,
      text: alsText(html),
    }),
  });
  if (!r.ok) return json(502, { fehler: `Mail konnte nicht gesendet werden (Resend ${r.status}).${code ? ` Der Code ${code} ist angelegt.` : ""}` });

  eintrag.status = "eingeladen";
  eintrag.eingeladen = { zeit: new Date().toISOString(), code };
  await env.ALPHA.put(key, JSON.stringify(eintrag));
  await zaehleBelegt(env);
  await protokolliere(env, benutzer, "Alpha-Einladung gesendet", `${eintrag.mail}${code ? ` (Code ${code})` : ""}`);
  return json(200, { ok: true, meldung: `Einladung an ${eintrag.mail} gesendet.`, eintrag });
}
