/**
 * /api/admin/lizenzen — Lizenzen bei Lemon Squeezy.
 *   GET  ?id=…  Einzelne Lizenz mit Geräten; sonst Liste (bis 300, neueste zuerst)
 *   POST { id, aktion: sperren | entsperren | unbefristet | verlaengern (tage) | geraete (limit)
 *                     | geraet-abmelden (instanz) }
 * Der vollständige Lizenzschlüssel verlässt den Server nie.
 */
import { json } from "../../../lib/admin/zugang.js";
import { lemon, lsFehler } from "../../../lib/admin/daten.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";

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
    return json(200, {
      lizenz: ansicht(l.daten.data),
      geraete: (inst.daten?.data || []).map((i) => ({ id: i.id, name: i.attributes.name, erstellt: i.attributes.created_at })),
    });
  }
  const alle = [];
  for (let seite = 1; seite <= 3; seite++) {
    const r = await lemon(env, `license-keys?page[size]=100&page[number]=${seite}&sort=-createdAt`);
    if (!r.ok) return json(r.status || 502, { fehler: lsFehler(r) });
    alle.push(...(r.daten?.data || []));
    if (!r.daten?.meta?.page || r.daten.meta.page.lastPage <= seite) break;
  }
  return json(200, { lizenzen: alle.map(ansicht) });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  if (!env.LEMONSQUEEZY_API_KEY) return json(412, { fehler: "Lemon-Squeezy-Schlüssel fehlt — unter Einstellungen eintragen." });
  const d = await request.json().catch(() => null);
  const id = String(d?.id || "").replace(/\D/g, "");
  if (!id || !d?.aktion) return json(400, { fehler: "Es fehlen Angaben (id, aktion)." });

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
      return json(400, { fehler: "Unbekannte Aktion." });
  }

  const r = await lemon(env, `license-keys/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ data: { type: "license-keys", id, attributes: attribute } }),
  });
  if (!r.ok) return json(r.status || 502, { fehler: lsFehler(r) });
  await protokolliere(env, data.benutzer, `Lizenz ${beschreibung}`, `Lizenz ${id}`);
  return json(200, { ok: true, meldung: `Lizenz ${beschreibung}.`, lizenz: ansicht(r.daten.data) });
}
