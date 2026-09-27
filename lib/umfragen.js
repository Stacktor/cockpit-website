/**
 * Umfragen für Alpha-Tester — Definitionen, Standard-Fragebögen, Prüfung.
 *
 * Eine Umfrage liegt im KV unter `survey:def:<id>`. Solange dort keine liegt,
 * gelten die beiden Standard-Fragebögen unten (Puls nach 3 Tagen, großer
 * Alpha-Fragebogen nach 14 Tagen). Im Admin-Dashboard lassen sie sich
 * bearbeiten, abschalten oder durch eigene ersetzen.
 *
 * Fragetypen:
 *   einfach   eine Option          { optionen: string[] }
 *   mehrfach  mehrere Optionen     { optionen: string[] }
 *   skala     1–5                  { labels?: [links, rechts] }
 *   nps       0–10
 *   euro      Betrag 0–max         { max?: number }
 *   text      Freitext (max. 2000 Zeichen)
 *   matrix    je Zeile 1–5 oder „nicht genutzt“ { zeilen: string[] }
 *
 * Auslöser (werden in der App lokal geprüft — die Zähler verlassen das Gerät nicht):
 *   { art: "tage", wert: 3 }                          ab Tag X nach dem ersten Start
 *   { art: "meilenstein", zaehler: "bewerbungen" | "anschreiben", wert: 5 }
 *   { art: "sofort" }                                 sobald aktiv
 */

const FUNKTIONEN = [
  "Pipeline",
  "Stellensuche",
  "Auto-Modus",
  "KI-Anschreiben",
  "Inbox",
  "Profil & Lebenslauf-Import",
  "Lebenslauf-Designer",
  "Interview-Training",
  "Skill-Test",
  "Analyse",
  "Erinnerungen",
  "KI-Assistent",
];

export const STANDARD_UMFRAGEN = [
  {
    id: "puls-tag3",
    titel: "Wie läuft der Start?",
    beschreibung: "Fünf kurze Fragen zu deinen ersten Tagen mit cockpit. Dauert eine Minute.",
    aktiv: true,
    ausloeser: { art: "tage", wert: 3 },
    fragen: [
      { id: "einstieg", typ: "skala", text: "Wie leicht war der Einstieg?", labels: ["sehr schwer", "sehr leicht"], pflicht: true },
      { id: "bewerbung", typ: "einfach", text: "Hast du schon eine Bewerbung angelegt?", optionen: ["Ja", "Nein, noch nicht"], pflicht: true },
      { id: "funktioniert", typ: "einfach", text: "Hat bisher alles funktioniert?", optionen: ["Ja", "Kleinere Probleme", "Größere Probleme"], pflicht: true },
      { id: "nps", typ: "nps", text: "Wie wahrscheinlich würdest du cockpit weiterempfehlen?", pflicht: true },
      { id: "ueberrascht", typ: "text", text: "Was hat dich bisher am meisten überrascht — positiv oder negativ?", pflicht: false },
    ],
  },
  {
    id: "alpha-gross",
    titel: "Dein großes Alpha-Feedback",
    beschreibung:
      "Du nutzt cockpit jetzt seit zwei Wochen. Deine Antworten entscheiden, was als Nächstes gebaut wird — und was cockpit kosten soll. Etwa 5 Minuten.",
    aktiv: true,
    ausloeser: { art: "tage", wert: 14 },
    fragen: [
      // ── Nutzung & Funktionen ──
      { id: "haeufigkeit", abschnitt: "Nutzung & Funktionen", typ: "einfach", text: "Wie oft nutzt du cockpit?", optionen: ["Täglich", "Mehrmals pro Woche", "Etwa einmal pro Woche", "Seltener"], pflicht: true },
      { id: "genutzt", abschnitt: "Nutzung & Funktionen", typ: "mehrfach", text: "Welche Funktionen hast du ausprobiert?", optionen: FUNKTIONEN, pflicht: true },
      { id: "hilfreich", abschnitt: "Nutzung & Funktionen", typ: "matrix", text: "Wie hilfreich waren diese Funktionen für dich?", zeilen: FUNKTIONEN, pflicht: false },
      { id: "fehlt", abschnitt: "Nutzung & Funktionen", typ: "text", text: "Welche Funktion fehlt dir am meisten?", pflicht: false },
      { id: "nervt", abschnitt: "Nutzung & Funktionen", typ: "text", text: "Was nervt dich an cockpit?", pflicht: false },
      // ── Design, Bedienung, Fehler ──
      { id: "einstieg", abschnitt: "Design & Bedienung", typ: "skala", text: "Wie leicht fandest du den Einstieg?", labels: ["sehr schwer", "sehr leicht"], pflicht: true },
      { id: "design", abschnitt: "Design & Bedienung", typ: "skala", text: "Wie gefällt dir das Design?", labels: ["gar nicht", "sehr"], pflicht: true },
      { id: "tempo", abschnitt: "Design & Bedienung", typ: "skala", text: "Wie schnell fühlt sich die App an?", labels: ["träge", "sehr flott"], pflicht: true },
      { id: "fehlerhaeufigkeit", abschnitt: "Design & Bedienung", typ: "einfach", text: "Hattest du Abstürze oder Fehler?", optionen: ["Nein", "Selten", "Öfter", "Ständig"], pflicht: true },
      { id: "fehlerbeschreibung", abschnitt: "Design & Bedienung", typ: "text", text: "Falls ja: Was ist schiefgelaufen?", pflicht: false },
      { id: "system", abschnitt: "Design & Bedienung", typ: "einfach", text: "Auf welchem System nutzt du cockpit?", optionen: ["Windows 11", "Windows 10", "Linux", "Anderes"], pflicht: true },
      { id: "ki", abschnitt: "Design & Bedienung", typ: "einfach", text: "Welche KI nutzt du in cockpit?", optionen: ["Eigener Anbieter-Schlüssel", "Lokales Modell (Ollama/LM Studio)", "Keine KI"], pflicht: true },
      // ── Preis, Modell, Weiterempfehlung ──
      { id: "zuBillig", abschnitt: "Preis & Weiterempfehlung", typ: "euro", text: "Als Einmalkauf gedacht: Ab welchem Preis wäre cockpit Pro so billig, dass du an der Qualität zweifeln würdest?", max: 1000, pflicht: true },
      { id: "guenstig", abschnitt: "Preis & Weiterempfehlung", typ: "euro", text: "Ab welchem Preis wäre es ein richtig gutes Angebot?", max: 1000, pflicht: true },
      { id: "teuer", abschnitt: "Preis & Weiterempfehlung", typ: "euro", text: "Ab welchem Preis fändest du es teuer, würdest aber noch darüber nachdenken?", max: 1000, pflicht: true },
      { id: "zuTeuer", abschnitt: "Preis & Weiterempfehlung", typ: "euro", text: "Ab welchem Preis wäre es dir zu teuer?", max: 1000, pflicht: true },
      { id: "modell", abschnitt: "Preis & Weiterempfehlung", typ: "einfach", text: "Wie würdest du am liebsten bezahlen?", optionen: ["Einmal kaufen", "Jahresabo", "Monatsabo", "Ist mir egal"], pflicht: true },
      { id: "monatlich", abschnitt: "Preis & Weiterempfehlung", typ: "euro", text: "Falls es ein Abo würde: Wie viel pro Monat fändest du fair?", max: 100, pflicht: false },
      { id: "nps", abschnitt: "Preis & Weiterempfehlung", typ: "nps", text: "Wie wahrscheinlich würdest du cockpit weiterempfehlen?", pflicht: true },
      { id: "nps10", abschnitt: "Preis & Weiterempfehlung", typ: "text", text: "Was müsste passieren, damit du eine 10 gibst?", pflicht: false },
      // ── Person & Situation ──
      { id: "status", abschnitt: "Über dich", typ: "einfach", text: "In welcher Situation suchst du gerade?", optionen: ["Arbeitsuchend", "Im Job, möchte wechseln", "Studium / Abschluss", "Ausbildung", "Wiedereinstieg", "Andere"], pflicht: true },
      { id: "branche", abschnitt: "Über dich", typ: "einfach", text: "In welcher Branche?", optionen: ["IT / Software", "Ingenieurwesen / Technik", "Kaufmännisch / Verwaltung", "Gesundheit / Soziales", "Handwerk / Produktion", "Marketing / Medien", "Handel / Logistik", "Andere"], pflicht: true },
      { id: "erfahrung", abschnitt: "Über dich", typ: "einfach", text: "Wie viel Berufserfahrung hast du?", optionen: ["Unter 1 Jahr", "1–3 Jahre", "3–7 Jahre", "7–15 Jahre", "Über 15 Jahre"], pflicht: true },
      { id: "bewerbungenMonat", abschnitt: "Über dich", typ: "einfach", text: "Wie viele Bewerbungen schreibst du im Monat?", optionen: ["1–5", "6–15", "16–30", "Mehr als 30"], pflicht: true },
      { id: "werkzeuge", abschnitt: "Über dich", typ: "mehrfach", text: "Was hast du vorher genutzt?", optionen: ["Excel / Tabelle", "Notizen / Papier", "ChatGPT o. ä.", "Teal, Huntr o. ä.", "Merklisten der Jobportale", "Nichts davon"], pflicht: false },
      { id: "gespraech", abschnitt: "Über dich", typ: "einfach", text: "Darf ich dich für ein 20-Minuten-Gespräch per Mail kontaktieren?", optionen: ["Ja, gern", "Lieber nicht"], pflicht: true },
    ],
  },
];

/** Alle aktiven Umfragen — aus KV, sonst die Standard-Fragebögen. */
export async function ladeUmfragen(env, { nurAktive = true } = {}) {
  let liste = [];
  if (env.ALPHA) {
    const keys = await env.ALPHA.list({ prefix: "survey:def:" });
    liste = (
      await Promise.all(
        keys.keys.map(async (k) => {
          try {
            return JSON.parse((await env.ALPHA.get(k.name)) || "null");
          } catch {
            return null;
          }
        }),
      )
    ).filter(Boolean);
  }
  if (liste.length === 0) liste = STANDARD_UMFRAGEN;
  return nurAktive ? liste.filter((u) => u.aktiv) : liste;
}

/** Prüft und normalisiert Antworten gegen die Definition. */
export function pruefeAntworten(umfrage, roh) {
  const antworten = {};
  const fehler = [];
  const eingabe = roh && typeof roh === "object" ? roh : {};
  for (const f of umfrage.fragen) {
    const v = eingabe[f.id];
    const leer = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (leer) {
      if (f.pflicht) fehler.push(f.id);
      continue;
    }
    switch (f.typ) {
      case "einfach":
        if (!f.optionen.includes(v)) fehler.push(f.id);
        else antworten[f.id] = v;
        break;
      case "mehrfach":
        if (!Array.isArray(v) || !v.every((x) => f.optionen.includes(x))) fehler.push(f.id);
        else antworten[f.id] = [...new Set(v)];
        break;
      case "skala": {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 5) fehler.push(f.id);
        else antworten[f.id] = n;
        break;
      }
      case "nps": {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0 || n > 10) fehler.push(f.id);
        else antworten[f.id] = n;
        break;
      }
      case "euro": {
        const n = Number(v);
        const max = f.max ?? 1000;
        if (!Number.isFinite(n) || n < 0 || n > max) fehler.push(f.id);
        else antworten[f.id] = Math.round(n * 2) / 2;
        break;
      }
      case "text":
        antworten[f.id] = String(v).trim().slice(0, 2000);
        break;
      case "matrix": {
        if (typeof v !== "object" || Array.isArray(v)) {
          fehler.push(f.id);
          break;
        }
        const zeile = {};
        for (const z of f.zeilen) {
          const w = v[z];
          if (w === undefined || w === null || w === "") continue;
          if (w === "nicht genutzt" || (Number.isInteger(Number(w)) && Number(w) >= 1 && Number(w) <= 5))
            zeile[z] = w === "nicht genutzt" ? w : Number(w);
        }
        antworten[f.id] = zeile;
        break;
      }
      default:
        break;
    }
  }
  return { antworten, fehler };
}
