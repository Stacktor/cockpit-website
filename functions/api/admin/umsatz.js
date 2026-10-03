/**
 * /api/admin/umsatz — Bestellungen, Kunden, Erstattungen, Rabattcodes (Lemon Squeezy).
 *   GET
 *   POST { aktion: "rabatt", name, code?, prozent, anzahl? }  Rabattcode anlegen
 *        { aktion: "rabatt-loeschen", id }
 */
import { json } from "../../../lib/admin/zugang.js";
import { lemon, lsFehler, proTag } from "../../../lib/admin/daten.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";

export async function onRequestGet({ data }) {
  const env = data.env;
  if (!env.LEMONSQUEEZY_API_KEY) return json(412, { fehler: "Der Lemon-Squeezy-Schlüssel fehlt. Trag ihn unter Einstellungen ein." });
  const [bestellungen, kunden, rabatte] = await Promise.all([
    lemon(env, "orders?page[size]=100&sort=-createdAt"),
    lemon(env, "customers?page[size]=100&sort=-createdAt"),
    lemon(env, "discounts?page[size]=100"),
  ]);
  if (!bestellungen.ok) return json(bestellungen.status || 502, { fehler: lsFehler(bestellungen) });
  const be = (bestellungen.daten?.data || []).map((o) => {
    const a = o.attributes;
    return {
      id: o.id,
      nummer: a.order_number,
      kunde: a.user_email,
      name: a.user_name,
      status: a.status,
      erstattet: Boolean(a.refunded),
      summe: (a.total || 0) / 100,
      waehrung: a.currency,
      produkt: a.first_order_item?.product_name || "",
      variante: a.first_order_item?.variant_name || "",
      rabatt: (a.discount_total || 0) / 100,
      testmodus: Boolean(a.test_mode),
      zeit: a.created_at,
    };
  });
  const bezahlt = be.filter((o) => o.status === "paid" && !o.testmodus);
  const summe = (liste) => +liste.reduce((s, o) => s + o.summe, 0).toFixed(2);
  const monat = Date.now() - 30 * 864e5;
  return json(200, {
    kennzahlen: {
      bestellungen: bezahlt.length,
      umsatz: summe(bezahlt),
      umsatz30: summe(bezahlt.filter((o) => new Date(o.zeit).getTime() > monat)),
      erstattet: be.filter((o) => o.erstattet).length,
      kunden: kunden.daten?.meta?.page?.total ?? (kunden.daten?.data || []).length,
      waehrung: be[0]?.waehrung || "EUR",
    },
    proTag: proTag(bezahlt.map((o) => o.zeit), 30),
    bestellungen: be,
    kunden: (kunden.daten?.data || []).map((c) => ({
      id: c.id,
      name: c.attributes.name,
      mail: c.attributes.email,
      land: c.attributes.country,
      umsatz: (c.attributes.total_revenue_currency || 0) / 100,
      zeit: c.attributes.created_at,
    })),
    rabatte: (rabatte.daten?.data || []).map((r) => ({
      id: r.id,
      name: r.attributes.name,
      code: r.attributes.code,
      betrag: r.attributes.amount,
      art: r.attributes.amount_type,
      eingeloest: r.attributes.redemptions_count ?? null,
      max: r.attributes.is_limited_redemptions ? r.attributes.max_redemptions : null,
      status: r.attributes.status,
      zeit: r.attributes.created_at,
    })),
  });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  if (!env.LEMONSQUEEZY_API_KEY) return json(412, { fehler: "Lemon-Squeezy-Schlüssel fehlt." });
  const d = await request.json().catch(() => null);
  if (d?.aktion === "rabatt-loeschen") {
    const id = String(d.id || "").replace(/\D/g, "");
    const r = await lemon(env, `discounts/${id}`, { method: "DELETE" });
    if (!r.ok && r.status !== 204) return json(r.status || 502, { fehler: lsFehler(r) });
    await protokolliere(env, data.benutzer, "Rabattcode gelöscht", id);
    return json(200, { ok: true, meldung: "Rabattcode gelöscht." });
  }
  if (d?.aktion !== "rabatt") return json(400, { fehler: "Unbekannte Aktion." });
  if (!env.LS_STORE_ID) return json(412, { fehler: "Die Store-ID fehlt. Trag sie unter Einstellungen ein." });
  const prozent = Number(d.prozent);
  if (!Number.isInteger(prozent) || prozent < 1 || prozent > 100) return json(422, { fehler: "Rabatt in Prozent: 1 bis 100." });
  const code = String(d.code || "").trim().toUpperCase() || "CP" + crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();
  if (!/^[A-Z0-9]{3,32}$/.test(code)) return json(422, { fehler: "Code: 3–32 Zeichen, nur Buchstaben und Ziffern." });
  const anzahl = Number(d.anzahl) || 0;
  const r = await lemon(env, "discounts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "discounts",
        attributes: {
          name: String(d.name || code).slice(0, 60),
          code,
          amount: prozent,
          amount_type: "percent",
          ...(anzahl > 0 ? { is_limited_redemptions: true, max_redemptions: anzahl } : {}),
        },
        relationships: { store: { data: { type: "stores", id: String(env.LS_STORE_ID) } } },
      },
    }),
  });
  if (!r.ok) return json(r.status || 502, { fehler: lsFehler(r) });
  await protokolliere(env, data.benutzer, "Rabattcode angelegt", `${code} (${prozent} %)`);
  return json(200, { ok: true, meldung: `Rabattcode ${code} angelegt.` });
}
