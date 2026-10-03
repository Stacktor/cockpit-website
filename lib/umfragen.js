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
 *
 * Zeitplan (alles optional, die App wertet es lokal aus):
 *   start, ende            ISO-Zeitpunkte; außerhalb des Fensters erscheint nichts
 *   verzoegerungStunden    so lange nach dem Auslöser warten (0–720)
 *   erzwingen              „Später“ und Schließen zählen nicht als Ablehnung; die
 *                          Umfrage kommt beim nächsten Start, Sync oder Update-Check
 *                          wieder, bis sie beantwortet ist (bleibt wegklickbar)
 *   spaeterTage            Pause nach „Später“ (1–60, Standard 3)
 *   ruheStunden            Abstand zur nächsten Umfrage (0–168, Standard 20)
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

const TYPEN = ["einfach", "mehrfach", "skala", "nps", "euro", "text", "matrix"];
const ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
const FRAGE_ID = /^[A-Za-z][A-Za-z0-9_]{0,40}$/;

/**
 * Prüft eine Umfrage-Definition aus dem Admin-Editor und gibt eine bereinigte
 * Fassung zurück — oder `{ fehler }` mit einem verständlichen Grund.
 */
export function pruefeDefinition(roh) {
  const u = roh && typeof roh === "object" ? roh : {};
  const id = String(u.id || "").trim();
  if (!ID.test(id)) return { fehler: "ID: 2–41 Zeichen, Kleinbuchstaben, Ziffern und Bindestriche." };
  const titel = String(u.titel || "").trim().slice(0, 120);
  if (titel.length < 3) return { fehler: "Bitte einen Titel angeben." };
  const beschreibung = String(u.beschreibung || "").trim().slice(0, 600);

  let ausloeser;
  const a = u.ausloeser || {};
  if (a.art === "sofort") ausloeser = { art: "sofort" };
  else if (a.art === "tage" && Number.isInteger(Number(a.wert)) && Number(a.wert) >= 0 && Number(a.wert) <= 365)
    ausloeser = { art: "tage", wert: Number(a.wert) };
  else if (a.art === "meilenstein" && ["bewerbungen", "anschreiben"].includes(a.zaehler) && Number.isInteger(Number(a.wert)) && Number(a.wert) >= 1)
    ausloeser = { art: "meilenstein", zaehler: a.zaehler, wert: Number(a.wert) };
  else return { fehler: "Auslöser: sofort, nach X Tagen oder Meilenstein (Bewerbungen/Anschreiben)." };

  const zeitpunkt = (v) => {
    if (v === undefined || v === null || v === "") return null;
    const t = new Date(String(v));
    return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
  };
  const start = zeitpunkt(u.start);
  const ende = zeitpunkt(u.ende);
  if (start === undefined) return { fehler: "Start: kein gültiges Datum." };
  if (ende === undefined) return { fehler: "Ende: kein gültiges Datum." };
  if (start && ende && ende <= start) return { fehler: "Das Ende muss nach dem Start liegen." };
  const ganzzahl = (v, min, max, name) => {
    if (v === undefined || v === null || v === "") return { wert: null };
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) return { fehler: `${name}: ganze Zahl von ${min} bis ${max}.` };
    return { wert: n };
  };
  const verzoegerung = ganzzahl(u.verzoegerungStunden, 0, 720, "Verzögerung");
  const spaeter = ganzzahl(u.spaeterTage, 1, 60, "Pause nach „Später“");
  const ruhe = ganzzahl(u.ruheStunden, 0, 168, "Abstand zur nächsten Umfrage");
  for (const x of [verzoegerung, spaeter, ruhe]) if (x.fehler) return { fehler: x.fehler };
  const zeitplan = {
    erzwingen: Boolean(u.erzwingen),
    ...(start ? { start } : {}),
    ...(ende ? { ende } : {}),
    ...(verzoegerung.wert ? { verzoegerungStunden: verzoegerung.wert } : {}),
    ...(spaeter.wert ? { spaeterTage: spaeter.wert } : {}),
    ...(ruhe.wert !== null ? { ruheStunden: ruhe.wert } : {}),
  };

  if (!Array.isArray(u.fragen) || u.fragen.length === 0) return { fehler: "Mindestens eine Frage." };
  if (u.fragen.length > 60) return { fehler: "Höchstens 60 Fragen." };
  const ids = new Set();
  const fragen = [];
  for (const [i, f] of u.fragen.entries()) {
    const nr = `Frage ${i + 1}`;
    const fid = String(f?.id || "").trim();
    if (!FRAGE_ID.test(fid)) return { fehler: `${nr}: ID mit Buchstaben beginnen, nur Buchstaben/Ziffern/_.` };
    if (ids.has(fid)) return { fehler: `${nr}: ID „${fid}“ doppelt.` };
    ids.add(fid);
    if (!TYPEN.includes(f.typ)) return { fehler: `${nr}: unbekannter Typ.` };
    const text = String(f.text || "").trim().slice(0, 300);
    if (text.length < 3) return { fehler: `${nr}: Fragetext fehlt.` };
    const frage = { id: fid, typ: f.typ, text, pflicht: Boolean(f.pflicht) };
    const abschnitt = String(f.abschnitt || "").trim().slice(0, 60);
    if (abschnitt) frage.abschnitt = abschnitt;
    const liste = (x) => (Array.isArray(x) ? x : String(x || "").split("\n")).map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
    if (f.typ === "einfach" || f.typ === "mehrfach") {
      frage.optionen = [...new Set(liste(f.optionen))];
      if (frage.optionen.length < 2) return { fehler: `${nr}: mindestens zwei Antwortmöglichkeiten.` };
    }
    if (f.typ === "matrix") {
      frage.zeilen = [...new Set(liste(f.zeilen))];
      if (frage.zeilen.length < 1) return { fehler: `${nr}: mindestens eine Zeile.` };
    }
    if (f.typ === "skala" && Array.isArray(f.labels) && f.labels.length === 2 && f.labels.every((l) => String(l).trim()))
      frage.labels = f.labels.map((l) => String(l).trim().slice(0, 40));
    if (f.typ === "euro") {
      const max = Number(f.max);
      frage.max = Number.isFinite(max) && max > 0 && max <= 100000 ? max : 1000;
    }
    fragen.push(frage);
  }
  return { umfrage: { id, titel, beschreibung, aktiv: Boolean(u.aktiv), ausloeser, ...zeitplan, fragen } };
}
