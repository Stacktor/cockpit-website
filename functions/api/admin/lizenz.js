/**
 * Lizenzverwaltung — schreibende Aktionen auf Lemon-Squeezy-Lizenzen.
 *
 * Unterstützte Aktionen (POST, JSON):
 *   { id, aktion: "sperren"     }              Lizenz deaktivieren
 *   { id, aktion: "entsperren"  }              Lizenz wieder freigeben
 *   { id, aktion: "verlaengern", tage: 365 }   Ablaufdatum nach hinten schieben
 *   { id, aktion: "unbefristet" }              Ablaufdatum entfernen
 *   { id, aktion: "geraete", limit: 5 }        Anzahl erlaubter Geräte ändern
 *
 * Schutz: identisch zur Übersicht — Cloudflare Access (JWT geprüft, siehe
 * uebersicht.js) ODER ADMIN_TOKEN.
 * Ohne beides passiert nichts (fail-closed).
 *
 * Der API-Schlüssel bleibt serverseitig. Der Browser schickt nur Absicht,
 * niemals Zugangsdaten.
 */

const LS = "https://api.lemonsqueezy.com/v1/license-keys";

export async function onRequestPost({ request, env }) {
  const wache = await pruefeZugang(request, env);
  if (!wache.erlaubt) return json(wache.status, { fehler: wache.grund });

  if (!env.LEMONSQUEEZY_API_KEY)
    return json(503, {
      fehler:
        "LEMONSQUEEZY_API_KEY ist nicht hinterlegt — Lizenzen lassen sich nicht ändern.",
    });

  const d = await request.json().catch(() => null);
  if (!d || !d.id || !d.aktion)
    return json(400, { fehler: "Es fehlen Angaben (id, aktion)." });

  const id = String(d.id).replace(/[^0-9]/g, "");
  if (!id) return json(400, { fehler: "Ungültige Lizenz-ID." });

  // ── Aktion in Attribute übersetzen ────────────────────────────────
  let attribute;
  let beschreibung;

  switch (d.aktion) {
    case "sperren":
      attribute = { disabled: true };
      beschreibung = "gesperrt";
      break;

    case "entsperren":
      attribute = { disabled: false };
      beschreibung = "wieder freigegeben";
      break;

    case "unbefristet":
      attribute = { expires_at: null };
      beschreibung = "auf unbefristet gesetzt";
      break;

    case "verlaengern": {
      const tage = Math.min(3650, Math.max(1, Number(d.tage) || 365));
      // Ab heute rechnen, wenn bereits abgelaufen — sonst ab bisherigem Ende.
      const jetzt = Date.now();
      const bisher = d.bisherAblauf ? new Date(d.bisherAblauf).getTime() : 0;
      const basis = bisher > jetzt ? bisher : jetzt;
      attribute = { expires_at: new Date(basis + tage * 864e5).toISOString() };
      beschreibung = `um ${tage} Tage verlängert`;
      break;
    }

    case "geraete": {
      const limit = Math.min(100, Math.max(1, Number(d.limit) || 3));
      attribute = { activation_limit: limit };
      beschreibung = `auf ${limit} Geräte gesetzt`;
      break;
    }

    default:
      return json(400, { fehler: "Unbekannte Aktion." });
  }

  // ── An Lemon Squeezy schicken ─────────────────────────────────────
  const r = await fetch(`${LS}/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: { type: "license-keys", id, attributes: attribute },
    }),
  });

  const antwort = await r.json().catch(() => ({}));

  if (!r.ok) {
    const grund =
      (antwort.errors && antwort.errors[0] && antwort.errors[0].detail) ||
      `Lemon Squeezy antwortete mit ${r.status}`;
    return json(r.status, { fehler: grund });
  }

  const a = (antwort.data && antwort.data.attributes) || {};
  return json(200, {
    ok: true,
    meldung: `Lizenz ${beschreibung}.`,
    lizenz: {
      id,
      status: a.status,
      genutzt: a.activation_usage,
      limit: a.activation_limit,
      laeuftAb: a.expires_at,
      deaktiviert: a.disabled,
    },
  });
}

// ───────────────────────── geteilt mit uebersicht.js ─────────────────────────

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

function zeitgleich(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let u = 0;
  for (let i = 0; i < a.length; i++) u |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return u === 0;
}

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
