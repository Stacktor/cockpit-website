/**
 * Polar (polar.sh) als Zahlungsanbieter, seit Oktober 2026 (Lemon Squeezy ist gesperrt).
 *
 * - Neue Lizenzschlüssel beginnen mit `COCKPIT-`. Ältere Schlüssel (UUID ohne Präfix) stammen von
 *   Lemon Squeezy und laufen über die bisherigen Wege weiter.
 * - Die öffentliche Customer-Portal-API (`/v1/customer-portal/license-keys/*`) braucht kein Token;
 *   Admin und Geräteliste nutzen das Organisations-Token `POLAR_ACCESS_TOKEN` aus dem Tresor.
 * - `POLAR_SERVER` = `sandbox` (Test-Zahlungen) oder `production`. Standard: production.
 */

export const istPolarSchluessel = (s) => /^cockpit-/i.test(String(s || "").trim());

/** Lizenz-IDs: Lemon Squeezy vergibt Zahlen, Polar UUIDs. Alles andere wird verworfen. */
export function lizenzId(roh) {
  const s = String(roh ?? "").trim();
  if (/^\d+$/.test(s)) return s;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s.toLowerCase();
  return "";
}

export const istPolarId = (id) => /-/.test(String(id || ""));

export function polarBasis(env) {
  return String(env.POLAR_SERVER || "").toLowerCase() === "sandbox" ? "https://sandbox-api.polar.sh/v1" : "https://api.polar.sh/v1";
}

/** Organisations-ID für die öffentliche API (nicht geheim). */
export const polarOrg = (env) => String(env.POLAR_ORG_ID || "").trim();

async function holen(url, init) {
  try {
    const r = await fetch(url, init);
    const text = await r.text();
    let daten = null;
    try {
      daten = text ? JSON.parse(text) : null;
    } catch {
      daten = null;
    }
    return { ok: r.ok, status: r.status, daten };
  } catch (e) {
    return { ok: false, status: 0, daten: null, fehler: String(e) };
  }
}

/** Organisations-API mit Token (Admin, Geräteliste). */
export function polar(env, pfad, init = {}) {
  return holen(`${polarBasis(env)}/${pfad}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

/** Öffentliche Customer-Portal-API (ohne Token). `aktion`: validate, activate, deactivate. */
export function polarLizenz(env, aktion, koerper) {
  return holen(`${polarBasis(env)}/customer-portal/license-keys/${aktion}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ organization_id: polarOrg(env), ...koerper }),
  });
}

export function polarFehler(r) {
  if (!r) return "Polar hat nicht geantwortet.";
  if (r.status === 0) return "Polar ist nicht erreichbar.";
  if (r.status === 401 || r.status === 403) return "Polar lehnt das Token ab. Unter Einstellungen prüfen.";
  const d = r.daten?.detail;
  const text = typeof d === "string" ? d : Array.isArray(d) ? d.map((x) => x?.msg).filter(Boolean).join(", ") : "";
  return text ? `Polar: ${text}` : `Polar antwortet mit ${r.status}.`;
}

/** Benefits, deren Schlüssel die Alpha freischalten (kommagetrennt in POLAR_ALPHA_BENEFIT_ID). */
export function alphaBenefits(env) {
  return String(env.POLAR_ALPHA_BENEFIT_ID || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Polar-Lizenz im Format, das Admin und App-Endpunkte bisher von Lemon Squeezy kannten. */
export function polarAnsicht(k, env) {
  const alpha = alphaBenefits(env).includes(String(k.benefit_id || "").toLowerCase());
  const aktiv = Array.isArray(k.activations) ? k.activations.length : null;
  return {
    id: k.id,
    anbieter: "polar",
    schluessel: k.key || "",
    kurz: k.display_key || (k.key ? `…${String(k.key).slice(-8)}` : ""),
    status: k.status === "granted" ? (k.expires_at && new Date(k.expires_at) < new Date() ? "expired" : "active") : k.status === "revoked" ? "expired" : "disabled",
    deaktiviert: k.status === "disabled",
    genutzt: aktiv ?? k.usage ?? null,
    limit: k.limit_activations ?? null,
    kunde: k.customer?.email || null,
    kundenName: k.customer?.name || null,
    produkt: alpha ? "cockpit Alpha" : "cockpit Pro",
    varianteId: k.benefit_id || null,
    bestellung: null,
    testmodus: String(env.POLAR_SERVER || "").toLowerCase() === "sandbox",
    erstellt: k.created_at,
    laeuftAb: k.expires_at,
  };
}

/** Rabattcode bei Polar anlegen. `produkte`: optional nur für diese Produkt-IDs. */
export async function polarRabatt(env, { name, code, prozent, anzahl = 0, produkte = [] }) {
  const r = await polar(env, "discounts/", {
    method: "POST",
    body: JSON.stringify({
      name: String(name || code).slice(0, 60),
      code,
      type: "percentage",
      basis_points: prozent * 100,
      duration: "once",
      organization_id: polarOrg(env),
      ...(anzahl > 0 ? { max_redemptions: anzahl } : {}),
      ...(produkte.length ? { products: produkte } : {}),
    }),
  });
  return r;
}

