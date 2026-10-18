/** Turnstile muss vor jedem Speichern und Mailversand erfolgreich geprüft sein. */
export const ALPHA_TURNSTILE_ACTION = "alpha_signup";

export async function pruefeTurnstile(request, env, token) {
  const nichtVerfuegbar = {
    ok: false, status: 503,
    fehler: "Die Sicherheitsprüfung ist gerade nicht erreichbar. Bitte versuch es gleich noch einmal.",
  };
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) return nichtVerfuegbar;
  const abgelehnt = {
    ok: false, status: 403,
    fehler: "Die Sicherheitsprüfung war nicht erfolgreich oder ist abgelaufen. Bitte schicke die Anmeldung noch einmal ab.",
  };
  if (typeof token !== "string" || !token.trim() || token.length > 2048) return abgelehnt;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return nichtVerfuegbar;
    const ergebnis = await response.json();
    if (ergebnis?.["error-codes"]?.some((code) =>
      ["internal-error", "missing-input-secret", "invalid-input-secret"].includes(code))) return nichtVerfuegbar;
    // Ein Token einer anderen Website oder Aktion darf nicht für die Anmeldung gelten.
    if (ergebnis?.success !== true || ergebnis.hostname !== new URL(request.url).hostname ||
        ergebnis.action !== ALPHA_TURNSTILE_ACTION) return abgelehnt;
    return { ok: true };
  } catch {
    // Kein Durchlassen bei Netzfehlern, Zeitüberschreitung oder ungültiger Antwort.
    return nichtVerfuegbar;
  }
}
