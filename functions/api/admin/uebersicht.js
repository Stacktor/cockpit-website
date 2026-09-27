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
 *      Domain: cockpit.mesco.cc, Pfade: /admin UND /api/admin
 *      (beide — sonst erreicht man die Schnittstelle an Access vorbei)
 *      Richtlinie: E-Mail = Thomas.grf@protonmail.com, One-Time-PIN
 *      Dann im Pages-Projekt zwei Variablen hinterlegen:
 *        ACCESS_TEAM_DOMAIN  z. B. "meinteam.cloudflareaccess.com"
 *                            (Zero Trust → Settings → Custom Pages/Team-Domain)
 *        ACCESS_AUD          „Application Audience (AUD) Tag" der Anwendung
 *                            (Access → Applications → Anwendung → Overview)
 *      Cloudflare hängt jeder durchgelassenen Anfrage ein signiertes JWT an;
 *      diese Funktion prüft Signatur, Zielgruppe und Ablaufzeit selbst. Bloße
 *      Kopfzeilen (etwa die E-Mail) werden nicht mehr geglaubt.
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
 *   ALPHA (KV)            Alpha-Anmeldungen und Preis-Umfrage
 */

export async function onRequestGet({ request, env }) {
  // ── Zugang prüfen ──────────────────────────────────────────────────
  const wache = await pruefeZugang(request, env);
  if (!wache.erlaubt) return json(wache.status, { fehler: wache.grund });

  // Jede Quelle einzeln — eine kaputte darf die anderen nicht mitreißen
  const [alpha, umfrage, resend, lemon, aufrufe] = await Promise.all([
    holeAlpha(env).catch((e) => fehlerKachel(e)),
    holeUmfrage(env).catch((e) => fehlerKachel(e)),
    holeResend(env).catch((e) => fehlerKachel(e)),
    holeLemon(env).catch((e) => fehlerKachel(e)),
    holeAufrufe(env).catch((e) => fehlerKachel(e)),
  ]);

  return json(200, {
    stand: new Date().toISOString(),
    benutzer: wache.benutzer,
    alpha,
    umfrage,
    resend,
    lemon,
    aufrufe,
  });
}

// ───────────────────────── Zugangsschutz ─────────────────────────

async function pruefeZugang(request, env) {
  const url = new URL(request.url);

  // ── Weg A: Cloudflare Access ──────────────────────────────────────
  // Access hängt jeder Anfrage, die es durchgelassen hat, ein von Cloudflare
  // signiertes JWT an (`Cf-Access-Jwt-Assertion`). Kopfzeilen allein beweisen
  // aber nichts: Wer den Endpunkt an Access vorbei erreicht — über die
  // *.pages.dev-Adresse oder weil die Access-Anwendung `/api/admin` nicht mit
  // abdeckt —, kann sie selbst mitschicken. Deshalb zählt nur ein JWT, dessen
  // Signatur, Zielgruppe (AUD) und Ablaufzeit hier geprüft wurden. Die reine
  // E-Mail-Kopfzeile wird nicht mehr akzeptiert.
  //
  // Nötig: ACCESS_TEAM_DOMAIN und ACCESS_AUD (siehe Kopf von uebersicht.js).
  // Fehlen sie, gilt Weg A als nicht eingerichtet (fail-closed).
  let accessHinweis = null;
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (jwt) {
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
      accessHinweis =
        "Cloudflare Access ist aktiv, aber ACCESS_TEAM_DOMAIN und ACCESS_AUD fehlen — " +
        "ohne sie lässt sich die Anmeldung nicht prüfen.";
    } else {
      const daten = await pruefeAccessJwt(jwt, env).catch(() => null);
      if (daten)
        return { erlaubt: true, benutzer: daten.email || daten.common_name || "Access-Zugang" };
      accessHinweis =
        "Die Access-Anmeldung ließ sich nicht bestätigen (abgelaufen oder ungültig). " +
        "Seite neu laden und erneut anmelden.";
    }
  }

  // ── Weg B: ADMIN_TOKEN ────────────────────────────────────────────
  if (env.ADMIN_TOKEN) {
    const gegeben =
      request.headers.get("X-Admin-Token") || url.searchParams.get("token") || "";
    if (zeitgleich(gegeben, env.ADMIN_TOKEN))
      return { erlaubt: true, benutzer: "Token-Zugang" };
    return {
      erlaubt: false,
      status: 401,
      grund:
        accessHinweis ||
        "Zugang verweigert. Bist du über Cloudflare Access angemeldet? " +
          "Sonst einmal mit ?token=… aufrufen.",
    };
  }

  return {
    erlaubt: false,
    status: 503,
    grund:
      accessHinweis ||
      "Das Portal ist noch ungeschützt und liefert deshalb keine Daten aus. " +
        "Richte Cloudflare Access ein (inkl. ACCESS_TEAM_DOMAIN und ACCESS_AUD) — " +
        "oder hinterlege das Secret ADMIN_TOKEN.",
  };
}

/**
 * Prüft ein Cloudflare-Access-JWT vollständig: RS256-Signatur gegen die
 * öffentlichen Schlüssel des Teams, Aussteller, Zielgruppe und Gültigkeit.
 * Gibt den Inhalt zurück — oder `null`, wenn irgendetwas nicht stimmt.
 */
async function pruefeAccessJwt(jwt, env) {
  const [kopfTeil, inhaltTeil, signaturTeil] = jwt.split(".");
  if (!kopfTeil || !inhaltTeil || !signaturTeil) return null;

  const kopf = JSON.parse(base64Text(kopfTeil));
  const inhalt = JSON.parse(base64Text(inhaltTeil));
  if (kopf.alg !== "RS256" || !kopf.kid) return null;

  const team = String(env.ACCESS_TEAM_DOMAIN)
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  // Schlüssel werden rotiert — fehlt die kid im Cache, einmal frisch laden.
  let jwk = (await accessSchluessel(team, false)).find((k) => k.kid === kopf.kid);
  if (!jwk) jwk = (await accessSchluessel(team, true)).find((k) => k.kid === kopf.kid);
  if (!jwk) return null;

  const schluessel = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const echt = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    schluessel,
    base64Bytes(signaturTeil),
    new TextEncoder().encode(kopfTeil + "." + inhaltTeil)
  );
  if (!echt) return null;

  const jetzt = Math.floor(Date.now() / 1000);
  if (typeof inhalt.exp !== "number" || inhalt.exp < jetzt) return null;
  if (typeof inhalt.nbf === "number" && inhalt.nbf > jetzt + 60) return null;
  if (inhalt.iss !== `https://${team}`) return null;
  const zielgruppe = Array.isArray(inhalt.aud) ? inhalt.aud : [inhalt.aud];
  if (!zielgruppe.includes(env.ACCESS_AUD)) return null;

  return inhalt;
}

/** Öffentliche Schlüssel des Access-Teams, eine Stunde gemerkt. */
const schluesselCache = new Map();
async function accessSchluessel(team, frisch) {
  const gemerkt = schluesselCache.get(team);
  if (!frisch && gemerkt && Date.now() - gemerkt.zeit < 3600e3) return gemerkt.keys;
  const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error("Access-Schlüssel: " + r.status);
  const j = await r.json();
  const keys = Array.isArray(j.keys) ? j.keys : [];
  schluesselCache.set(team, { zeit: Date.now(), keys });
  return keys;
}

function base64Bytes(teil) {
  const b64 = teil.replace(/-/g, "+").replace(/_/g, "/");
  const roh = atob(b64 + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(roh, (z) => z.charCodeAt(0));
}

function base64Text(teil) {
  return new TextDecoder().decode(base64Bytes(teil));
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

// ───────────────────────── Preis-Umfrage ─────────────────────────

/**
 * Wertet die Preis-Umfrage (/umfrage.html) aus. Die vier Preisfragen folgen
 * Van Westendorp; daraus ergeben sich der „optimale" Preis und der Bereich,
 * den die Befragten noch akzeptieren. Mit wenigen Antworten sind das
 * Richtwerte — belastbar wird es ab etwa 20 Antworten.
 */
async function holeUmfrage(env) {
  if (!env.ALPHA)
    return hinweisKachel("KV-Namespace ALPHA nicht verbunden — keine Umfrage-Antworten.");

  const liste = await env.ALPHA.list({ prefix: "umfrage:", limit: 500 });
  const eintraege = (
    await Promise.all(
      liste.keys.map(async (k) => {
        try {
          return JSON.parse((await env.ALPHA.get(k.name)) || "null");
        } catch (_) {
          return null;
        }
      })
    )
  ).filter(Boolean);
  eintraege.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));

  const modelle = { einmalig: 0, jahresabo: 0, monatsabo: 0, egal: 0 };
  eintraege.forEach((e) => {
    if (e.modell in modelle) modelle[e.modell]++;
  });

  // Nur in sich stimmige Antworten (aufsteigende Preise) gehen in die Preisgrenzen ein.
  const stimmig = eintraege.filter((e) => e.stimmig);
  const monatlich = eintraege.map((e) => e.monatlich).filter((x) => typeof x === "number");

  return {
    ok: true,
    gesamt: eintraege.length,
    stimmig: stimmig.length,
    ausAlpha: eintraege.filter((e) => e.alphaTeilnehmer).length,
    median: {
      zuBillig: median(stimmig.map((e) => e.zuBillig)),
      guenstig: median(stimmig.map((e) => e.guenstig)),
      teuer: median(stimmig.map((e) => e.teuer)),
      zuTeuer: median(stimmig.map((e) => e.zuTeuer)),
      monatlich: median(monatlich),
    },
    preispunkte: vanWestendorp(stimmig),
    modelle,
    eintraege: eintraege.slice(0, 100),
  };
}

function median(werte) {
  if (!werte.length) return null;
  const w = [...werte].sort((a, b) => a - b);
  const m = Math.floor(w.length / 2);
  return w.length % 2 ? w[m] : (w[m - 1] + w[m]) / 2;
}

/**
 * Klassische Van-Westendorp-Schnittpunkte über alle ganzen Euro-Beträge:
 *   optimal   „zu billig" (fallend)  ∩ „zu teuer" (steigend)
 *   untere    „zu billig" (fallend)  ∩ „nicht günstig" (steigend)
 *   obere     „zu teuer" (steigend)  ∩ „nicht teuer" (fallend)
 * `null`, solange es zu wenige Antworten gibt.
 */
function vanWestendorp(antworten) {
  const n = antworten.length;
  if (n < 3) return null;
  const max = Math.ceil(Math.max(...antworten.map((e) => e.zuTeuer), 1));
  const anteil = (bedingung) => antworten.filter(bedingung).length / n;
  const schnitt = (f, g) => {
    let bester = 0;
    let abstand = Infinity;
    for (let p = 0; p <= max; p++) {
      const d = Math.abs(f(p) - g(p));
      if (d < abstand) {
        abstand = d;
        bester = p;
      }
    }
    return bester;
  };
  const zuBillig = (p) => anteil((e) => e.zuBillig >= p);
  const zuTeuer = (p) => anteil((e) => e.zuTeuer <= p);
  const nichtGuenstig = (p) => anteil((e) => e.guenstig < p);
  const nichtTeuer = (p) => anteil((e) => e.teuer > p);
  return {
    optimal: schnitt(zuBillig, zuTeuer),
    untereGrenze: schnitt(zuBillig, nichtGuenstig),
    obereGrenze: schnitt(zuTeuer, nichtTeuer),
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
