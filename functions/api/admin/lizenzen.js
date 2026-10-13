/**
 * /api/admin/lizenzen — Lizenzen bei Polar (neu, `COCKPIT-…`) und Lemon Squeezy (ältere
 * Schlüssel), ergänzt um eigene Daten. Polar-IDs sind UUIDs, Lemon-Squeezy-IDs Zahlen.
 *   GET  ?id=…  Einzelne Lizenz mit Geräten, letzter App-Prüfung, Notiz,
 *               Verlauf (Audit-Log) und Sync-Speicher; sonst Liste (bis 300,
 *               neueste zuerst) mit letzter App-Prüfung und Notiz
 *   POST { id | ids[], aktion: sperren | entsperren | unbefristet | verlaengern (tage)
 *          | geraete (limit) | geraet-abmelden (instanz = identifier) | notiz (text)
 *          | mail (betreff, text) | sync-leeren }
 *        Mit `ids` (bis 50) als Sammelaktion für sperren, entsperren, verlaengern.
 * Der Admin bekommt den vollständigen Schlüssel (zum Kopieren für Support-Fälle).
 * Er ist durch Cloudflare Access geschützt; geloggt oder gemailt wird der Schlüssel nie.
 */
import { json } from "../../../lib/admin/zugang.js";
import { lemon, leseAlle, alleSchluessel, lsFehler, resend } from "../../../lib/admin/daten.js";
import { leseProtokoll, protokolliere } from "../../../lib/admin/protokoll.js";
import { alsText, escapeHtml, mailHtml, textZuHtml } from "../../../lib/mail/vorlage.js";
import { allesLoeschen, belegtGeteilt, GESAMT_MAX, praefixFuer, SICHERUNG_MAX } from "../../../lib/sync.js";
import { istPolarId, lizenzId, polar, polarAnsicht, polarFehler, polarLizenz, polarOrg } from "../../../lib/polar.js";

const OHNE_ANBIETER = "Weder Polar noch Lemon Squeezy ist verbunden. Trag das Polar-Token unter Einstellungen ein.";

/** Polar-Lizenz samt Aktivierungen (Organisations-Token). */
const polarLizenzLaden = (env, id) => polar(env, `license-keys/${encodeURIComponent(id)}`);

/** Alle Polar-Lizenzen (bis 300, neueste zuerst). */
async function polarListe(env) {
  const alle = [];
  for (let seite = 1; seite <= 3; seite++) {
    const r = await polar(env, `license-keys/?organization_id=${encodeURIComponent(polarOrg(env))}&limit=100&page=${seite}`);
    if (!r.ok) return { fehler: polarFehler(r), status: r.status || 502 };
    alle.push(...(r.daten?.items || []));
    if ((r.daten?.pagination?.max_page ?? 1) <= seite) break;
  }
  alle.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return { liste: alle.map((k) => polarAnsicht(k, env)) };
}

/** Änderungen an einer Polar-Lizenz aus den Aktionen des Admins. */
function polarAenderung(d, bisherAblauf) {
  switch (d.aktion) {
    case "sperren":
      return { felder: { status: "disabled" }, beschreibung: "gesperrt" };
    case "entsperren":
      return { felder: { status: "granted" }, beschreibung: "wieder freigegeben" };
    case "unbefristet":
      return { felder: { expires_at: null }, beschreibung: "auf unbefristet gesetzt" };
    case "verlaengern": {
      const tage = Math.min(3650, Math.max(1, Number(d.tage) || 365));
      const bisher = bisherAblauf ? new Date(bisherAblauf).getTime() : 0;
      const basis = bisher > Date.now() ? bisher : Date.now();
      return { felder: { expires_at: new Date(basis + tage * 864e5).toISOString() }, beschreibung: `um ${tage} Tage verlängert` };
    }
    case "geraete": {
      const limit = Math.min(100, Math.max(1, Number(d.limit) || 3));
      return { felder: { limit_activations: limit }, beschreibung: `auf ${limit} Geräte gesetzt` };
    }
    default:
      return null;
  }
}

async function polarAendern(env, id, d) {
  let bisher = null;
  if (d.aktion === "verlaengern") bisher = (await polarLizenzLaden(env, id)).daten?.expires_at ?? null;
  const a = polarAenderung(d, bisher);
  if (!a) return { fehler: "Unbekannte Aktion.", status: 400 };
  const r = await polar(env, `license-keys/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(a.felder) });
  if (!r.ok) return { fehler: polarFehler(r), status: r.status || 502 };
  return { beschreibung: a.beschreibung, lizenz: polarAnsicht(r.daten, env) };
}

const SAMMEL = new Set(["sperren", "entsperren", "verlaengern"]);

/** Eigene Zusatzdaten je Lizenz-ID: letzte App-Prüfung und Notiz. */
async function zusatz(env, ids) {
  if (!env.ALPHA) return {};
  const [pings, notizen] = await Promise.all([
    leseAlle(env, await alleSchluessel(env, "lping:")),
    leseAlle(env, await alleSchluessel(env, "lnotiz:")),
  ]);
  const aus = {};
  for (const id of ids) aus[id] = {};
  for (const p of pings) {
    const id = p._key.slice("lping:".length);
    if (aus[id]) aus[id].ping = { zeit: p.zeit, version: p.version, system: p.system, status: p.status, instanz: p.instanz || null };
  }
  for (const n of notizen) {
    const id = n._key.slice("lnotiz:".length);
    if (aus[id]) aus[id].notiz = n.text;
  }
  return aus;
}

const ansicht = (l) => {
  const a = l.attributes || {};
  return {
    id: l.id,
    schluessel: a.key ? String(a.key) : a.key_short || "",
    kurz: a.key_short || (a.key ? `…${String(a.key).slice(-8)}` : ""),
    status: a.status,
    deaktiviert: Boolean(a.disabled),
    genutzt: a.activation_usage,
    limit: a.activation_limit,
    kunde: a.user_email,
    kundenName: a.user_name,
    produkt: a.product_name || null,
    varianteId: a.variant_id ?? null,
    bestellung: a.order_id ?? null,
    testmodus: Boolean(a.test_mode),
    erstellt: a.created_at,
    laeuftAb: a.expires_at,
  };
};

export async function onRequestGet({ request, data }) {
  const env = data.env;
  if (!env.POLAR_ACCESS_TOKEN && !env.LEMONSQUEEZY_API_KEY) return json(412, { fehler: OHNE_ANBIETER });
  const id = new URL(request.url).searchParams.get("id");
  if (id && istPolarId(lizenzId(id))) return polarEinzeln(env, lizenzId(id));
  if (!env.LEMONSQUEEZY_API_KEY) {
    if (id) return json(404, { fehler: "Lizenz nicht gefunden." });
    const p = await polarListe(env);
    if (p.fehler) return json(p.status, { fehler: p.fehler });
    const z = await zusatz(env, p.liste.map((l) => l.id));
    return json(200, { lizenzen: p.liste.map((l) => ({ ...l, ...z[l.id] })) });
  }
  if (id) {
    const sauber = String(id).replace(/\D/g, "");
    const [l, inst] = await Promise.all([lemon(env, `license-keys/${sauber}`), lemon(env, `license-key-instances?filter[license_key_id]=${sauber}&page[size]=50`)]);
    if (!l.ok) return json(l.status || 502, { fehler: lsFehler(l) });
    const [z, protokoll, sync] = await Promise.all([
      zusatz(env, [sauber]),
      leseProtokoll(env, 500),
      env.SYNC ? belegtGeteilt(env.SYNC, praefixFuer(sauber)) : null,
    ]);
    const ping = z[sauber]?.ping;
    return json(200, {
      lizenz: { ...ansicht(l.daten.data), ...z[sauber] },
      // `identifier` ist die Instanz-ID der License-API (UUID); nur damit lässt
      // sich ein Gerät abmelden. `id` ist die interne Nummer der Store-API.
      geraete: (inst.daten?.data || []).map((i) => ({
        id: i.id,
        identifier: i.attributes?.identifier || null,
        name: i.attributes?.name,
        erstellt: i.attributes?.created_at,
        zuletzt: ping?.instanz && ping.instanz === i.attributes?.identifier ? ping.zeit : null,
      })),
      verlauf: protokoll.filter((e) => String(e.details).includes(`Lizenz ${sauber}`)).slice(0, 30),
      sync: sync ? { ...sync.sync, grenze: GESAMT_MAX, sicherungen: { ...sync.sicherungen, grenze: SICHERUNG_MAX } } : null,
    });
  }
  const alle = [];
  for (let seite = 1; seite <= 3; seite++) {
    const r = await lemon(env, `license-keys?page[size]=100&page[number]=${seite}&sort=-createdAt`);
    if (!r.ok) return json(r.status || 502, { fehler: lsFehler(r) });
    alle.push(...(r.daten?.data || []));
    if (!r.daten?.meta?.page || r.daten.meta.page.lastPage <= seite) break;
  }
  let liste = alle.map(ansicht);
  if (env.POLAR_ACCESS_TOKEN) {
    const p = await polarListe(env);
    if (p.liste) liste = [...p.liste, ...liste];
  }
  const z = await zusatz(env, liste.map((l) => l.id));
  return json(200, { lizenzen: liste.map((l) => ({ ...l, ...z[l.id] })) });
}

/** Einzelne Polar-Lizenz mit Geräten, Verlauf und Sync-Speicher. */
async function polarEinzeln(env, id) {
  if (!env.POLAR_ACCESS_TOKEN) return json(412, { fehler: OHNE_ANBIETER });
  const l = await polarLizenzLaden(env, id);
  if (!l.ok) return json(l.status || 502, { fehler: polarFehler(l) });
  const [z, protokoll, sync] = await Promise.all([
    zusatz(env, [id]),
    leseProtokoll(env, 500),
    env.SYNC ? belegtGeteilt(env.SYNC, praefixFuer(id)) : null,
  ]);
  const ping = z[id]?.ping;
  return json(200, {
    lizenz: { ...polarAnsicht(l.daten, env), ...z[id] },
    // Bei Polar ist die Aktivierungs-ID zugleich das, womit die App und der Admin abmelden.
    geraete: (l.daten?.activations || []).map((a) => ({
      id: a.id,
      identifier: a.id,
      name: a.label,
      erstellt: a.created_at,
      zuletzt: ping?.instanz && ping.instanz === a.id ? ping.zeit : null,
    })),
    verlauf: protokoll.filter((e) => String(e.details).includes(`Lizenz ${id}`)).slice(0, 30),
    sync: sync ? { ...sync.sync, grenze: GESAMT_MAX, sicherungen: { ...sync.sicherungen, grenze: SICHERUNG_MAX } } : null,
  });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  if (!env.POLAR_ACCESS_TOKEN && !env.LEMONSQUEEZY_API_KEY) return json(412, { fehler: OHNE_ANBIETER });
  const d = await request.json().catch(() => null);
  if (Array.isArray(d?.ids)) return sammelaktion(env, data, d);
  const id = lizenzId(d?.id);
  if (!id || !d?.aktion) return json(400, { fehler: "Es fehlen Angaben (id, aktion)." });
  const istPolar = istPolarId(id);
  if (istPolar && !env.POLAR_ACCESS_TOKEN) return json(412, { fehler: OHNE_ANBIETER });
  if (!istPolar && !env.LEMONSQUEEZY_API_KEY) return json(412, { fehler: "Für ältere Lizenzen fehlt der Lemon-Squeezy-Schlüssel." });

  if (d.aktion === "notiz") {
    const text = String(d.text || "").trim().slice(0, 2000);
    if (!env.ALPHA) return json(503, { fehler: "KV `ALPHA` fehlt." });
    if (text) await env.ALPHA.put(`lnotiz:${id}`, JSON.stringify({ text, zeit: new Date().toISOString(), benutzer: data.benutzer }));
    else await env.ALPHA.delete(`lnotiz:${id}`);
    return json(200, { ok: true, meldung: text ? "Notiz gespeichert." : "Notiz entfernt." });
  }

  if (d.aktion === "sync-leeren") {
    if (!env.SYNC) return json(503, { fehler: "Kein R2-Bucket `SYNC` gebunden." });
    const n = await allesLoeschen(env.SYNC, praefixFuer(id), "sync");
    await protokolliere(env, data.benutzer, "Lizenz: Sync-Speicher geleert", `Lizenz ${id} (${n} Dateien)`);
    return json(200, { ok: true, meldung: `${n} Sync-Dateien gelöscht.` });
  }

  if (d.aktion === "mail") {
    const betreff = String(d.betreff || "").trim().slice(0, 200);
    const text = String(d.text || "").trim().slice(0, 10000);
    if (betreff.length < 3 || text.length < 5) return json(422, { fehler: "Betreff und Text dürfen nicht leer sein." });
    if (!env.RESEND_API_KEY) return json(412, { fehler: "Der Resend-Schlüssel fehlt. Trag ihn unter Einstellungen ein." });
    let a;
    if (istPolar) {
      const l = await polarLizenzLaden(env, id);
      a = { user_email: l.daten?.customer?.email, user_name: l.daten?.customer?.name };
      if (!l.ok || !a.user_email) return json(502, { fehler: l.ok ? "Zur Lizenz gibt es keine E-Mail-Adresse." : polarFehler(l) });
    } else {
      const l = await lemon(env, `license-keys/${id}`);
      a = l.daten?.data?.attributes || {};
      if (!l.ok || !a.user_email) return json(502, { fehler: lsFehler(l) || "Zur Lizenz gibt es keine E-Mail-Adresse." });
    }
    const vorname = String(a.user_name || "").split(/\s+/)[0];
    const html = mailHtml(`${vorname ? `<p style="margin:0 0 14px;">Hallo ${escapeHtml(vorname)},</p>` : ""}${textZuHtml(text)}`, {
      vorschau: text.split("\n")[0].slice(0, 120),
      grund: "Du bekommst diese Mail zu deiner Lizenz für Bewerbungs-Cockpit.",
    });
    const r = await resend(env, "emails", {
      method: "POST",
      body: JSON.stringify({
        from: env.MAIL_VON || "Bewerbungs-Cockpit <onboarding@resend.dev>",
        to: [a.user_email],
        reply_to: env.MAIL_AN || "Kontakt@mesco.cc",
        subject: betreff,
        html,
        text: alsText(html),
      }),
    });
    if (!r.ok) return json(502, { fehler: `Mail konnte nicht gesendet werden (Resend ${r.status}).` });
    await protokolliere(env, data.benutzer, "Lizenz: Mail an Kunden", `Lizenz ${id}: ${betreff}`);
    return json(200, { ok: true, meldung: `Mail an ${a.user_email} gesendet.` });
  }

  if (d.aktion === "geraet-abmelden" && istPolar) {
    const instanz = String(d.instanz || "").trim();
    if (!instanz) return json(400, { fehler: "Es fehlt das Gerät (instanz)." });
    const l = await polarLizenzLaden(env, id);
    if (!l.ok || !l.daten?.key) return json(l.status || 502, { fehler: polarFehler(l) });
    const r = await polarLizenz(env, "deactivate", { key: l.daten.key, activation_id: instanz });
    if (!(r.status === 204 || r.ok)) return json(r.status === 404 ? 404 : 502, { fehler: r.status === 404 ? "Gerät nicht gefunden." : polarFehler(r) });
    await protokolliere(env, data.benutzer, "Lizenz: Gerät abgemeldet", `Lizenz ${id}`);
    return json(200, { ok: true, meldung: "Gerät abgemeldet. Der Platz ist wieder frei." });
  }

  if (istPolar) {
    const e = await polarAendern(env, id, d);
    if (e.fehler) return json(e.status, { fehler: e.fehler });
    await protokolliere(env, data.benutzer, `Lizenz ${e.beschreibung}`, `Lizenz ${id}`);
    return json(200, { ok: true, meldung: `Lizenz ${e.beschreibung}.`, lizenz: e.lizenz });
  }

  if (d.aktion === "geraet-abmelden") {
    // Die Admin-API kann Instanzen nicht löschen; die License-API kann es mit
    // Schlüssel + Instanz. Sie erwartet den `identifier` (UUID), nicht die
    // interne Nummer der Store-API. Kommt doch eine Nummer an (ältere
    // Oberfläche), wird der identifier nachgeschlagen.
    let instanz = String(d.instanz || "").trim();
    if (!instanz) return json(400, { fehler: "Es fehlt das Gerät (instanz)." });
    if (/^\d+$/.test(instanz)) {
      const i = await lemon(env, `license-key-instances/${instanz}`);
      instanz = i.daten?.data?.attributes?.identifier || "";
      if (!instanz) return json(i.status === 404 ? 404 : 502, { fehler: i.ok ? "Gerät nicht gefunden." : lsFehler(i) });
    }
    const l = await lemon(env, `license-keys/${id}`);
    const schluessel = l.daten?.data?.attributes?.key;
    if (!l.ok || !schluessel) return json(l.status && l.status !== 200 ? l.status : 502, { fehler: lsFehler(l) });
    const r = await fetch("https://api.lemonsqueezy.com/v1/licenses/deactivate", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ license_key: schluessel, instance_id: instanz }),
    }).catch(() => null);
    if (!r) return json(502, { fehler: "Lemon Squeezy nicht erreichbar." });
    const j = await r.json().catch(() => null);
    if (!j?.deactivated) return json(422, { fehler: j?.error ? `Lemon Squeezy: ${j.error}` : "Gerät konnte nicht abgemeldet werden." });
    await protokolliere(env, data.benutzer, "Lizenz: Gerät abgemeldet", `Lizenz ${id}`);
    return json(200, { ok: true, meldung: "Gerät abgemeldet. Der Platz ist wieder frei." });
  }

  const aenderung = attributeFuer(d);
  if (!aenderung) return json(400, { fehler: "Unbekannte Aktion." });
  const { attribute, beschreibung } = aenderung;

  const r = await lemon(env, `license-keys/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ data: { type: "license-keys", id, attributes: attribute } }),
  });
  if (!r.ok) return json(r.status || 502, { fehler: lsFehler(r) });
  await protokolliere(env, data.benutzer, `Lizenz ${beschreibung}`, `Lizenz ${id}`);
  return json(200, { ok: true, meldung: `Lizenz ${beschreibung}.`, lizenz: ansicht(r.daten.data) });
}

function attributeFuer(d) {
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
      const bisher = d.bisherAblauf ? new Date(d.bisherAblauf).getTime() : 0;
      const basis = bisher > Date.now() ? bisher : Date.now();
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
      return null;
  }
  return { attribute, beschreibung };
}


/** Sperren, Entsperren oder Verlängern für mehrere Lizenzen (bis 50). */
async function sammelaktion(env, data, d) {
  if (!SAMMEL.has(d.aktion)) return json(400, { fehler: "Diese Aktion gibt es nicht als Sammelaktion." });
  const ids = [...new Set(d.ids.map(lizenzId).filter(Boolean))].slice(0, 50);
  if (!ids.length) return json(400, { fehler: "Keine Lizenzen ausgewählt." });
  let ok = 0;
  const fehler = [];
  for (const id of ids) {
    if (istPolarId(id)) {
      const e = env.POLAR_ACCESS_TOKEN ? await polarAendern(env, id, d) : { fehler: OHNE_ANBIETER };
      if (e.fehler) fehler.push(id);
      else {
        ok += 1;
        await protokolliere(env, data.benutzer, `Lizenz ${e.beschreibung} (Sammelaktion)`, `Lizenz ${id}`);
      }
      continue;
    }
    let bisherAblauf = null;
    if (d.aktion === "verlaengern") {
      const l = await lemon(env, `license-keys/${id}`);
      bisherAblauf = l.daten?.data?.attributes?.expires_at ?? null;
    }
    const { attribute, beschreibung } = attributeFuer({ ...d, bisherAblauf });
    const r = await lemon(env, `license-keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ data: { type: "license-keys", id, attributes: attribute } }),
    });
    if (r.ok) {
      ok += 1;
      await protokolliere(env, data.benutzer, `Lizenz ${beschreibung} (Sammelaktion)`, `Lizenz ${id}`);
    } else fehler.push(id);
  }
  return json(fehler.length ? 207 : 200, {
    ok: fehler.length === 0,
    meldung: `${ok} von ${ids.length} Lizenzen geändert.${fehler.length ? ` Fehlgeschlagen: ${fehler.join(", ")}.` : ""}`,
  });
}
