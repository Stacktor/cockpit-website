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
 * Schutz: identisch zur Übersicht — Cloudflare Access ODER ADMIN_TOKEN.
 * Ohne beides passiert nichts (fail-closed).
 *
 * Der API-Schlüssel bleibt serverseitig. Der Browser schickt nur Absicht,
 * niemals Zugangsdaten.
 */

const LS = "https://api.lemonsqueezy.com/v1/license-keys";

export async function onRequestPost({ request, env }) {
  const wache = pruefeZugang(request, env);
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

function pruefeZugang(request, env) {
  const mail = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (mail) return { erlaubt: true, benutzer: mail };

  if (env.ADMIN_TOKEN) {
    const url = new URL(request.url);
    const gegeben =
      request.headers.get("X-Admin-Token") || url.searchParams.get("token") || "";
    if (zeitgleich(gegeben, env.ADMIN_TOKEN))
      return { erlaubt: true, benutzer: "Token-Zugang" };
    return { erlaubt: false, status: 401, grund: "Zugang verweigert." };
  }

  return {
    erlaubt: false,
    status: 503,
    grund:
      "Das Portal ist ungeschützt und führt deshalb keine Änderungen aus. " +
      "Richte Cloudflare Access ein oder hinterlege ADMIN_TOKEN.",
  };
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
