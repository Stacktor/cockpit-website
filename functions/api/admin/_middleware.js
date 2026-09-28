/**
 * Läuft vor jeder /api/admin/*-Route:
 *  1. Zugang prüfen (Cloudflare-Access-JWT oder ADMIN_TOKEN) — fail-closed.
 *  2. Schreibzugriffe nur als JSON und nur von der eigenen Seite (Same-Origin).
 *  3. Schlüssel aus dem Tresor bereitstellen (ctx.data.env), Person merken
 *     (ctx.data.benutzer) fürs Audit-Log.
 */
import { gleicherUrsprung, json, pruefeZugang } from "../../../lib/admin/zugang.js";
import { mitSchluesseln } from "../../../lib/admin/tresor.js";

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const wache = await pruefeZugang(request, env);
  if (!wache.erlaubt) return json(wache.status, { fehler: wache.grund });

  if (request.method !== "GET" && request.method !== "HEAD") {
    if (!gleicherUrsprung(request)) return json(403, { fehler: "Änderungen nur aus dem Admin-Portal heraus." });
    if (!(request.headers.get("content-type") || "").includes("application/json"))
      return json(415, { fehler: "Erwartet JSON." });
  }

  ctx.data.benutzer = wache.benutzer;
  ctx.data.env = await mitSchluesseln(env);
  try {
    return await ctx.next();
  } catch (e) {
    return json(500, { fehler: "Interner Fehler: " + String(e?.message || e).slice(0, 200) });
  }
}
