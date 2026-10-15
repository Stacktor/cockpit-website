/**
 * Zählt Seitenaufrufe von cockpit.mesco.cc (cookie-frei, serverseitig, ohne IP-Speicherung): siehe lib/seitenzaehler.js.
 * Läuft nur für Seiten; Dateien unter /_astro und die Bilder in public/ schließt public/_routes.json aus.
 */
import { erfasse } from "../lib/seitenzaehler.js";

export async function onRequest(context) {
  const antwort = await context.next();
  try {
    // Zählen darf die Auslieferung nie verzögern oder stören.
    context.waitUntil(erfasse(context.env, context.request, antwort.clone()).catch(() => false));
  } catch {
    /* ohne waitUntil (Test) nichts zählen */
  }
  return antwort;
}
