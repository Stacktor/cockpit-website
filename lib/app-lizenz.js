/**
 * Prüft, ob eine Anfrage aus der App von einem Alpha-Tester kommt.
 *
 * Die App schickt Lizenzschlüssel + Instanz-ID (ihre Geräteanmeldung bei
 * Lemon Squeezy). Geprüft wird gegen die öffentliche License-API von Lemon
 * Squeezy (`/v1/licenses/validate`, braucht keinen Store-Schlüssel). Gespeichert
 * wird danach nur die License-Key-ID — nie der Schlüssel selbst.
 *
 * Alpha = Variantenname enthält „alpha“ ODER die Variant-ID steht in
 * `ALPHA_VARIANT_IDS` (kommagetrennt, optional).
 *
 * Ergebnis wird eine Stunde im KV gemerkt (Schlüssel: SHA-256 des Lizenz-
 * schlüssels), damit die 60-Anfragen-pro-Minute-Grenze der API nie greift.
 */

const LS_VALIDATE = "https://api.lemonsqueezy.com/v1/licenses/validate";
const CACHE_SEKUNDEN = 3600;

export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function istAlpha(meta, env) {
  const name = String(meta?.variant_name || "").toLowerCase();
  if (name.includes("alpha")) return true;
  const ids = String(env.ALPHA_VARIANT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(String(meta?.variant_id ?? ""));
}

/**
 * @returns {Promise<{ok: true, lizenz: {id: string, email: string|null, name: string|null}}
 *                  | {ok: false, status: number, fehler: string}>}
 */
export async function pruefeAlphaLizenz(env, schluessel, instanz) {
  schluessel = String(schluessel || "").trim();
  instanz = String(instanz || "").trim();
  if (!schluessel || !instanz || schluessel.length > 100 || instanz.length > 100)
    return { ok: false, status: 400, fehler: "Lizenzangaben fehlen." };

  const cacheKey = "lic:" + (await sha256(schluessel + "|" + instanz));
  if (env.ALPHA) {
    const gemerkt = await env.ALPHA.get(cacheKey);
    if (gemerkt) {
      try {
        return JSON.parse(gemerkt);
      } catch {
        /* neu prüfen */
      }
    }
  }

  let antwort;
  try {
    const r = await fetch(LS_VALIDATE, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ license_key: schluessel, instance_id: instanz }),
    });
    antwort = await r.json();
  } catch {
    return { ok: false, status: 503, fehler: "Der Lizenzserver ist gerade nicht erreichbar." };
  }

  let ergebnis;
  if (!antwort?.valid) {
    ergebnis = { ok: false, status: 403, fehler: "Diese Lizenz ist nicht (mehr) gültig." };
  } else if (!istAlpha(antwort.meta, env)) {
    ergebnis = { ok: false, status: 403, fehler: "Umfragen und Fehlerberichte gibt es nur in der Alpha." };
  } else {
    ergebnis = {
      ok: true,
      lizenz: {
        id: String(antwort.license_key?.id ?? ""),
        email: antwort.meta?.customer_email ?? null,
        name: antwort.meta?.customer_name ?? null,
      },
    };
  }
  // Auch Ablehnungen kurz merken — bremst wiederholte Fehlversuche.
  if (env.ALPHA)
    await env.ALPHA.put(cacheKey, JSON.stringify(ergebnis), {
      expirationTtl: ergebnis.ok ? CACHE_SEKUNDEN : 600,
    });
  return ergebnis;
}

/** Einfaches Stunden-Kontingent je Lizenz (Schutz vor Endlosschleifen/Spam). */
export async function imKontingent(env, lizenzId, art, max) {
  if (!env.ALPHA) return true;
  const stunde = new Date().toISOString().slice(0, 13);
  const key = `rl:${art}:${lizenzId}:${stunde}`;
  const n = Number((await env.ALPHA.get(key)) || "0");
  if (n >= max) return false;
  await env.ALPHA.put(key, String(n + 1), { expirationTtl: 7200 });
  return true;
}

export function json(status, koerper) {
  return new Response(JSON.stringify(koerper), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
