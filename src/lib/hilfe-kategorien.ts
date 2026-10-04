/** Kategorien der Dokumentation, in dieser Reihenfolge auf /hilfe/. Auch der Inhalte-Editor im Admin nutzt die Liste. */
export const HILFE_KATEGORIEN = [
  "Einstieg",
  "Stellen und Bewerbungen",
  "Kommunikation und Termine",
  "KI und Unterlagen",
  "Daten und Sicherheit",
  "Fehlerbehebung",
] as const;

/** Roadmap-Status, wie in src/content.config.ts. */
export const ROADMAP_STATUS = ["erledigt", "jetzt", "naechstes", "spaeter"] as const;
