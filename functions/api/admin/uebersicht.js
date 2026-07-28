/**
 * Admin-Übersicht — sammelt alle Kennzahlen an einer Stelle.
 *
 * WICHTIG ZUR SICHERHEIT
 * ----------------------
 * Hier laufen Kundendaten zusammen. Der Endpunkt ist deshalb **fail-closed**:
 * Ohne eingerichteten Schutz liefert er nichts aus, sondern erklärt, was fehlt.
 *
 * Zwei Wege, ihn zu schützen — mindestens einer muss aktiv sein:
 *
 *   A) Cloudflare Access (empfohlen, kostenlos bis 50 Nutzer)
 *      Zero Trust → Access → Applications → Self-hosted
 *      Domain: cockpit.mesco.cc, Pfad: /admin
 *      Richtlinie: E-Mail = Thomas.grf@protonmail.com, One-Time-PIN
 *      Cloudflare setzt dann den Kopf `Cf-Access-Authenticated-User-Email`.
 *
 *   B) ADMIN_TOKEN (Notlösung, wenn Access nicht geht)
 *      Ein langes Zufallswort als Secret hinterlegen und beim Aufruf
 *      als `?token=…` mitgeben. Schwächer, weil der Wert in der Adresszeile steht.
 *
 * Alle API-Schlüssel bleiben ausschließlich hier auf dem Server. Sie werden
 * niemals an den Browser ausgeliefert — das Portal sieht nur fertige Zahlen.
 *
 * Optionale Secrets (jede Kachel funktioniert unabhängig):
 *   RESEND_API_KEY        Mailversand-Statistik und Kontaktliste
 *   LEMONSQUEEZY_API_KEY  Lizenzen, Bestellungen, Umsatz
 *   CF_ANALYTICS_TOKEN    Seitenaufrufe (API-Token mit Analytics-Leserecht)
 *   CF_ACCOUNT_ID         Konto-ID für die Analytics-Abfrage
 *   ALPHA (KV)            Alpha-Anmeldungen
 */

export async function onRequestGet({ request, env }) {
  // ── Zugang prüfen ──────────────────────────────────────────────────
  const wache = pruefeZugang(request, env);
  if (!wache.erlaubt) return json(wache.status, { fehler: wache.grund });

  // Jede Quelle einzeln — eine kaputte darf die anderen nicht mitreißen
  const [alpha, resend, lemon, aufrufe] = await Promise.all([
    holeAlpha(env).catch((e) => fehlerKachel(e)),
    holeResend(env).catch((e) => fehlerKachel(e)),
    holeLemon(env).catch((e) => fehlerKachel(e)),
    holeAufrufe(env).catch((e) => fehlerKachel(e)),
  ]);

  return json(200, {
    stand: new Date().toISOString(),
    benutzer: wache.benutzer,
    alpha,
    resend,
    lemon,
    aufrufe,
  });
}

// ───────────────────────── Zugangsschutz ─────────────────────────

function pruefeZugang(request, env) {
  const mail = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (mail) return { erlaubt: true, benutzer: mail };

  if (env.ADMIN_TOKEN) {
    // Kopfzeile bevorzugt — steht dann nicht im Browserverlauf oder in Protokollen
    const gegeben =
      request.headers.get("X-Admin-Token") ||
      new URL(request.url).searchParams.get("token") ||
      "";
    if (zeitgleich(gegeben, env.ADMIN_TOKEN))
      return { erlaubt: true, benutzer: "Token-Zugang" };
    return { erlaubt: false, status: 401, grund: "Zugang verweigert." };
  }

  return {
    erlaubt: false,
    status: 503,
    grund:
      "Das Portal ist noch ungeschützt und liefert deshalb keine Daten aus. " +
      "Richte Cloudflare Access für /admin ein — oder hinterlege ersatzweise " +
      "das Secret ADMIN_TOKEN.",
  };
}

/** Vergleich mit gleichbleibender Laufzeit — verrät nichts über den Inhalt. */
function zeitgleich(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let unterschied = 0;
  for (let i = 0; i < a.length; i++) unterschied |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return unterschied === 0;
}

// ───────────────────────── Alpha-Anmeldungen ─────────────────────────

async function holeAlpha(env) {
  if (!env.ALPHA)
    return hinweisKachel("KV-Namespace ALPHA nicht verbunden — keine Anmeldeliste.");

  const liste = await env.ALPHA.list({ prefix: "alpha:", limit: 200 });
  const schluessel = liste.keys.map((k) => k.name).filter((n) => n !== "alpha:anzahl");

  const eintraege = (
    await Promise.all(
      schluessel.map(async (k) => {
        try {
          return JSON.parse((await env.ALPHA.get(k)) || "null");
        } catch (_) {
          return null;
        }
      })
    )
  ).filter(Boolean);

  eintraege.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));

  const proSystem = {};
  eintraege.forEach((e) => (proSystem[e.os] = (proSystem[e.os] || 0) + 1));

  const grenze = Date.now() - 7 * 864e5;
  return {
    ok: true,
    gesamt: eintraege.length,
    plaetze: 30,
    frei: Math.max(0, 30 - eintraege.length),
    letzte7Tage: eintraege.filter((e) => new Date(e.zeit).getTime() > grenze).length,
    proSystem,
    eintraege: eintraege.slice(0, 50),
  };
}

// ───────────────────────── Resend ─────────────────────────

async function holeResend(env) {
  if (!env.RESEND_API_KEY)
    return hinweisKachel("RESEND_API_KEY fehlt — keine Mailstatistik.");

  const kopf = { Authorization: `Bearer ${env.RESEND_API_KEY}` };

  const [mails, listen, domains] = await Promise.all([
    fetch("https://api.resend.com/emails?limit=100", { headers: kopf })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch("https://api.resend.com/audiences", { headers: kopf })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch("https://api.resend.com/domains", { headers: kopf })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const alle = (mails && mails.data) || [];
  const nachStatus = {};
  alle.forEach((m) => {
    const s = m.last_event || m.status || "unbekannt";
    nachStatus[s] = (nachStatus[s] || 0) + 1;
  });

  const grenze = Date.now() - 30 * 864e5;
  return {
    ok: true,
    gesendet: alle.length,
    letzte30Tage: alle.filter((m) => new Date(m.created_at).getTime() > grenze).length,
    nachStatus,
    zugestellt: nachStatus.delivered || 0,
    fehlgeschlagen: (nachStatus.bounced || 0) + (nachStatus.failed || 0),
    listen: ((listen && listen.data) || []).map((a) => ({ id: a.id, name: a.name })),
    domains: ((domains && domains.data) || []).map((d) => ({
      name: d.name,
      status: d.status,
      region: d.region,
    })),
    letzte: alle.slice(0, 15).map((m) => ({
      an: Array.isArray(m.to) ? m.to[0] : m.to,
      betreff: m.subject,
      status: m.last_event || m.status,
      zeit: m.created_at,
    })),
  };
}

// ───────────────────────── Lemon Squeezy ─────────────────────────

async function holeLemon(env) {
  if (!env.LEMONSQUEEZY_API_KEY)
    return hinweisKachel("LEMONSQUEEZY_API_KEY fehlt — keine Lizenz- und Umsatzdaten.");

  const kopf = {
    Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
    Accept: "application/vnd.api+json",
  };

  const [lizenzen, bestellungen] = await Promise.all([
    fetch("https://api.lemonsqueezy.com/v1/license-keys?page[size]=100", { headers: kopf })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch("https://api.lemonsqueezy.com/v1/orders?page[size]=50&sort=-createdAt", {
      headers: kopf,
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const lz = (lizenzen && lizenzen.data) || [];
  const be = (bestellungen && bestellungen.data) || [];

  const nachStatus = {};
  lz.forEach((l) => {
    const s = l.attributes.status || "unbekannt";
    nachStatus[s] = (nachStatus[s] || 0) + 1;
  });

  const cent = be.reduce((s, o) => s + (o.attributes.total || 0), 0);
  const grenze = Date.now() - 30 * 864e5;

  return {
    ok: true,
    lizenzenGesamt: lz.length,
    lizenzenNachStatus: nachStatus,
    bestellungen: be.length,
    umsatzGesamt: (cent / 100).toFixed(2),
    umsatz30Tage: (
      be
        .filter((o) => new Date(o.attributes.created_at).getTime() > grenze)
        .reduce((s, o) => s + (o.attributes.total || 0), 0) / 100
    ).toFixed(2),
    letzteLizenzen: lz.slice(0, 60).map((l) => ({
      id: l.id,
      schluessel: l.attributes.key_short || (l.attributes.key || "").slice(0, 8) + "…",
      status: l.attributes.status,
      deaktiviert: !!l.attributes.disabled,
      genutzt: l.attributes.activation_usage,
      limit: l.attributes.activation_limit,
      kunde: l.attributes.user_email,
      kundenName: l.attributes.user_name,
      produkt: l.attributes.product_name,
      erstellt: l.attributes.created_at,
      laeuftAb: l.attributes.expires_at,
    })),
  };
}

// ───────────────────────── Seitenaufrufe ─────────────────────────

async function holeAufrufe(env) {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID)
    return hinweisKachel(
      "CF_ANALYTICS_TOKEN oder CF_ACCOUNT_ID fehlt — keine Zugriffszahlen."
    );

  const seit = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const frage = `
    query { viewer { accounts(filter: {accountTag: "${env.CF_ACCOUNT_ID}"}) {
      total: pagesFunctionsInvocationsAdaptiveGroups(
        limit: 1000, filter: {date_geq: "${seit}"}
      ) { sum { requests } dimensions { date } }
    } } }`;

  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: frage }),
  });

  if (!r.ok) return fehlerKachel(new Error("Analytics-API: " + r.status));
  const j = await r.json();
  const gruppen =
    (j.data && j.data.viewer && j.data.viewer.accounts[0] &&
      j.data.viewer.accounts[0].total) || [];

  const proTag = gruppen.map((g) => ({
    tag: g.dimensions.date,
    anfragen: g.sum.requests,
  }));

  return {
    ok: true,
    gesamt30Tage: proTag.reduce((s, t) => s + t.anfragen, 0),
    proTag: proTag.slice(-30),
    hinweis:
      "Gezählt werden Aufrufe der Formular-Schnittstelle. Für echte Seitenaufrufe " +
      "empfiehlt sich Cloudflare Web Analytics — cookiefrei und ohne Einwilligungsbanner.",
  };
}

// ───────────────────────── Hilfsfunktionen ─────────────────────────

const hinweisKachel = (text) => ({ ok: false, art: "hinweis", text });
const fehlerKachel = (e) => ({ ok: false, art: "fehler", text: String(e).slice(0, 160) });

function json(status, koerper) {
  return new Response(JSON.stringify(koerper), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
