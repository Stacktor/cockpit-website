/**
 * Alpha-Anmeldung — Cloudflare Pages Function
 *
 * Nimmt das Formular von cockpit.mesco.cc entgegen, legt die Anmeldung in
 * Cloudflare KV ab und verschickt zwei Mails über Resend:
 *   1. Bestätigung an die anmeldende Person
 *   2. Benachrichtigung an Thomas
 *
 * Einstellungen im Pages-Projekt (Settings → Variables and Secrets):
 *
 *   RESEND_API_KEY   Secret     PFLICHT   API-Schlüssel von resend.com (beginnt mit re_)
 *   RESEND_AUDIENCE  Variable   optional  ID der Kontaktliste. Fehlt sie, wird die
 *                                        erste Liste des Kontos automatisch verwendet.
 *   MAIL_VON         Variable   empfohlen z. B. "Bewerbungs-Cockpit <alpha@mesco.cc>"
 *   MAIL_AN          Variable   empfohlen z. B. "Kontakt@mesco.cc"
 *
 *   ALPHA            KV-Namespace  OPTIONAL  nur für Zähler und Doppelanmeldungs-Erkennung
 *
 * Jeder Baustein ist einzeln abschaltbar. Fehlt etwas, läuft der Rest weiter —
 * eine fehlende Konfiguration darf niemals eine Anmeldung verschlucken.
 *
 * Ausnahme: Fehlen KV UND Resend, antwortet die Funktion mit 503 und einem
 * Hinweis auf die E-Mail-Adresse — statt eine Anmeldung stillschweigend
 * zu verlieren.
 */

const PLAETZE = 30;

export async function onRequestPost({ request, env }) {
  try {
    const daten = await request.json().catch(() => null);
    if (!daten) return antwort(400, "Anfrage konnte nicht gelesen werden.");

    // ── Eingaben prüfen ────────────────────────────────────────────────
    const name = String(daten.name || "").trim().slice(0, 80);
    const mail = String(daten.mail || "").trim().toLowerCase().slice(0, 160);
    const os = String(daten.os || "").trim().slice(0, 40);
    const grund = String(daten.grund || "").trim().slice(0, 1000);
    const falle = String(daten.website || "").trim(); // Honigtopf, s. u.

    // Bots füllen versteckte Felder aus. Menschen nicht.
    // Wir antworten trotzdem freundlich, damit der Bot nichts lernt.
    if (falle) return antwort(200, null, { ok: true, platz: 0 });

    if (name.length < 2) return antwort(422, "Bitte gib deinen Namen an.");
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(mail))
      return antwort(422, "Diese E-Mail-Adresse sieht nicht gültig aus.");
    if (!["windows", "macos", "linux"].includes(os))
      return antwort(422, "Bitte wähle dein Betriebssystem.");
    if (grund.length < 10)
      return antwort(422, "Schreib bitte ein, zwei Sätze — das hilft mir bei der Auswahl.");

    // ── Notbremse: Nirgends speicherbar? Dann ehrlich sein. ───────────
    // Ohne KV UND ohne Resend würde die Anmeldung ins Leere laufen. Lieber
    // eine klare Fehlermeldung als ein Häkchen, hinter dem nichts passiert.
    if (!env.ALPHA && !env.RESEND_API_KEY) {
      return antwort(
        503,
        "Die Anmeldung ist gerade noch nicht scharfgeschaltet. " +
          "Schreib mir bitte kurz an Kontakt@mesco.cc — ich trage dich von Hand ein."
      );
    }

    // ── Doppelanmeldung abfangen ──────────────────────────────────────
    const schluessel = "alpha:" + mail;
    if (env.ALPHA) {
      const vorhanden = await env.ALPHA.get(schluessel);
      if (vorhanden) {
        return antwort(200, null, {
          ok: true,
          doppelt: true,
          nachricht: "Du bist bereits angemeldet — ich melde mich.",
        });
      }
    }

    // ── Speichern ─────────────────────────────────────────────────────
    const eintrag = {
      name,
      mail,
      os,
      grund,
      zeit: new Date().toISOString(),
      land: request.headers.get("cf-ipcountry") || "??",
      quelle: request.headers.get("referer") || "",
    };

    let platz = 0;
    if (env.ALPHA) {
      await env.ALPHA.put(schluessel, JSON.stringify(eintrag));
      const zaehler = Number((await env.ALPHA.get("alpha:anzahl")) || "0") + 1;
      await env.ALPHA.put("alpha:anzahl", String(zaehler));
      platz = zaehler;
    }

    // ── In die Kontaktliste bei Resend eintragen ──────────────────────
    // Das ist „die Liste": in Resend unter Audiences einsehbar und exportierbar.
    if (env.RESEND_API_KEY) {
      const liste = env.RESEND_AUDIENCE || (await ersteListe(env.RESEND_API_KEY));
      if (liste) {
      const [vorname, ...rest] = name.split(/\s+/);
      await fetch(`https://api.resend.com/audiences/${liste}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: mail,
          first_name: vorname || "",
          last_name: rest.join(" "),
          unsubscribed: false,
        }),
      }).catch(() => {}); // Liste ist wichtig, aber nicht wichtiger als die Anmeldung
      }
    }

    // ── Mails ─────────────────────────────────────────────────────────
    // Fehler beim Versand dürfen die Anmeldung nicht scheitern lassen.
    if (env.RESEND_API_KEY) {
      const von = env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>";
      const an = env.MAIL_AN || "Kontakt@mesco.cc";
      await Promise.allSettled([
        senden(env.RESEND_API_KEY, {
          from: von,
          to: [mail],
          subject: "Deine Anmeldung zur Alpha von Bewerbungs-Cockpit",
          html: mailAnBewerber(name, platz),
        }),
        senden(env.RESEND_API_KEY, {
          from: von,
          to: [an],
          reply_to: mail,
          subject: `Alpha-Anmeldung #${platz || "?"}: ${name} (${os})`,
          html: mailAnThomas(eintrag, platz),
        }),
      ]);
    }

    return antwort(200, null, { ok: true, platz });
  } catch (fehler) {
    return antwort(500, "Unerwarteter Fehler. Bitte schreib mir direkt an Kontakt@mesco.cc.");
  }
}

/** Freie Plätze für die Anzeige auf der Seite. */
export async function onRequestGet({ env }) {
  let belegt = 0;
  if (env.ALPHA) belegt = Number((await env.ALPHA.get("alpha:anzahl")) || "0");
  return antwort(200, null, { plaetze: PLAETZE, belegt, frei: Math.max(0, PLAETZE - belegt) });
}

// ───────────────────────── Hilfsfunktionen ─────────────────────────

function antwort(status, fehler, koerper) {
  return new Response(JSON.stringify(fehler ? { ok: false, fehler } : koerper), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/**
 * Ermittelt die erste Kontaktliste des Resend-Kontos.
 * Spart eine Einstellung: Wer nur den API-Schlüssel hinterlegt, bekommt
 * die Liste automatisch. Das Ergebnis wird für den Lauf gemerkt.
 */
let listeGemerkt = null;
async function ersteListe(schluessel) {
  if (listeGemerkt !== null) return listeGemerkt;
  try {
    const r = await fetch("https://api.resend.com/audiences", {
      headers: { Authorization: `Bearer ${schluessel}` },
    });
    if (!r.ok) return (listeGemerkt = "");
    const j = await r.json();
    listeGemerkt = (j.data && j.data[0] && j.data[0].id) || "";
  } catch (_) {
    listeGemerkt = "";
  }
  return listeGemerkt;
}

async function senden(schluessel, nachricht) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${schluessel}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(nachricht),
  });
  if (!r.ok) throw new Error("Resend: " + r.status);
  return r.json();
}

const RAHMEN = (inhalt) => `<!DOCTYPE html><html lang="de"><body style="margin:0;padding:0;background:#f6f8fb;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:32px 12px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e4e8ee;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:26px 30px 0;">
  <div style="font-size:18px;font-weight:700;letter-spacing:-.4px;color:#0e1218;">Bewerbungs-<span style="color:#1f5eff;">Cockpit</span></div>
</td></tr>
<tr><td style="padding:18px 30px 30px;font-size:15px;line-height:1.65;color:#232b36;">
${inhalt}
</td></tr>
<tr><td style="padding:16px 30px;border-top:1px solid #e4e8ee;font-size:12px;color:#5b6675;">
  Thomas Graf · Erlhorst 15 · 27753 Delmenhorst<br>
  <a href="https://cockpit.mesco.cc" style="color:#5b6675;">cockpit.mesco.cc</a> ·
  <a href="https://cockpit.mesco.cc/impressum.html" style="color:#5b6675;">Impressum</a> ·
  <a href="https://cockpit.mesco.cc/datenschutz.html" style="color:#5b6675;">Datenschutz</a>
</td></tr>
</table></td></tr></table></body></html>`;

const mailAnBewerber = (name, platz) =>
  RAHMEN(`
  <h1 style="font-size:21px;margin:0 0 12px;letter-spacing:-.4px;color:#0e1218;">Danke, ${escape_(name)}.</h1>
  <p style="margin:0 0 14px;">Deine Anmeldung für die geschlossene Alpha ist angekommen${
    platz ? ` — du bist Anmeldung Nummer <b>${platz}</b>` : ""
  }.</p>
  <p style="margin:0 0 14px;">Ich vergebe die dreißig Plätze persönlich und melde mich in den
  nächsten Tagen bei dir. Falls es diesmal nicht klappt, sage ich dir auch das —
  du hörst auf jeden Fall von mir.</p>
  <div style="background:#e7f6ef;border:1px solid #b9e3cd;border-radius:9px;padding:14px 16px;margin:20px 0;">
    <b style="display:block;margin-bottom:4px;color:#0b5f43;">Was dich erwartet</b>
    <span style="color:#0b5f43;">Vollzugang zu allen Pro-Funktionen. Wenn du mir nach vier Wochen
    einmal ehrlich schreibst, was gut und was schlecht war, behältst du die Vollversion
    dauerhaft — inklusive aller künftigen Aktualisierungen.</span>
  </div>
  <p style="margin:0 0 14px;">Bis dahin: Diese Mail brauchst du nicht aufzubewahren, und du musst
  nichts weiter tun.</p>
  <p style="margin:0;">Viele Grüße<br>Thomas</p>
  <p style="margin:18px 0 0;font-size:13px;color:#5b6675;">Du bekommst diese Mail, weil du dich auf
  cockpit.mesco.cc für die Alpha angemeldet hast. Antworte einfach, wenn du wieder
  gestrichen werden möchtest.</p>`);

const mailAnThomas = (e, platz) =>
  RAHMEN(`
  <h1 style="font-size:19px;margin:0 0 14px;color:#0e1218;">Neue Alpha-Anmeldung${
    platz ? ` (#${platz})` : ""
  }</h1>
  <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
    <tr><td style="padding:5px 0;color:#5b6675;width:120px;">Name</td><td><b>${escape_(e.name)}</b></td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">E-Mail</td><td><a href="mailto:${escape_(e.mail)}">${escape_(e.mail)}</a></td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">System</td><td>${escape_(e.os)}</td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">Land</td><td>${escape_(e.land)}</td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">Zeit</td><td>${escape_(e.zeit)}</td></tr>
  </table>
  <div style="background:#f6f8fb;border:1px solid #e4e8ee;border-radius:9px;padding:14px 16px;margin:16px 0 0;">
    <b style="display:block;margin-bottom:6px;">Warum die Person sucht</b>
    ${escape_(e.grund).replace(/\n/g, "<br>")}
  </div>
  <p style="margin:16px 0 0;font-size:13px;color:#5b6675;">Antworten auf diese Mail geht direkt an
  die anmeldende Person.</p>`);

function escape_(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
