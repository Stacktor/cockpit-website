import { escapeHtml } from "./daten.js";

/** Einfacher Mail-Rahmen im Stil der Website (wie die Alpha-Bestätigung). */
export function rahmen(inhalt) {
  return `<!DOCTYPE html><html lang="de"><body style="margin:0;padding:0;background:#f6f8fb;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:32px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e4e8ee;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:26px 30px 0;"><div style="font-size:18px;font-weight:700;letter-spacing:-.4px;color:#0e1218;">Bewerbungs-<span style="color:#1f5eff;">Cockpit</span></div></td></tr>
<tr><td style="padding:18px 30px 30px;font-size:15px;line-height:1.65;color:#232b36;">${inhalt}</td></tr>
<tr><td style="padding:16px 30px;border-top:1px solid #e4e8ee;font-size:12px;color:#5b6675;">
<a href="https://cockpit.mesco.cc" style="color:#5b6675;">cockpit.mesco.cc</a> · <a href="https://cockpit.mesco.cc/impressum/" style="color:#5b6675;">Impressum</a> · <a href="https://cockpit.mesco.cc/datenschutz/" style="color:#5b6675;">Datenschutz</a>
</td></tr></table></td></tr></table></body></html>`;
}

/** Freitext (Absätze, Links) sicher in HTML umwandeln. */
export function textZuHtml(text) {
  return String(text)
    .trim()
    .split(/\n{2,}/)
    .map((absatz) => {
      const sicher = escapeHtml(absatz).replace(/\n/g, "<br>");
      const mitLinks = sicher.replace(/https:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#1f5eff;">${u}</a>`);
      return `<p style="margin:0 0 14px;">${mitLinks}</p>`;
    })
    .join("");
}
