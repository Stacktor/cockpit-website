/**
 * Lesen der eigenen Daten aus dem KV (Anmeldungen, Antworten, Fehlerberichte)
 * und kleine Helfer für externe Dienste.
 */

/** Alle Schlüssel mit Präfix (über mehrere Seiten). */
export async function alleSchluessel(env, prefix, max = 5000) {
  if (!env.ALPHA) return [];
  const namen = [];
  let cursor;
  do {
    const r = await env.ALPHA.list({ prefix, cursor, limit: 1000 });
    namen.push(...r.keys.map((k) => k.name));
    cursor = r.list_complete === false ? r.cursor : undefined;
  } while (cursor && namen.length < max);
  return namen;
}

export async function leseAlle(env, namen) {
  const werte = await Promise.all(
    namen.map(async (k) => {
      try {
        const v = JSON.parse((await env.ALPHA.get(k)) || "null");
        return v ? { _key: k, ...v } : null;
      } catch {
        return null;
      }
    }),
  );
  return werte.filter(Boolean);
}

/** Alpha-Anmeldungen (nur „alpha:<mail>“, keine Zähler). */
export async function anmeldungen(env) {
  const namen = (await alleSchluessel(env, "alpha:")).filter((n) => n.includes("@"));
  const liste = await leseAlle(env, namen);
  for (const e of liste) e.status ||= "neu";
  return liste.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
}

/** Belegte Plätze = alle, die nicht auf der Warteliste stehen oder abgelehnt sind. */
export const belegtStatus = (s) => !["warteliste", "abgelehnt"].includes(s || "neu");

export async function zaehleBelegt(env) {
  const liste = await anmeldungen(env);
  const belegt = liste.filter((e) => belegtStatus(e.status)).length;
  const warte = liste.filter((e) => e.status === "warteliste").length;
  if (env.ALPHA) {
    await env.ALPHA.put("alpha:anzahl", String(belegt));
    await env.ALPHA.put("alpha:warteliste", String(warte));
  }
  return belegt;
}

export async function antworten(env) {
  return leseAlle(env, await alleSchluessel(env, "survey:resp:"));
}

export async function fehlerberichte(env) {
  const liste = await leseAlle(env, await alleSchluessel(env, "bug:"));
  return liste.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
}

/** Tageszählung der letzten `tage` Tage aus ISO-Zeitstempeln. */
export function proTag(zeiten, tage = 30) {
  const heute = new Date();
  const tabelle = [];
  for (let i = tage - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), heute.getUTCDate() - i));
    tabelle.push({ tag: d.toISOString().slice(0, 10), anzahl: 0 });
  }
  const index = new Map(tabelle.map((t, i) => [t.tag, i]));
  for (const z of zeiten) {
    const i = index.get(String(z).slice(0, 10));
    if (i !== undefined) tabelle[i].anzahl++;
  }
  return tabelle;
}

export function zaehle(werte) {
  const m = {};
  for (const w of werte) {
    const k = w || "—";
    m[k] = (m[k] || 0) + 1;
  }
  return Object.entries(m)
    .map(([name, anzahl]) => ({ name, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl);
}

// ───────────── externe Dienste ─────────────

async function holeJson(url, init) {
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

export function lemon(env, pfad, init = {}) {
  return holeJson(`https://api.lemonsqueezy.com/v1/${pfad}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      ...(init.headers || {}),
    },
  });
}

export function resend(env, pfad, init = {}) {
  return holeJson(`https://api.resend.com/${pfad}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

export function github(env, pfad) {
  return holeJson(`https://api.github.com/${pfad}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "cockpit-admin",
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
    },
  });
}

export function cloudflareGraphql(env, query, variables = {}) {
  return holeJson("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
}

/** Fehlertext aus einer JSON:API-Antwort (Lemon Squeezy). */
export function lsFehler(r) {
  return r.daten?.errors?.[0]?.detail || (r.status ? `Lemon Squeezy antwortete mit ${r.status}.` : "Lemon Squeezy nicht erreichbar.");
}

export const hinweis = (text) => ({ ok: false, art: "hinweis", text });
export const fehler = (text) => ({ ok: false, art: "fehler", text: String(text).slice(0, 200) });

export async function sicher(fn) {
  try {
    return await fn();
  } catch (e) {
    return fehler(e?.message || e);
  }
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
