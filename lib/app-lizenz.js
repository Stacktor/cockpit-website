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
 * Schlüssel mit `COCKPIT-` stammen von Polar (seit Oktober 2026) und werden über dessen
 * öffentliche API geprüft (`polar.js`); Alpha = Benefit in `POLAR_ALPHA_BENEFIT_ID`. Die
 * Lizenz-ID ist dann die UUID des Schlüssels.
 *
 * Ergebnis wird eine Stunde im KV gemerkt (Schlüssel: SHA-256 des Lizenz-
 * schlüssels), damit die 60-Anfragen-pro-Minute-Grenze der API nie greift.
 */

import { mitSchluesseln } from "./admin/tresor.js";
import { alphaBenefits, istPolarSchluessel, polarLizenz } from "./polar.js";

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
 * Prüft Lizenzschlüssel + Instanz bei Lemon Squeezy.
 * `nurAlpha` (Standard): nur Alpha-Lizenzen gelten (Umfragen). Für Fehler-
 * berichte reicht jede gültige Lizenz (`nurAlpha: false`).
 * `instanzPflicht: false` erlaubt die Prüfung nur mit dem Schlüssel, etwa um
 * auf einem neuen Gerät einen Platz freizumachen, wenn das Limit erreicht ist.
 *
 * @returns {Promise<{ok: true, lizenz: {id: string, email: string|null, name: string|null, alpha: boolean}}
 *                  | {ok: false, status: number, fehler: string}>}
 */
export async function pruefeLizenz(env, schluessel, instanz, { nurAlpha = true, instanzPflicht = true } = {}) {
  schluessel = String(schluessel || "").trim();
  instanz = String(instanz || "").trim();
  if (!schluessel || (instanzPflicht && !instanz) || schluessel.length > 100 || instanz.length > 100)
    return { ok: false, status: 400, fehler: "Lizenzangaben fehlen." };

  // Gemerkt wird das Prüfergebnis selbst (gültig/Alpha), nicht die Entscheidung.
  const cacheKey = "lic2:" + (await sha256(schluessel + "|" + instanz));
  let info = null;
  if (env.ALPHA) {
    const gemerkt = await env.ALPHA.get(cacheKey);
    if (gemerkt) {
      try {
        info = JSON.parse(gemerkt);
      } catch {
        info = null;
      }
    }
  }

  if (!info) {
    // Polar-Einstellungen (Server, Organisation, Alpha-Benefit) liegen im Tresor des Admins.
    const neu = istPolarSchluessel(schluessel)
      ? await pruefePolar(await mitSchluesseln(env), schluessel, instanz)
      : await pruefeLemon(schluessel, instanz, env);
    if (!neu) return { ok: false, status: 503, fehler: "Der Lizenzserver ist gerade nicht erreichbar." };
    info = neu;
    // Auch Ablehnungen kurz merken — bremst wiederholte Fehlversuche.
    if (env.ALPHA)
      await env.ALPHA.put(cacheKey, JSON.stringify(info), { expirationTtl: info.gueltig ? CACHE_SEKUNDEN : 600 });
  }

  if (!info.gueltig) return { ok: false, status: 403, fehler: "Diese Lizenz ist nicht (mehr) gültig." };
  if (nurAlpha && !info.alpha)
    return { ok: false, status: 403, fehler: "Umfragen gibt es nur in der Alpha." };
  return { ok: true, lizenz: { ...info.lizenz, alpha: info.alpha } };
}

/** Lemon Squeezy (ältere Schlüssel). `null` bei Netzfehler. */
async function pruefeLemon(schluessel, instanz, env) {
  let antwort;
  try {
    const r = await fetch(LS_VALIDATE, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(instanz ? { license_key: schluessel, instance_id: instanz } : { license_key: schluessel }),
    });
    antwort = await r.json();
  } catch {
    return null;
  }
  return {
    gueltig: Boolean(antwort?.valid),
    alpha: Boolean(antwort?.valid) && istAlpha(antwort.meta, env),
    lizenz: antwort?.valid
      ? {
          id: String(antwort.license_key?.id ?? ""),
          email: antwort.meta?.customer_email ?? null,
          name: antwort.meta?.customer_name ?? null,
        }
      : null,
  };
}

/** Polar (Schlüssel `COCKPIT-…`). `instanz` ist die Aktivierungs-ID des Geräts. `null` bei Netzfehler. */
async function pruefePolar(env, schluessel, instanz) {
  const r = await polarLizenz(env, "validate", instanz ? { key: schluessel, activation_id: instanz } : { key: schluessel });
  if (r.status === 0 || r.status === 429 || r.status >= 500) return null;
  const k = r.ok ? r.daten : null;
  const gueltig = Boolean(k && k.status === "granted" && !(k.expires_at && new Date(k.expires_at) < new Date()));
  return {
    gueltig,
    alpha: gueltig && alphaBenefits(env).includes(String(k.benefit_id || "").toLowerCase()),
    lizenz: gueltig ? { id: String(k.id), email: k.customer?.email ?? null, name: k.customer?.name ?? null } : null,
  };
}

/** Umfragen & Antworten: nur Alpha-Tester. */
export function pruefeAlphaLizenz(env, schluessel, instanz) {
  return pruefeLizenz(env, schluessel, instanz, { nurAlpha: true });
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
