/**
 * Textprüfung im Inhalte-Editor nach dem Leitfaden für Texte
 * (cockpit-docs/leitfaeden/texte.md): Stimme des Unternehmens, keine
 * Gedankenstriche als Stilmittel, keine Werbewörter, kurze Sätze, keine Emojis.
 * Die Prüfung meldet nur; sie ändert nichts am Text.
 */

export interface Fund {
  regel: string;
  text: string;
  /** Zeile im Markdown (1-basiert), wenn eindeutig. */
  zeile?: number;
}

const WERBEWOERTER: [RegExp, string][] = [
  [/\bnahtlos\w*/giu, "„nahtlos“ weglassen oder sagen, was genau ohne Bruch geht"],
  [/\bmühelos\w*/giu, "„mühelos“ weglassen"],
  [/\bspielend leicht\b/giu, "„spielend leicht“ weglassen"],
  [/\brevolutionär\w*|\bbahnbrechend\w*|\bnext level\b/giu, "Superlativ weglassen"],
  [/\bvielfältig\w*|\bumfassend\w*|\bganzheitlich\w*/giu, "aufzählen statt „vielfältig/umfassend“"],
  [/\bÖkosystem\w*|\bHub\b/gu, "„App“, „cockpit“ oder „Funktion“ statt Hub/Ökosystem"],
  [/\beintauchen\b|\bentdecken Sie\b|\berleben Sie\b/giu, "„ansehen“, „ausprobieren“ oder „lesen“"],
  [/\bes ist wichtig zu beachten\b/giu, "direkt sagen"],
  [/\bzusammenfassend\b|^#+\s*fazit\b/gimu, "kein Fazit, der letzte Satz ist eine Information"],
  [/\bnicht nur\b[^.!?]{0,80}\bsondern auch\b/giu, "„nicht nur … sondern auch“ als Effekt vermeiden"],
  [/\bLLM\b|\bTool-Use\b/gu, "„KI“ bzw. „Werkzeug-Aufrufe“ in Texten für Nutzer"],
];

const ICH = /(?<![\p{L}„"'])(ich|mich|mir|mein|meine|meinen|meinem|meiner|meines)(?![\p{L}])/giu;
const EMOJI = /\p{Extended_Pictographic}/u;

/** Kopfbereich (zwischen ---) abtrennen; liefert Text und Zeilenversatz. */
export function rumpf(markdown: string): { text: string; versatz: number } {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(markdown);
  if (!m) return { text: markdown, versatz: 0 };
  return { text: markdown.slice(m[0].length), versatz: m[0].split("\n").length - 1 };
}

/** Code-Blöcke und Inline-Code ausblenden, damit sie nicht geprüft werden (Zeilen bleiben erhalten). */
function ohneCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, (b) => b.replace(/[^\n]/g, " ")).replace(/`[^`\n]*`/g, (b) => " ".repeat(b.length));
}

export function pruefe(markdown: string): Fund[] {
  const { text, versatz } = rumpf(markdown);
  const zeilen = ohneCode(text).split("\n");
  const funde: Fund[] = [];
  zeilen.forEach((z, i) => {
    const zeile = i + 1 + versatz;
    const istTabelle = /^\s*\|/.test(z);
    // Gedankenstrich: in Tabellen als Platzhalter („—“) erlaubt.
    if (!istTabelle && /\S\s+—\s+\S|\S—\S/.test(z)) funde.push({ regel: "Gedankenstrich", text: "Zwei Sätze, Doppelpunkt oder Komma statt „—“.", zeile });
    for (const [re, hinweis] of WERBEWOERTER) {
      re.lastIndex = 0;
      const m = re.exec(z);
      if (m) funde.push({ regel: `„${m[0]}“`, text: hinweis, zeile });
    }
    ICH.lastIndex = 0;
    const ich = ICH.exec(z.replace(/„[^“]*“|"[^"]*"/g, ""));
    if (ich) funde.push({ regel: "Ich-Form", text: `„${ich[0]}“: cockpit spricht als Unternehmen, die Anrede bleibt beim Du.`, zeile });
    if (EMOJI.test(z)) funde.push({ regel: "Emoji", text: "Keine Emojis auf der Website.", zeile });
    if ((z.match(/!(?!\[)/g) ?? []).length > 1) funde.push({ regel: "Ausrufezeichen", text: "Höchstens eins, besser keins.", zeile });
    if (!istTabelle && !/^\s*(#|[-*]|\d+\.)/.test(z)) {
      for (const satz of z.split(/(?<=[.?!])\s+/)) {
        const woerter = satz.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
        if (woerter > 30) {
          funde.push({ regel: "Langer Satz", text: `${woerter} Wörter. Ein Gedanke pro Satz.`, zeile });
          break;
        }
      }
    }
  });
  return funde;
}

export function woerter(markdown: string): number {
  return ohneCode(rumpf(markdown).text)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|~-]+/g, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
