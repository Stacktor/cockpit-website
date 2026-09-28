/**
 * Antwortmöglichkeiten der Alpha-Anmeldung — geteilt von Formular (Astro) und
 * Server (functions/api/alpha.js), damit beide nie auseinanderlaufen.
 */
export const ALPHA_OPTIONEN = {
  os: {
    windows: "Windows",
    linux: "Linux",
    macos: "macOS",
  },
  situation: [
    "Arbeitsuchend",
    "Im Job, möchte wechseln",
    "Studium / Abschluss",
    "Ausbildung",
    "Wiedereinstieg",
    "Andere",
  ],
  bewerbungenMonat: ["1–5", "6–15", "16–30", "Mehr als 30", "Ich fange gerade erst an"],
  werkzeuge: [
    "Excel / Tabelle",
    "Notizen / Papier",
    "ChatGPT o. ä.",
    "Teal, Huntr o. ä.",
    "Merklisten der Jobportale",
    "Nichts davon",
  ],
  ki: [
    "Ich habe einen API-Schlüssel",
    "Ich nutze lokale Modelle",
    "Noch nichts — will es ausprobieren",
    "Lieber ohne KI",
  ],
  technik: ["Ich richte gern selbst ein", "Klappt mit Anleitung", "So einfach wie möglich"],
  quelle: [
    "LinkedIn",
    "Xing",
    "Reddit",
    "TikTok",
    "Instagram",
    "YouTube",
    "Discord",
    "Forum / Community",
    "Coach / Beratung",
    "Hochschule / Bildungsträger",
    "Freunde / Bekannte",
    "Suchmaschine",
    "Andere",
  ],
  feedback: [
    "Umfragen in der App",
    "Fehler melden, wenn mir etwas auffällt",
    "Austausch im Discord",
    "Kurzes Video-Gespräch (20 Min.)",
  ],
};

/** Einzelwert nur, wenn er in der Liste steht — sonst leer. */
export function einer(wert, liste) {
  const w = String(wert ?? "").trim();
  return liste.includes(w) ? w : "";
}

/** Mehrfachauswahl: nur bekannte Werte, ohne Doppelte. */
export function mehrere(werte, liste) {
  if (!Array.isArray(werte)) return [];
  return [...new Set(werte.map((w) => String(w).trim()).filter((w) => liste.includes(w)))];
}

const STANDARD_PLAETZE = 50;

/** Plätze: Admin-Einstellung (KV) → Umgebungsvariable → 50. */
export async function plaetze(env) {
  if (env.ALPHA) {
    try {
      const c = JSON.parse((await env.ALPHA.get("config:alpha")) || "null");
      if (c && Number.isInteger(c.plaetze) && c.plaetze >= 0) return c.plaetze;
    } catch {
      /* Standard nehmen */
    }
  }
  const roh = env.ALPHA_PLAETZE;
  const n = roh === undefined || roh === "" ? NaN : Number(roh);
  return Number.isInteger(n) && n >= 0 ? n : STANDARD_PLAETZE;
}
