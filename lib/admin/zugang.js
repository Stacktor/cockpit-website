/**
 * Zugangsschutz fürs Admin-Portal — geteilt von allen /api/admin/*-Routen
 * (über functions/api/admin/_middleware.js).
 *
 *   A) Cloudflare Access (empfohlen): Anwendung für /admin UND /api/admin,
 *      dazu ACCESS_TEAM_DOMAIN und ACCESS_AUD im Pages-Projekt. Geprüft wird das
 *      signierte JWT (RS256, Aussteller, Zielgruppe, Ablauf) — nie bloße Kopfzeilen.
 *   B) ADMIN_TOKEN (Notlösung): als Kopfzeile X-Admin-Token oder ?token=…
 *
 * Ohne beides liefert das Portal nichts aus (fail-closed).
 */

export async function pruefeZugang(request, env) {
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
export async function pruefeAccessJwt(jwt, env) {
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
export function zeitgleich(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let unterschied = 0;
  for (let i = 0; i < a.length; i++) unterschied |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return unterschied === 0;
}

/**
 * Schreibzugriffe nur von der eigenen Seite: Origin (bzw. Referer) muss zur
 * aufgerufenen Adresse passen, und der Körper muss JSON sein. Schützt gegen
 * Formulare fremder Seiten, die das Access-Cookie mitschicken würden.
 */
export function gleicherUrsprung(request) {
  const eigen = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin) return origin === eigen;
  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      return new URL(referer).origin === eigen;
    } catch {
      return false;
    }
  }
  return false;
}

export function json(status, koerper) {
  return new Response(JSON.stringify(koerper), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
