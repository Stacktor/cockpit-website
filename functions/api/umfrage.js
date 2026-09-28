/**
 * Preis-Umfrage auf der Website — BEENDET (September 2026).
 *
 * Umfragen laufen jetzt in der App (functions/api/app/*). Bereits gespeicherte
 * Antworten unter „umfrage:<mail>“ wertet das Admin-Portal weiter aus; neue
 * Antworten nimmt dieser Endpunkt nicht mehr an.
 */

export async function onRequestPost() {
  return new Response(
    JSON.stringify({
      ok: false,
      fehler: "Die Umfrage auf der Website ist beendet. Als Alpha-Tester findest du Umfragen jetzt direkt in der App unter „Feedback geben“.",
    }),
    { status: 410, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } },
  );
}
