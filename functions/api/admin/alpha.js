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
import { anmeldungen, escapeHtml, lemon, lsFehler, resend, resendFehler, zaehleBelegt } from "../../../lib/admin/daten.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";
import { alsText, kasten, knopf, link as mailLink, mailHtml, titel } from "../../../lib/mail/vorlage.js";
import { plaetze } from "../../../lib/alpha-optionen.js";
import { polarFehler, polarRabatt } from "../../../lib/polar.js";

import { keygenAlphaLizenz, cockpitLizenz, KEYGEN_PREFIX } from "../../../lib/keygen.js";

const STATUS = ["neu", "angenommen", "eingeladen", "warteliste", "abgelehnt"];

export async function onRequestGet({ data }) {
  const env = data.env;
  if (!env.ALPHA) return json(503, { fehler: "KV-Namespace ALPHA ist nicht verbunden." });
  const liste = await anmeldungen(env);
  const einladenBereit = env.KEYGEN_PRODUCT_TOKEN
    ? Boolean(env.ALPHA_DOWNLOAD_URL && env.RESEND_API_KEY)
    : env.POLAR_ACCESS_TOKEN
    ? Boolean(env.POLAR_ALPHA_CHECKOUT_URL && env.POLAR_ALPHA_PRODUCT_ID && env.POLAR_ORG_ID && env.RESEND_API_KEY)
    : Boolean(env.LEMONSQUEEZY_API_KEY && env.LS_STORE_ID && env.LS_ALPHA_VARIANT_ID && env.LS_ALPHA_CHECKOUT_URL && env.RESEND_API_KEY);
  return json(200, { plaetze: await plaetze(env), status: STATUS, anbieter: env.KEYGEN_PRODUCT_TOKEN ? "Keygen" : env.POLAR_ACCESS_TOKEN ? "Polar" : "Lemon Squeezy", einladenBereit, eintraege: liste.map(({ _key, ...e }) => e) });
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
  if (env.KEYGEN_PRODUCT_TOKEN) return einladenKeygen(env, benutzer, key, eintrag);
  if (env.POLAR_ACCESS_TOKEN) return einladenPolar(env, benutzer, key, eintrag, ohneCode);
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
  return einladungSenden(env, benutzer, key, eintrag, link, code, "Lemon Squeezy");
}

/** Polar: 100-%-Code nur für das Alpha-Produkt, einmal einlösbar; Link mit Mail und Code vorbefüllt. */
async function einladenPolar(env, benutzer, key, eintrag, ohneCode) {
  const fehlt = ["POLAR_ALPHA_CHECKOUT_URL", "RESEND_API_KEY", ...(ohneCode ? [] : ["POLAR_ALPHA_PRODUCT_ID", "POLAR_ORG_ID"])].filter((n) => !env[n]);
  if (fehlt.length) return json(412, { fehler: `Für Einladungen fehlt in den Einstellungen: ${fehlt.join(", ")}.` });
  let code = null;
  if (!ohneCode) {
    // Ein früherer Versuch kann den Code schon angelegt haben (Mail scheiterte): wiederverwenden statt einen zweiten anlegen.
    code = eintrag.rabattcode || null;
    if (!code) {
      code = "ALPHA" + crypto.getRandomValues(new Uint32Array(2)).reduce((s, x) => s + x.toString(36).toUpperCase(), "").slice(0, 8);
      const r = await polarRabatt(env, { name: `Alpha ${eintrag.mail}`, code, prozent: 100, anzahl: 1, produkte: [String(env.POLAR_ALPHA_PRODUCT_ID)] });
      if (!r.ok) return json(502, { fehler: `Rabattcode konnte nicht angelegt werden: ${polarFehler(r)}` });
      eintrag.rabattcode = code;
      await env.ALPHA.put(key, JSON.stringify(eintrag));
    }
  }
  const link = new URL(env.POLAR_ALPHA_CHECKOUT_URL);
  link.searchParams.set("customer_email", eintrag.mail);
  if (eintrag.name) link.searchParams.set("customer_name", eintrag.name);
  if (code) link.searchParams.set("discount_code", code);
  return einladungSenden(env, benutzer, key, eintrag, link, code, "Polar");
}

async function einladungSenden(env, benutzer, key, eintrag, link, code, anbieter) {
  const vorname = String(eintrag.name || "").split(/\s+/)[0] || "hallo";
  const html = mailHtml(
    `${titel(`Du bist dabei, ${vorname}!`)}
    <p style="margin:0 0 14px;">Danke für deine Anmeldung. Schön, dass du die <b>0.1 Alpha</b> von cockpit testest.
    So kommst du an deinen Alpha-Schlüssel und an die Installer:</p>
    ${knopf(link.href, "Schlüssel und Installer abholen")}
    <p style="margin:0 0 14px;font-size:14px;color:#5b6675;">Der Link führt zu ${anbieter}, über die cockpit später verkauft wird.
    ${code ? `Der Code <b>${escapeHtml(code)}</b> ist schon eingetragen, du zahlst <b>0 €</b>.` : "Die Alpha-Variante kostet 0 €."}
    Danach schickt ${anbieter} dir eine Mail mit deinem Alpha-Schlüssel und dem Zugang zu den Dateien. Öffentliche Download-Links gibt es in der Alpha nicht, die Installer liegen nur dort.</p>
    ${kasten(
      "So geht es weiter",
      `1. In der Mail von ${anbieter} auf den Zugang zu deiner Bestellung gehen und den Installer für dein System laden: Windows (.exe oder .msi), Linux (AppImage oder .deb) oder macOS (.zip)<br>
      2. Installieren, die Schritte stehen unter ${mailLink("https://cockpit.mesco.cc/hilfe/erste-schritte/", "Erste Schritte")}<br>
      3. Den Alpha-Schlüssel beim ersten Start eintragen (${mailLink("https://cockpit.mesco.cc/hilfe/alpha-schluessel/", "Anleitung")})<br>
      4. Nach ein paar Tagen fragt dich die App kurz, wie es läuft. Unter „Feedback geben“ kannst du jederzeit Fehler melden.`,
    )}
    <p style="margin:0 0 14px;font-size:14px;color:#5b6675;">Keine Mail von ${anbieter} da? Schau im Spam-Ordner nach (Absender ist ${anbieter}, nicht cockpit) oder antworte auf diese Mail.</p>
    ${env.DISCORD_URL ? `<p style="margin:0 0 14px;">Austausch mit den anderen Testern: ${mailLink(env.DISCORD_URL, "Discord")}.</p>` : ""}
    <p style="margin:0 0 14px;">Bei Fragen antworte einfach auf diese Mail.</p>
    <p style="margin:0;">Viele Grüße<br>Thomas</p>`,
    { vorschau: "Hier holst du Alpha-Schlüssel und Installer ab.", grund: "Du bekommst diese Mail, weil du dich auf cockpit.mesco.cc für die Alpha angemeldet hast." },
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
  if (!r.ok) {
    await protokolliere(env, benutzer, "Alpha-Einladung: Mail fehlgeschlagen", `${eintrag.mail} (${resendFehler(r).slice(0, 160)})`);
    return json(502, { fehler: `Mail konnte nicht gesendet werden. ${resendFehler(r)}${code ? " Der Rabattcode ist angelegt und wird beim nächsten Versuch wiederverwendet." : ""}` });
  }

  eintrag.status = "eingeladen";
  eintrag.eingeladen = { zeit: new Date().toISOString(), code };
  await env.ALPHA.put(key, JSON.stringify(eintrag));
  await zaehleBelegt(env);
  await protokolliere(env, benutzer, "Alpha-Einladung gesendet", `${eintrag.mail}${code ? ` (Code …${code.slice(-4)})` : ""}`);
  return json(200, { ok: true, meldung: `Einladung an ${eintrag.mail} gesendet.`, eintrag });
}

/** Alpha ohne Checkout: persönliche Lizenz direkt in der Einladungsmail. */
async function einladenKeygen(env, benutzer, key, eintrag) {
  if (!env.ALPHA_DOWNLOAD_URL || !env.RESEND_API_KEY) return json(412,{fehler:"Für Keygen-Einladungen fehlen Alpha-Downloadlink oder Resend-Schlüssel."});
  if (!/^https:\/\/(cockpit\.mesco\.cc|github\.com\/Stacktor\/cockpit-releases)\//.test(env.ALPHA_DOWNLOAD_URL)) return json(412,{fehler:"Alpha-Downloadlink ist ungültig."});
  const l=await keygenAlphaLizenz(env,eintrag);
  if (!l.ok || !cockpitLizenz(env,l.daten?.data) || !l.daten.data.attributes.key) return json(502,{fehler:"Die Alpha-Lizenz konnte bei Keygen nicht erstellt oder geladen werden."});
  eintrag.keygen_lizenz_id=l.daten.data.id;
  await env.ALPHA.put(key,JSON.stringify(eintrag));
  const schluessel=KEYGEN_PREFIX+l.daten.data.attributes.key;
  const html=mailHtml(`${titel(`Du bist dabei, ${String(eintrag.name || "hallo").split(/\s+/)[0]}!`)}
    <p>Dein persönlicher Schlüssel für die kostenlose cockpit Alpha:</p>
    ${kasten("Alpha-Schlüssel",escapeHtml(schluessel))}
    ${knopf(env.ALPHA_DOWNLOAD_URL,"cockpit herunterladen")}
    <p>Installiere cockpit und gib beim ersten Start diesen Schlüssel ein. Ohne Freischaltung ist die Alpha gesperrt. Du kannst bis zu drei Geräte aktivieren und Geräte in der App wieder abmelden.</p>
    <p>Die erste Aktivierung braucht Internet. Danach sind bis zu 30 Tage offline möglich. Bitte teile deinen persönlichen Schlüssel nicht.</p>
    ${kasten("Gut zu wissen beim ersten Start",`Die Installer sind signiert, aber noch nicht von einer Zertifizierungsstelle beglaubigt (das folgt nach der Alpha). Deshalb warnen die Systeme beim ersten Start einmal:<br>
      <b>Windows:</b> „Der Computer wurde durch Windows geschützt“ → <i>Weitere Informationen</i> → <i>Trotzdem ausführen</i>.<br>
      <b>Mac:</b> Die Frage nach dem Öffnen mit <i>Öffnen</i> bestätigen. Erscheint nur „Fertig“, dann <i>Systemeinstellungen</i> → <i>Datenschutz &amp; Sicherheit</i> → <i>Trotzdem öffnen</i>. Danach fragt macOS nach dem Schlüsselbund, dort liegt dein Schlüssel verschlüsselt: <i>Immer erlauben</i>. Nach einem Update kann die Frage wiederkommen.<br>
      Den Installer bekommst du nur über den Knopf oben oder von ${mailLink("https://cockpit.mesco.cc/download/","cockpit.mesco.cc/download")}.`)}
    <p>${mailLink("https://cockpit.mesco.cc/hilfe/alpha-schluessel/","Hilfe zur Freischaltung")}${" · "}${mailLink("https://cockpit.mesco.cc/hilfe/probleme/","Probleme lösen")}. Bei Fragen antworte auf diese Mail${env.DISCORD_URL ? ` oder schau auf dem ${mailLink(env.DISCORD_URL,"Discord-Server")} vorbei` : ""}. Fehler meldest du am besten in der App unter <i>Feedback geben</i> → <i>Fehler melden</i>.</p>
    <p>Viele Grüße<br>Thomas</p>`,{vorschau:"Dein persönlicher Alpha-Schlüssel für cockpit.",grund:"Du hast dich auf cockpit.mesco.cc für die Alpha angemeldet."});
  const r=await resend(env,"emails",{method:"POST",body:JSON.stringify({from:env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>",to:[eintrag.mail],reply_to:env.MAIL_AN || "Kontakt@mesco.cc",subject:"Dein Alpha-Schlüssel für cockpit",html,text:alsText(html)})});
  if (!r.ok) {
    await protokolliere(env,benutzer,"Alpha-Einladung: Mail fehlgeschlagen",`${eintrag.mail} (Keygen-Lizenz bleibt für Wiederholung erhalten)`);
    return json(502,{fehler:"Die Mail konnte nicht gesendet werden. Die vorhandene Keygen-Lizenz wird beim nächsten Versuch wiederverwendet."});
  }
  eintrag.status="eingeladen";eintrag.eingeladen={zeit:new Date().toISOString(),anbieter:"Keygen"};
  await env.ALPHA.put(key,JSON.stringify(eintrag));await zaehleBelegt(env);
  await protokolliere(env,benutzer,"Alpha-Einladung gesendet",`${eintrag.mail} (Keygen)`);
  return json(200,{ok:true,meldung:`Einladung an ${eintrag.mail} gesendet.`,eintrag});
}
