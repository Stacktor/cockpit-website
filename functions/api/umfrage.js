/**
 * Preis-Umfrage — Cloudflare Pages Function
 *
 * Nimmt die Antworten von /umfrage.html entgegen. Alpha-Tester sagen, was ihnen
 * cockpit Pro wert wäre (Preis-Sensitivitäts-Fragen nach Van Westendorp plus
 * bevorzugtes Bezahlmodell). Die Auswertung steht im Admin-Portal.
 *
 * Nutzt dieselben Einstellungen wie die Alpha-Anmeldung (siehe alpha.js):
 *
 *   ALPHA            KV-Namespace  EMPFOHLEN  Speichert die Antworten unter
 *                                            „umfrage:<mail>". Ohne KV gibt es
 *                                            keine Auswertung im Admin-Portal.
 *   RESEND_API_KEY   Secret        optional   Benachrichtigung an Thomas
 *   MAIL_VON / MAIL_AN                        wie in alpha.js
 *
 * Eine Adresse = eine Antwort. Wer erneut abschickt, ersetzt seine vorige
 * Antwort — so zählt jede Person genau einmal.
 */

export async function onRequestPost({ request, env }) {
  try {
    const d = await request.json().catch(() => null);
    if (!d) return antwort(400, "Anfrage konnte nicht gelesen werden.");

    // Bots füllen versteckte Felder aus — freundlich antworten, nichts speichern.
    if (String(d.website || "").trim()) return antwort(200, null, { ok: true });

    const mail = String(d.mail || "").trim().toLowerCase().slice(0, 160);
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(mail))
      return antwort(422, "Diese E-Mail-Adresse sieht nicht gültig aus.");

    const zuBillig = betrag(d.zuBillig, 1000);
    const guenstig = betrag(d.guenstig, 1000);
    const teuer = betrag(d.teuer, 1000);
    const zuTeuer = betrag(d.zuTeuer, 1000);
    if ([zuBillig, guenstig, teuer, zuTeuer].some((x) => x === null))
      return antwort(422, "Bitte beantworte die vier Preisfragen mit einem Betrag zwischen 0 und 1000 €.");

    const modell = String(d.modell || "");
    if (!["einmalig", "jahresabo", "monatsabo", "egal"].includes(modell))
      return antwort(422, "Bitte wähle, wie du am liebsten bezahlen würdest.");

    let monatlich = null;
    if (d.monatlich !== null && d.monatlich !== undefined && d.monatlich !== "") {
      monatlich = betrag(d.monatlich, 100);
      if (monatlich === null) return antwort(422, "Der Monatsbetrag sollte zwischen 0 und 100 € liegen.");
    }

    if (!env.ALPHA && !env.RESEND_API_KEY) {
      return antwort(
        503,
        "Die Umfrage ist gerade noch nicht scharfgeschaltet. " +
          "Schreib mir deine Antworten gern kurz an Kontakt@mesco.cc."
      );
    }

    const eintrag = {
      mail,
      zuBillig,
      guenstig,
      teuer,
      zuTeuer,
      modell,
      monatlich,
      kommentar: String(d.kommentar || "").trim().slice(0, 2000),
      // Widersprüchliche Reihenfolge (z. B. „zu billig" > „zu teuer") wird nicht
      // abgelehnt, nur markiert — die Auswertung kann sie dann ausklammern.
      stimmig: zuBillig <= guenstig && guenstig <= teuer && teuer <= zuTeuer,
      alphaTeilnehmer: false,
      zeit: new Date().toISOString(),
    };

    let aktualisiert = false;
    if (env.ALPHA) {
      eintrag.alphaTeilnehmer = Boolean(await env.ALPHA.get("alpha:" + mail));
      aktualisiert = Boolean(await env.ALPHA.get("umfrage:" + mail));
      await env.ALPHA.put("umfrage:" + mail, JSON.stringify(eintrag));
    }

    if (env.RESEND_API_KEY) {
      await senden(env.RESEND_API_KEY, {
        from: env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>",
        to: [env.MAIL_AN || "Kontakt@mesco.cc"],
        reply_to: mail,
        subject: `Preis-Umfrage${aktualisiert ? " (aktualisiert)" : ""}: ${mail}`,
        html: mailAnThomas(eintrag),
      }).catch(() => {}); // Die Benachrichtigung ist nett, die Antwort ist wichtiger
    }

    return antwort(200, null, { ok: true, aktualisiert });
  } catch (_) {
    return antwort(500, "Unerwarteter Fehler. Bitte schreib mir direkt an Kontakt@mesco.cc.");
  }
}

// ───────────────────────── Hilfsfunktionen ─────────────────────────

/** Ganzzahliger bzw. halber Euro-Betrag in [0, max] — sonst `null`. */
function betrag(wert, max) {
  const n = Number(wert);
  if (wert === null || wert === "" || !Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n * 2) / 2;
}

function antwort(status, fehler, koerper) {
  return new Response(JSON.stringify(fehler ? { ok: false, fehler } : koerper), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
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

const MODELLE = {
  einmalig: "Einmal kaufen",
  jahresabo: "Jahresabo",
  monatsabo: "Monatsabo",
  egal: "Egal",
};

const mailAnThomas = (e) => `<!DOCTYPE html><html lang="de"><body style="margin:0;padding:24px;background:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#232b36;">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e4e8ee;border-radius:12px;padding:24px 28px;">
  <h1 style="font-size:19px;margin:0 0 14px;color:#0e1218;">Neue Antwort zur Preis-Umfrage</h1>
  <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
    <tr><td style="padding:5px 0;color:#5b6675;width:170px;">E-Mail</td><td>${escape_(e.mail)}${e.alphaTeilnehmer ? " · Alpha-Anmeldung ✓" : ""}</td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">Zu billig ab</td><td>${e.zuBillig} €</td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">Gutes Angebot</td><td>${e.guenstig} €</td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">Teuer ab</td><td>${e.teuer} €</td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">Zu teuer ab</td><td>${e.zuTeuer} €</td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">Bezahlmodell</td><td>${MODELLE[e.modell] || escape_(e.modell)}</td></tr>
    <tr><td style="padding:5px 0;color:#5b6675;">Fair pro Monat (Abo)</td><td>${e.monatlich === null ? "–" : e.monatlich + " €"}</td></tr>
  </table>
  ${e.stimmig ? "" : '<p style="font-size:13px;color:#8a5a00;margin:12px 0 0;">Hinweis: Die vier Preise sind nicht aufsteigend — die Auswertung klammert diese Antwort bei den Preisgrenzen aus.</p>'}
  ${e.kommentar ? `<div style="background:#f6f8fb;border:1px solid #e4e8ee;border-radius:9px;padding:12px 14px;margin:14px 0 0;font-size:14px;">${escape_(e.kommentar).replace(/\n/g, "<br>")}</div>` : ""}
</div></body></html>`;

function escape_(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
