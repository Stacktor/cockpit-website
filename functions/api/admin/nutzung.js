/**
 * GET /api/admin/nutzung — anonyme Nutzungsstatistik der App, letzte 30 Tage:
 * Meldungen je Tag (≈ aktive Geräte), meistgenutzte Ansichten und Aktionen,
 * Versionen, Systeme. Daten: siehe functions/api/app/nutzung.js.
 */
import { json } from "../../../lib/admin/zugang.js";
import { auswerten } from "../../../lib/nutzung.js";

const TAGE = 30;

export async function onRequestGet({ data }) {
  const env = data.env;
  if (!env.ALPHA) return json(200, { ok: false, art: "hinweis", text: "KV-Namespace ALPHA ist nicht verbunden." });
  const heute = Date.now();
  const tage = [];
  for (let i = TAGE; i >= 1; i--) tage.push(new Date(heute - i * 864e5).toISOString().slice(0, 10));
  const staende = await Promise.all(
    tage.map(async (t) => {
      try {
        return [t, JSON.parse((await env.ALPHA.get(`nutzung:${t}`)) || "null")];
      } catch {
        return [t, null];
      }
    }),
  );
  return json(200, { ok: true, tage: TAGE, ...auswerten(staende) });
}
