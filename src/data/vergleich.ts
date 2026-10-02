/**
 * Vergleich cockpit · Teal · Huntr · Tabelle. Eine Quelle für die Startseite
 * (kompakt) und /vergleich/ (voll). Angaben zu Teal und Huntr laut deren
 * Preisseiten; bei jeder Änderung `STAND` anpassen.
 */
export const STAND = "Oktober 2026";

export const QUELLEN = [
  { name: "Teal: Preise", href: "https://www.tealhq.com/pricing" },
  { name: "Huntr: Preise", href: "https://huntr.co/pricing" },
  { name: "Huntr: Tarife im Hilfe-Center", href: "https://help.huntr.co/en/articles/10714568-plan-types-and-pricing" },
];

/** ja | nein | teils | Text. `pro: true` markiert eine Pro-Funktion von cockpit. */
export type Zelle = { wert: "ja" | "nein" | "teils" | "text"; text?: string; pro?: boolean };
export type Zeile = { merkmal: string; kompakt?: boolean; cockpit: Zelle; teal: Zelle; huntr: Zelle; tabelle: Zelle };

const ja = (text?: string, pro = false): Zelle => ({ wert: "ja", text, pro });
const nein = (text?: string): Zelle => ({ wert: "nein", text });
const teils = (text: string): Zelle => ({ wert: "teils", text });
const t = (text: string): Zelle => ({ wert: "text", text });

export const ZEILEN: Zeile[] = [
  {
    merkmal: "Preis",
    kompakt: true,
    cockpit: t("Kostenlos; Pro: Preis noch offen"),
    teal: t("Kostenlos; Teal+ 13 $/Woche, 29 $/30 Tage, 79 $/90 Tage"),
    huntr: t("Kostenlos; Pro 40 $/Monat, 90 $/3 Monate, 160 $/6 Monate"),
    tabelle: t("kostenlos"),
  },
  {
    merkmal: "Wo deine Daten liegen",
    kompakt: true,
    cockpit: ja("auf deinem Rechner"),
    teal: nein("beim Anbieter"),
    huntr: nein("beim Anbieter"),
    tabelle: ja("bei dir"),
  },
  {
    merkmal: "Ohne Konto nutzbar",
    kompakt: true,
    cockpit: ja(),
    teal: nein(),
    huntr: nein(),
    tabelle: ja(),
  },
  {
    merkmal: "Bewerbungen verfolgen",
    kompakt: true,
    cockpit: ja("unbegrenzt, kostenlos"),
    teal: ja("unbegrenzt, kostenlos"),
    huntr: teils("kostenlos bis 100"),
    tabelle: ja("von Hand"),
  },
  {
    merkmal: "Kontakte und Aufgaben je Bewerbung",
    cockpit: ja(),
    teal: ja(),
    huntr: ja(),
    tabelle: teils("von Hand"),
  },
  {
    merkmal: "Stichwort-Abgleich mit der Anzeige",
    cockpit: ja("kostenlos"),
    teal: teils("Top 5 kostenlos, voll mit Teal+"),
    huntr: teils("einfach kostenlos, mehr mit Pro"),
    tabelle: nein(),
  },
  {
    merkmal: "Lebenslauf je Stelle anpassen",
    cockpit: ja("mit KI", true),
    teal: teils("Editor kostenlos, KI mit Teal+"),
    huntr: teils("2 kostenlos, dann Pro"),
    tabelle: nein(),
  },
  {
    merkmal: "KI-Anschreiben",
    cockpit: ja("ohne Grenze, mit eigenem Schlüssel"),
    teal: teils("2 kostenlos, dann Teal+"),
    huntr: teils("2 Pakete kostenlos, dann Pro"),
    tabelle: nein(),
  },
  {
    merkmal: "Eigener KI-Schlüssel oder lokales Modell",
    kompakt: true,
    cockpit: ja("Anthropic, OpenAI, Gemini, Ollama, LM Studio …"),
    teal: nein(),
    huntr: nein(),
    tabelle: nein(),
  },
  {
    merkmal: "Deutsche Stellenquellen (Arbeitsagentur)",
    kompakt: true,
    cockpit: ja(),
    teal: nein(),
    huntr: nein(),
    tabelle: nein(),
  },
  {
    merkmal: "Oberfläche auf Deutsch",
    cockpit: ja(),
    teal: nein("Englisch"),
    huntr: nein("Englisch"),
    tabelle: ja(),
  },
  {
    merkmal: "Browser-Erweiterung: Stellen speichern",
    cockpit: ja("Chrome, Edge"),
    teal: ja(),
    huntr: ja(),
    tabelle: nein(),
  },
  {
    merkmal: "Formulare automatisch ausfüllen",
    cockpit: ja("Erweiterung", true),
    teal: t("–"),
    huntr: ja("kostenlos"),
    tabelle: nein(),
  },
  {
    merkmal: "Funktioniert offline",
    kompakt: true,
    cockpit: ja(),
    teal: nein(),
    huntr: nein(),
    tabelle: ja(),
  },
  {
    merkmal: "Mehrere Geräte",
    cockpit: ja("eigener Ordner kostenlos, cockpit-Server mit Pro; verschlüsselt"),
    teal: ja("über das Konto"),
    huntr: ja("über das Konto"),
    tabelle: teils("über deinen Cloud-Speicher"),
  },
];
