/**
 * /api/admin/lizenzen — Lizenzen bei Lemon Squeezy, ergänzt um eigene Daten.
 *   GET  ?id=…  Einzelne Lizenz mit Geräten, letzter App-Prüfung, Notiz,
 *               Verlauf (Audit-Log) und Sync-Speicher; sonst Liste (bis 300,
 *               neueste zuerst) mit letzter App-Prüfung und Notiz
 *   POST { id | ids[], aktion: sperren | entsperren | unbefristet | verlaengern (tage)
 *          | geraete (limit) | geraet-abmelden (instanz) | notiz (text)
 *          | mail (betreff, text) | sync-leeren }
 *        Mit `ids` (bis 50) als Sammelaktion für sperren, entsperren, verlaengern.
 * Der vollständige Lizenzschlüssel verlässt den Server nie.
 */
import { json } from "../../../lib/admin/zugang.js";
import { lemon, leseAlle, alleSchluessel, lsFehler, resend } from "../../../lib/admin/daten.js";
import { leseProtokoll, protokolliere } from "../../../lib/admin/protokoll.js";
import { alsText, escapeHtml, mailHtml, textZuHtml } from "../../../lib/mail/vorlage.js";
import { allesLoeschen, belegt, GESAMT_MAX, praefixFuer } from "../../../lib/sync.js";

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
    if (aus[id]) aus[id].ping = { zeit: p.zeit, version: p.version, system: p.system, status: p.status };
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
    schluessel: a.key_short || (a.key ? `…${String(a.key).slice(-8)}` : ""),
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
  if (!env.LEMONSQUEEZY_API_KEY) return json(412, { fehler: "Lemon-Squeezy-Schlüssel fehlt — unter Einstellungen eintragen." });
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const sauber = String(id).replace(/\D/g, "");
    const [l, inst] = await Promise.all([lemon(env, `license-keys/${sauber}`), lemon(env, `license-key-instances?filter[license_key_id]=${sauber}&page[size]=50`)]);
    if (!l.ok) return json(l.status || 502, { fehler: lsFehler(l) });
    const [z, protokoll, sync] = await Promise.all([
      zusatz(env, [sauber]),
      leseProtokoll(env, 500),
      env.SYNC ? belegt(env.SYNC, praefixFuer(sauber)) : null,
    ]);
    return json(200, {
      lizenz: { ...ansicht(l.daten.data), ...z[sauber] },
      geraete: (inst.daten?.data || []).map((i) => ({ id: i.id, name: i.attributes.name, erstellt: i.attributes.created_at })),
      verlauf: protokoll.filter((e) => String(e.details).includes(`Lizenz ${sauber}`)).slice(0, 30),
      sync: sync ? { ...sync, grenze: GESAMT_MAX } : null,
    });
  }
  const alle = [];
  for (let seite = 1; seite <= 3; seite++) {
    const r = await lemon(env, `license-keys?page[size]=100&page[number]=${seite}&sort=-createdAt`);
    if (!r.ok) return json(r.status || 502, { fehler: lsFehler(r) });
    alle.push(...(r.daten?.data || []));
    if (!r.daten?.meta?.page || r.daten.meta.page.lastPage <= seite) break;
  }
  const liste = alle.map(ansicht);
  const z = await zusatz(env, liste.map((l) => l.id));
  return json(200, { lizenzen: liste.map((l) => ({ ...l, ...z[l.id] })) });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  if (!env.LEMONSQUEEZY_API_KEY) return json(412, { fehler: "Lemon-Squeezy-Schlüssel fehlt — unter Einstellungen eintragen." });
  const d = await request.json().catch(() => null);
  if (Array.isArray(d?.ids)) return sammelaktion(env, data, d);
  const id = String(d?.id || "").replace(/\D/g, "");
  if (!id || !d?.aktion) return json(400, { fehler: "Es fehlen Angaben (id, aktion)." });

  if (d.aktion === "notiz") {
    const text = String(d.text || "").trim().slice(0, 2000);
    if (!env.ALPHA) return json(503, { fehler: "KV `ALPHA` fehlt." });
    if (text) await env.ALPHA.put(`lnotiz:${id}`, JSON.stringify({ text, zeit: new Date().toISOString(), benutzer: data.benutzer }));
    else await env.ALPHA.delete(`lnotiz:${id}`);
    return json(200, { ok: true, meldung: text ? "Notiz gespeichert." : "Notiz entfernt." });
  }

  if (d.aktion === "sync-leeren") {
    if (!env.SYNC) return json(503, { fehler: "Kein R2-Bucket `SYNC` gebunden." });
    const n = await allesLoeschen(env.SYNC, praefixFuer(id));
    await protokolliere(env, data.benutzer, "Lizenz: Sync-Speicher geleert", `Lizenz ${id} (${n} Dateien)`);
    return json(200, { ok: true, meldung: `${n} Sync-Dateien gelöscht.` });
  }

  if (d.aktion === "mail") {
    const betreff = String(d.betreff || "").trim().slice(0, 200);
    const text = String(d.text || "").trim().slice(0, 10000);
    if (betreff.length < 3 || text.length < 5) return json(422, { fehler: "Betreff und Text dürfen nicht leer sein." });
    if (!env.RESEND_API_KEY) return json(412, { fehler: "Resend-Schlüssel fehlt — unter Einstellungen eintragen." });
    const l = await lemon(env, `license-keys/${id}`);
    const a = l.daten?.data?.attributes || {};
    if (!l.ok || !a.user_email) return json(502, { fehler: lsFehler(l) || "Zur Lizenz gibt es keine E-Mail-Adresse." });
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

  if (d.aktion === "geraet-abmelden") {
    // Die Admin-API kann Instanzen nicht löschen; die License-API kann es mit Schlüssel + Instanz.
    const l = await lemon(env, `license-keys/${id}`);
    const schluessel = l.daten?.data?.attributes?.key;
    if (!l.ok || !schluessel) return json(502, { fehler: lsFehler(l) });
    const r = await fetch("https://api.lemonsqueezy.com/v1/licenses/deactivate", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ license_key: schluessel, instance_id: String(d.instanz || "") }),
    }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (!j?.deactivated) return json(502, { fehler: j?.error || "Gerät konnte nicht abgemeldet werden." });
    await protokolliere(env, data.benutzer, "Lizenz: Gerät abgemeldet", `Lizenz ${id}`);
    return json(200, { ok: true, meldung: "Gerät abgemeldet — der Platz ist wieder frei." });
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
  const ids = [...new Set(d.ids.map((x) => String(x).replace(/\D/g, "")).filter(Boolean))].slice(0, 50);
  if (!ids.length) return json(400, { fehler: "Keine Lizenzen ausgewählt." });
  let ok = 0;
  const fehler = [];
  for (const id of ids) {
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
