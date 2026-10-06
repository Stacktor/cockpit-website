/**
 * POST /api/app/geraete — Geräte, auf denen eine Lizenz freigeschaltet ist.
 *
 * Körper: { schluessel, instanz? }
 * Die License-API von Lemon Squeezy kennt keine Liste der Geräte; die gibt es
 * nur über die Store-API mit dem Schlüssel aus dem Tresor. Wer den
 * Lizenzschlüssel kennt, sieht die Geräte dieser Lizenz. Die Instanz ist
 * freiwillig: Auf einem neuen Gerät, das wegen des Limits nicht freischalten
 * kann, gibt es noch keine. Abgemeldet wird in der App direkt über die
 * License-API (Schlüssel und `id` aus dieser Liste).
 *
 * Antwort: { ok, geraete: [{ id, name, seit, diesesGeraet }], genutzt, limit }
 * Gespeichert wird nichts, geloggt wird der Schlüssel nie.
 */
import { imKontingent, json, pruefeLizenz } from "../../../lib/app-lizenz.js";
import { lemon } from "../../../lib/admin/daten.js";
import { mitSchluesseln } from "../../../lib/admin/tresor.js";

export async function onRequestPost({ request, env }) {
  const d = await request.json().catch(() => null);
  if (!d) return json(400, { ok: false, fehler: "Anfrage konnte nicht gelesen werden." });
  const p = await pruefeLizenz(env, d.schluessel, d.instanz, { nurAlpha: false, instanzPflicht: false });
  if (!p.ok) return json(p.status, { ok: false, fehler: p.fehler });
  if (!(await imKontingent(env, p.lizenz.id, "geraete", 60)))
    return json(429, { ok: false, fehler: "Zu viele Abfragen. Bitte in einer Stunde erneut versuchen." });

  const e = await mitSchluesseln(env);
  if (!e.LEMONSQUEEZY_API_KEY) return json(503, { ok: false, fehler: "Die Geräteliste ist gerade nicht verfügbar." });
  const id = String(p.lizenz.id).replace(/\D/g, "");
  const [l, inst] = await Promise.all([
    lemon(e, `license-keys/${id}`),
    lemon(e, `license-key-instances?filter[license_key_id]=${id}&page[size]=50`),
  ]);
  if (!l.ok || !inst.ok)
    return json(502, { ok: false, fehler: "Lemon Squeezy hat nicht geantwortet. Bitte später erneut versuchen." });

  const eigene = String(d.instanz || "").trim();
  const geraete = (inst.daten?.data || [])
    .map((i) => ({
      id: String(i.attributes?.identifier || ""),
      name: String(i.attributes?.name || "Unbenanntes Gerät").slice(0, 120),
      seit: i.attributes?.created_at || null,
      diesesGeraet: Boolean(eigene) && i.attributes?.identifier === eigene,
    }))
    .filter((g) => g.id)
    .sort((a, b) => Number(b.diesesGeraet) - Number(a.diesesGeraet) || String(b.seit).localeCompare(String(a.seit)));
  const a = l.daten?.data?.attributes || {};
  return json(200, {
    ok: true,
    geraete,
    genutzt: a.activation_usage ?? geraete.length,
    limit: a.activation_limit ?? null,
  });
}
