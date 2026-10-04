/**
 * Kopfbereich (YAML zwischen ---) der Inhalte lesen und schreiben, im Umfang,
 * den die Sammlungen nutzen: `schluessel: wert`, Listen als `- eintrag` oder
 * `[a, b]`. Unbekannte Schlüssel bleiben Zeile für Zeile erhalten.
 */

export type Wert = string | string[];

export interface Kopf {
  /** Schlüssel in Originalreihenfolge mit Rohzeilen (für Unbekanntes). */
  eintraege: { schluessel: string; roh: string[] }[];
  werte: Record<string, Wert>;
}

const KOPF = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function entquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  return t;
}

/**
 * Wert für YAML: in Anführungszeichen, sobald er sonst falsch gelesen würde
 * (Doppelpunkt, Raute, Sonderzeichen am Anfang, true/false, Zahlen). `roh`
 * schreibt Zahlen und Daten bewusst ohne Anführungszeichen.
 */
export function yamlWert(v: string, roh = false): string {
  if (roh) return v;
  if (v === "") return '""';
  const riskant = /: |#|^[\s\-?:,[\]{}&*!|>'"%@`]|\s$|^(true|false|null|yes|no|on|off|~)$/i.test(v) || /^[\d.+-]+$/.test(v);
  return riskant ? `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : v;
}

export function zerlege(markdown: string): { kopf: Kopf; rumpf: string } {
  const m = KOPF.exec(markdown);
  const kopf: Kopf = { eintraege: [], werte: {} };
  if (!m) return { kopf, rumpf: markdown };
  let akt: { schluessel: string; roh: string[] } | null = null;
  for (const zeile of m[1].split(/\r?\n/)) {
    const k = /^([A-Za-z_][\w-]*):(.*)$/.exec(zeile);
    if (k) {
      akt = { schluessel: k[1], roh: [zeile] };
      kopf.eintraege.push(akt);
      const rest = k[2].trim();
      if (rest.startsWith("[") && rest.endsWith("]"))
        kopf.werte[k[1]] = rest
          .slice(1, -1)
          .split(",")
          .map((x) => entquote(x))
          .filter(Boolean);
      else kopf.werte[k[1]] = rest === "" ? [] : entquote(rest);
    } else if (akt) {
      akt.roh.push(zeile);
      const li = /^\s+-\s+(.*)$/.exec(zeile);
      if (li) {
        const w = kopf.werte[akt.schluessel];
        kopf.werte[akt.schluessel] = [...(Array.isArray(w) ? w : []), entquote(li[1])];
      }
    }
  }
  return { kopf, rumpf: markdown.slice(m[0].length).replace(/^\r?\n/, "") };
}

/**
 * Setzt bekannte Werte neu und behält alle anderen Zeilen. Ein leerer Wert
 * entfernt den Schlüssel. Schlüssel in `roh` (Zahlen, Daten) ohne Anführungszeichen.
 */
export function baue(kopf: Kopf, werte: Record<string, Wert | undefined>, rumpf: string, roh: Set<string> = new Set()): string {
  const zeilen: string[] = [];
  const gesetzt = new Set<string>();
  const schreibe = (k: string, w: Wert) => {
    if (Array.isArray(w)) {
      zeilen.push(`${k}:`);
      for (const x of w) zeilen.push(`  - ${yamlWert(x)}`);
    } else zeilen.push(`${k}: ${yamlWert(w, roh.has(k))}`);
  };
  for (const e of kopf.eintraege) {
    if (e.schluessel in werte) {
      gesetzt.add(e.schluessel);
      const w = werte[e.schluessel];
      if (w === undefined || (typeof w === "string" && w === "")) continue;
      schreibe(e.schluessel, w);
    } else zeilen.push(...e.roh);
  }
  for (const [k, w] of Object.entries(werte)) {
    if (gesetzt.has(k) || w === undefined || w === "" || (Array.isArray(w) && !w.length)) continue;
    schreibe(k, w);
  }
  return `---\n${zeilen.join("\n")}\n---\n\n${rumpf.replace(/^\n+/, "")}`;
}
