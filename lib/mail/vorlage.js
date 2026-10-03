/**
 * Gemeinsame Mail-Vorlage für alle Mails von cockpit: Anmeldung, Warteliste,
 * Einladung, Rundmail, Fehlerbericht, Lizenz-Hinweise.
 *
 * - Logo als gehostetes PNG (public/mail-logo.png), keine Bilder im Anhang
 * - Vorschautext (Preheader) für die Zeile unter dem Betreff im Postfach
 * - HTML mit Inline-Styles (Mailprogramme ignorieren <style>), dazu eine
 *   Textfassung über `alsText`
 * - Fußzeile mit Anbieter, Impressum und Datenschutz; optional ein Satz,
 *   warum die Mail kommt
 */

export const FARBE = { akzent: "#4F46E5", akzentDunkel: "#3730A3", flaeche: "#EEF2FF", rand: "#C7D2FE", text: "#232B36", leise: "#5B6675" };
const SEITE = "https://cockpit.mesco.cc";

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Rahmen um den Inhalt. `vorschau`: Text für die Vorschauzeile; `grund`: warum die Mail kommt. */
export function mailHtml(inhalt, { vorschau = "", grund = "" } = {}) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f6f8fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(vorschau)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #e4e8ee;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:26px 30px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="padding-right:10px;"><img src="${SEITE}/mail-logo.png" width="32" height="32" alt="" style="display:block;border:0;border-radius:8px;"></td>
    <td style="font-size:18px;font-weight:700;letter-spacing:-.4px;color:#0e1218;">Bewerbungs-<span style="color:${FARBE.akzent};">Cockpit</span></td>
  </tr></table>
</td></tr>
<tr><td style="padding:20px 30px 28px;font-size:15px;line-height:1.65;color:${FARBE.text};">${inhalt}</td></tr>
<tr><td style="padding:16px 30px;border-top:1px solid #e4e8ee;font-size:12px;line-height:1.6;color:${FARBE.leise};">
  ${grund ? `${escapeHtml(grund)}<br>` : ""}Thomas Graf · Erlhorst 15 · 27753 Delmenhorst<br>
  <a href="${SEITE}" style="color:${FARBE.leise};">cockpit.mesco.cc</a> ·
  <a href="${SEITE}/impressum/" style="color:${FARBE.leise};">Impressum</a> ·
  <a href="${SEITE}/datenschutz/" style="color:${FARBE.leise};">Datenschutz</a>
</td></tr></table></td></tr></table></body></html>`;
}

/** Überschrift im Inhalt. */
export const titel = (text) => `<h1 style="font-size:21px;margin:0 0 12px;letter-spacing:-.4px;color:#0e1218;">${escapeHtml(text)}</h1>`;

/** Absatz (HTML wird nicht maskiert — für bereits sichere Bausteine). */
export const absatz = (html) => `<p style="margin:0 0 14px;">${html}</p>`;

/** Hauptknopf. */
export const knopf = (href, text) =>
  `<p style="margin:4px 0 18px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${FARBE.akzent};color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:999px;">${escapeHtml(text)}</a></p>`;

/** Hervorgehobener Kasten, z. B. „So geht es weiter“. */
export const kasten = (ueberschrift, html) =>
  `<div style="background:${FARBE.flaeche};border:1px solid ${FARBE.rand};border-radius:10px;padding:14px 16px;margin:18px 0;">
  <b style="display:block;margin-bottom:6px;color:${FARBE.akzentDunkel};">${escapeHtml(ueberschrift)}</b><span style="color:#312e81;">${html}</span></div>`;

/** Link im Fließtext. */
export const link = (href, text) => `<a href="${escapeHtml(href)}" style="color:${FARBE.akzent};">${escapeHtml(text ?? href)}</a>`;

/** Freitext (Absätze, Zeilen, Links) sicher in HTML. */
export function textZuHtml(text) {
  return String(text ?? "")
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((a) => {
      const sicher = escapeHtml(a).replace(/\n/g, "<br>");
      return absatz(sicher.replace(/https:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:${FARBE.akzent};">${u}</a>`));
    })
    .join("");
}

/** Textfassung aus dem HTML (für den `text`-Teil der Mail). */
export function alsText(html) {
  return String(html)
    .replace(/<div style="display:none[\s\S]*?<\/div>/, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, t) => {
      const sichtbar = t.replace(/<[^>]+>/g, "").trim();
      return sichtbar && sichtbar !== href ? `${sichtbar} (${href})` : href;
    })
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/(p|h1|div|tr|li)>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#847;|&zwnj;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split("\n").map((z) => z.trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
