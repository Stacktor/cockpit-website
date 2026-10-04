/**
 * Inhalte-Editor: Blog, Hilfe, Funktionen und Roadmap der Website bearbeiten.
 *
 * Links die Sammlungen mit ihren Dateien, rechts ein Formular für den
 * Kopfbereich, eine Werkzeugleiste, der Markdown-Text mit Live-Vorschau und
 * die Textprüfung nach dem Leitfaden. Speichern legt über /api/admin/inhalte
 * einen Commit an; danach baut Cloudflare Pages die Seite neu.
 */
import { marked } from "marked";
import { h, svg, ICONS, type Daten } from "./dom";
import { api, bestaetigen, hinweisKachel, karte, knopf, leer, toast } from "./ui";
import { saeubern } from "./saeubern";
import { pruefe, woerter } from "./textpruefung";
import { baue, zerlege, type Kopf, type Wert } from "./frontmatter";
import { HILFE_KATEGORIEN, ROADMAP_STATUS } from "../../lib/hilfe-kategorien";

type Art = "text" | "lang" | "zahl" | "datum" | "liste" | "zeilen" | "wahl";
interface Feld {
  name: string;
  titel: string;
  art: Art;
  pflicht?: boolean;
  werte?: readonly string[];
  hilfe?: string;
}

/** Felder je Sammlung, wie in src/content.config.ts. */
const SAMMLUNG: Record<string, { titel: string; felder: Feld[]; vorlage: string }> = {
  blog: {
    titel: "Blog",
    felder: [
      { name: "titel", titel: "Titel", art: "text", pflicht: true },
      { name: "beschreibung", titel: "Beschreibung", art: "lang", pflicht: true, hilfe: "Erscheint in der Übersicht und als Vorschau in Suchmaschinen." },
      { name: "datum", titel: "Datum", art: "datum", pflicht: true },
      { name: "tags", titel: "Tags", art: "liste", hilfe: "Mit Komma getrennt." },
    ],
    vorlage: "Ein Satz, worum es geht und für wen.\n\n## Erster Abschnitt\n\nText.\n",
  },
  hilfe: {
    titel: "Hilfe",
    felder: [
      { name: "titel", titel: "Titel", art: "text", pflicht: true },
      { name: "beschreibung", titel: "Beschreibung", art: "lang", pflicht: true },
      { name: "kategorie", titel: "Kategorie", art: "wahl", werte: HILFE_KATEGORIEN, pflicht: true },
      { name: "reihenfolge", titel: "Reihenfolge", art: "zahl", pflicht: true, hilfe: "Innerhalb der Kategorie aufsteigend: Einstieg 1–9, Stellen 10–19, Kommunikation 20–29, KI 30–39, Daten 40–49, Fehler 50–59." },
      { name: "icon", titel: "Symbol", art: "text", pflicht: true, hilfe: "Name aus src/components/Icon.astro, z. B. mail, search, shield-check." },
      { name: "stand", titel: "Stand", art: "text", hilfe: "Monat der letzten Prüfung, z. B. Oktober 2026." },
    ],
    vorlage: "Ein, zwei Sätze, was dieser Artikel klärt.\n\n## Erster Schritt\n\n1. **Einstellungen → …**\n2. …\n",
  },
  funktionen: {
    titel: "Funktionen",
    felder: [
      { name: "titel", titel: "Titel", art: "text", pflicht: true },
      { name: "kurz", titel: "Kurzbeschreibung", art: "text", pflicht: true },
      { name: "beschreibung", titel: "Beschreibung", art: "lang", pflicht: true },
      { name: "icon", titel: "Symbol", art: "text", pflicht: true },
      { name: "reihenfolge", titel: "Reihenfolge", art: "zahl", pflicht: true },
      { name: "screen", titel: "Screenshot", art: "text", pflicht: true, hilfe: "Kennung aus src/assets/screens ohne light-/dark-." },
      { name: "punkte", titel: "Punkte", art: "zeilen", pflicht: true, hilfe: "Mindestens drei, einer pro Zeile." },
    ],
    vorlage: "Worum es geht, in zwei Sätzen.\n\n## So funktioniert es\n\nText.\n",
  },
  roadmap: {
    titel: "Roadmap",
    felder: [
      { name: "titel", titel: "Titel", art: "text", pflicht: true },
      { name: "status", titel: "Status", art: "wahl", werte: ROADMAP_STATUS, pflicht: true },
      { name: "reihenfolge", titel: "Reihenfolge", art: "zahl", pflicht: true },
    ],
    vorlage: "Was geplant ist und warum.\n",
  },
};
const ROH = new Set(["reihenfolge", "datum"]);

interface Offen {
  pfad: string;
  sha: string | null;
  kopf: Kopf;
  original: string;
  url?: string;
}

let auswahlSammlung = "hilfe";
let offen: Offen | null = null;
let geaendert = false;

addEventListener("beforeunload", (e) => {
  if (geaendert) e.preventDefault();
});
addEventListener("hashchange", () => {
  // Beim Verlassen des Bereichs gilt die Änderung als verworfen; der Browser fragt nicht nach.
  if (!location.hash.startsWith("#/inhalte")) geaendert = false;
});

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

function wertAlsText(w: Wert | undefined, art: Art): string {
  if (w === undefined) return "";
  if (Array.isArray(w)) return art === "zeilen" ? w.join("\n") : w.join(", ");
  return w;
}

function textAlsWert(t: string, art: Art): Wert {
  if (art === "liste")
    return t
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  if (art === "zeilen")
    return t
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  return t.trim();
}

export async function inhalte(ziel: HTMLElement) {
  const d = await api("inhalte");
  if (!d.ok) {
    ziel.append(
      hinweisKachel(d)!,
      karte(
        "So richtest du den Editor ein",
        h(
          "ol",
          { class: "a-doku-schritte" },
          h("li", {}, "Auf GitHub einen Fine-grained Token anlegen, nur für ", h("code", {}, d.repo || "Stacktor/cockpit-website"), "."),
          h("li", {}, "Recht: „Contents: Read and write“. Sonst nichts."),
          h("li", {}, "Unter Einstellungen als „GitHub (Inhalte bearbeiten)“ eintragen."),
        ),
      ),
    );
    return;
  }
  const sammlungen: Daten[] = d.sammlungen;

  const seite = h("aside", { class: "a-karte a-doku-seite a-ed-seite" });
  const arbeit = h("section", { class: "a-karte a-ed" });
  /** Strg+S speichert im ganzen Editor, auch aus den Feldern des Kopfbereichs. */
  let speichernJetzt: (() => void) | null = null;
  arbeit.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      speichernJetzt?.();
    }
  });
  ziel.append(h("div", { class: "a-doku a-ed-raster" }, seite, arbeit));

  const zeichneSeite = () => {
    const s = sammlungen.find((x) => x.id === auswahlSammlung) ?? sammlungen[0];
    const reiter = h(
      "div",
      { class: "a-ed-reiter", role: "tablist", "aria-label": "Sammlungen" },
      ...sammlungen.map((x) =>
        h(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-selected": x.id === s.id ? "true" : "false",
            onclick: async () => {
              if (!(await weiterOhneSpeichern())) return;
              auswahlSammlung = x.id;
              zeichneSeite();
            },
          },
          SAMMLUNG[x.id]?.titel ?? x.id,
          h("span", { class: "a-ed-zahl" }, String(x.dateien.length)),
        ),
      ),
    );
    const liste = h(
      "nav",
      { class: "a-doku-liste", "aria-label": "Dateien" },
      ...s.dateien.map((x: Daten) =>
        h(
          "button",
          {
            type: "button",
            class: "a-doku-link",
            "aria-current": offen?.pfad === x.pfad ? "page" : null,
            onclick: () => oeffne(x.pfad),
          },
          x.pfad.split("/").pop().replace(/\.md$/, ""),
        ),
      ),
    );
    if (!s.dateien.length) liste.append(h("p", { class: "a-klein" }, "Noch keine Dateien."));
    seite.replaceChildren(
      h("div", { class: "a-doku-repo a-mono" }, svg(ICONS.lizenz, 13), `${d.repo} · ${d.branch}`),
      reiter,
      knopf("Neuer Eintrag", () => neu(s.id), "a-klein", "plus"),
      liste,
    );
  };

  async function weiterOhneSpeichern(): Promise<boolean> {
    if (!geaendert) return true;
    const ok = await bestaetigen("Änderungen verwerfen?", "Die Datei hat ungespeicherte Änderungen. Sie gehen verloren.", "Verwerfen", { gefahr: true });
    if (ok) geaendert = false;
    return ok;
  }

  async function oeffne(pfad: string) {
    if (!(await weiterOhneSpeichern())) return;
    arbeit.replaceChildren(h("div", { class: "a-laden" }, "Lädt …"));
    try {
      const x = await api(`inhalte?pfad=${encodeURIComponent(pfad)}`);
      if (!x.ok) {
        arbeit.replaceChildren(hinweisKachel(x)!);
        return;
      }
      const { kopf, rumpf } = zerlege(x.inhalt);
      offen = { pfad, sha: x.sha, kopf, original: x.inhalt, url: x.url };
      zeichneSeite();
      editor(rumpf);
    } catch (e) {
      arbeit.replaceChildren(h("div", { class: "a-hinweis a-fehler" }, (e as Error).message));
    }
  }

  async function neu(sammlung: string) {
    if (!(await weiterOhneSpeichern())) return;
    const titel = prompt("Titel des neuen Eintrags");
    if (!titel?.trim()) return;
    const name = slug(titel);
    if (!name) return toast("Der Titel ergibt keinen gültigen Dateinamen.", true);
    const pfad = `src/content/${sammlung}/${name}.md`;
    const s = sammlungen.find((x) => x.id === sammlung);
    if (s?.dateien.some((x: Daten) => x.pfad === pfad)) return toast("Eine Datei mit diesem Namen gibt es schon.", true);
    const heute = new Date().toISOString().slice(0, 10);
    const werte: Record<string, Wert> = { titel: titel.trim() };
    if (sammlung === "blog") werte.datum = heute;
    if (sammlung === "hilfe") {
      werte.kategorie = HILFE_KATEGORIEN[0];
      werte.icon = "book-open";
      werte.stand = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    }
    if (sammlung === "roadmap") werte.status = "naechstes";
    const inhalt = baue({ eintraege: [], werte: {} }, werte, SAMMLUNG[sammlung].vorlage, ROH);
    offen = { pfad, sha: null, kopf: zerlege(inhalt).kopf, original: "" };
    geaendert = true;
    zeichneSeite();
    editor(zerlege(inhalt).rumpf);
  }

  function editor(rumpfStart: string) {
    if (!offen) return;
    const o = offen;
    const sammlung = o.pfad.split("/")[2];
    const def = SAMMLUNG[sammlung];
    const eingaben = new Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>();

    const felder = h(
      "div",
      { class: "a-ed-felder" },
      ...def.felder.map((f) => {
        const w = wertAlsText(o.kopf.werte[f.name], f.art);
        let el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (f.art === "wahl") {
          el = h("select", { class: "a-eingabe" }, ...(f.werte ?? []).map((x) => h("option", { value: x, selected: x === w }, x))) as HTMLSelectElement;
        } else if (f.art === "lang" || f.art === "zeilen") {
          el = h("textarea", { class: "a-eingabe", rows: f.art === "zeilen" ? 4 : 2 }) as HTMLTextAreaElement;
          el.value = w;
        } else {
          el = h("input", { class: "a-eingabe", type: f.art === "zahl" ? "number" : f.art === "datum" ? "date" : "text", value: w }) as HTMLInputElement;
        }
        eingaben.set(f.name, el);
        el.addEventListener("input", aktualisiere);
        return h(
          "label",
          { class: `a-feld ${f.art === "lang" || f.art === "zeilen" ? "a-ed-breit" : ""}` },
          h("span", {}, f.titel, f.pflicht ? h("b", { class: "a-ed-pflicht", "aria-hidden": "true" }, " *") : null),
          el,
          f.hilfe ? h("small", {}, f.hilfe) : null,
        );
      }),
    );

    const textfeld = h("textarea", { class: "a-ed-text", spellcheck: "true", lang: "de", "aria-label": "Text (Markdown)" }) as HTMLTextAreaElement;
    textfeld.value = rumpfStart;
    const vorschau = h("article", { class: "a-doku-inhalt a-ed-vorschau", "aria-label": "Vorschau" });
    const pruefung = h("div", { class: "a-ed-pruefung", "aria-live": "polite" });
    const status = h("span", { class: "a-ed-status a-mono" });
    const zahlen = h("span", { class: "a-klein" });

    const einfuegen = (vor: string, nach = "", platzhalter = "") => {
      const { selectionStart: a, selectionEnd: b, value } = textfeld;
      const auswahl = value.slice(a, b) || platzhalter;
      textfeld.setRangeText(vor + auswahl + nach, a, b, "end");
      if (!value.slice(a, b) && platzhalter) textfeld.setSelectionRange(a + vor.length, a + vor.length + platzhalter.length);
      textfeld.focus();
      aktualisiere();
    };
    const zeilenAnfang = (praefix: string) => {
      const { selectionStart: a, selectionEnd: b, value } = textfeld;
      const start = value.lastIndexOf("\n", a - 1) + 1;
      const ende = value.indexOf("\n", b);
      const block = value.slice(start, ende === -1 ? value.length : ende);
      let n = 0;
      const neu = block
        .split("\n")
        .map((z) => (praefix === "1. " ? `${++n}. ${z.replace(/^\d+\.\s+/, "")}` : z.startsWith(praefix) ? z.slice(praefix.length) : praefix + z))
        .join("\n");
      textfeld.setRangeText(neu, start, ende === -1 ? value.length : ende, "select");
      textfeld.focus();
      aktualisiere();
    };
    const werkzeug = (titel: string, kurz: string, fn: () => void, taste?: string) =>
      h("button", { type: "button", class: "a-ed-wz", title: taste ? `${titel} (${taste})` : titel, "aria-label": titel, onclick: fn }, kurz);
    const leiste = h(
      "div",
      { class: "a-ed-leiste", role: "toolbar", "aria-label": "Formatierung" },
      werkzeug("Zwischenüberschrift", "H2", () => zeilenAnfang("## ")),
      werkzeug("Unterüberschrift", "H3", () => zeilenAnfang("### ")),
      werkzeug("Fett", "B", () => einfuegen("**", "**", "fett"), "Strg+B"),
      werkzeug("Kursiv", "I", () => einfuegen("*", "*", "kursiv"), "Strg+I"),
      werkzeug("Link", "Link", () => {
        const url = prompt("Adresse (https://… oder /hilfe/…)");
        if (url) einfuegen("[", `](${url.trim()})`, "Linktext");
      }, "Strg+K"),
      werkzeug("Liste", "•", () => zeilenAnfang("- ")),
      werkzeug("Nummerierte Liste", "1.", () => zeilenAnfang("1. ")),
      werkzeug("Zitat", "„“", () => zeilenAnfang("> ")),
      werkzeug("Code", "</>", () => einfuegen("`", "`", "code")),
      werkzeug("Tabelle", "Tabelle", () => einfuegen("\n| Spalte | Spalte |\n|---|---|\n| | |\n")),
      h("span", { class: "a-ed-luecke" }),
      ...(["geteilt", "text", "vorschau"] as const).map((m) =>
        h(
          "button",
          {
            type: "button",
            class: "a-ed-ansicht",
            "data-modus": m,
            "aria-pressed": m === "geteilt" ? "true" : "false",
            onclick: () => {
              flaeche.dataset.modus = m;
              leiste.querySelectorAll<HTMLElement>(".a-ed-ansicht").forEach((k) => k.setAttribute("aria-pressed", String(k.dataset.modus === m)));
            },
          },
          m === "geteilt" ? "Geteilt" : m === "text" ? "Text" : "Vorschau",
        ),
      ),
    );
    const flaeche = h("div", { class: "a-ed-flaeche", "data-modus": "geteilt" }, textfeld, vorschau);

    const speichern = knopf("Speichern", () => void sichern(), "a-p", "haken");
    const kopf = h(
      "div",
      { class: "a-ed-kopf" },
      h("div", {}, h("div", { class: "a-mono a-ed-pfad" }, o.pfad), status),
      h(
        "div",
        { class: "a-ed-aktionen" },
        o.url ? h("a", { href: o.url, target: "_blank", rel: "noopener noreferrer", class: "a-knopf a-klein" }, svg(ICONS.extern, 14), "GitHub") : null,
        speichern,
      ),
    );

    function inhaltJetzt(): string {
      const werte: Record<string, Wert> = {};
      for (const f of def.felder) werte[f.name] = textAlsWert(eingaben.get(f.name)!.value, f.art);
      return baue(o.kopf, werte, textfeld.value, ROH);
    }

    let zeitgeber: number | undefined;
    function aktualisiere() {
      geaendert = inhaltJetzt() !== o.original;
      status.textContent = o.sha ? (geaendert ? "Ungespeicherte Änderungen" : "Gespeichert") : "Neu, noch nicht gespeichert";
      status.classList.toggle("offen", geaendert || !o.sha);
      clearTimeout(zeitgeber);
      zeitgeber = window.setTimeout(zeichneVorschau, 150);
    }

    function zeichneVorschau() {
      const html = marked.parse(textfeld.value, { async: false, gfm: true }) as string;
      vorschau.replaceChildren(saeubern(html));
      const alles = inhaltJetzt();
      const n = woerter(alles);
      zahlen.textContent = `${n.toLocaleString("de-DE")} Wörter · etwa ${Math.max(1, Math.round(n / 200))} Min. Lesezeit`;
      const funde = pruefe(alles);
      const fehlend = def.felder.filter((f) => f.pflicht && !String(eingaben.get(f.name)!.value).trim()).map((f) => f.titel);
      const teile: (Node | null)[] = [
        h(
          "div",
          { class: "a-ed-pruefung-kopf" },
          h("b", {}, "Textprüfung"),
          h("span", { class: `a-badge ${funde.length ? "warn" : "ok"}` }, funde.length ? `${funde.length} Hinweise` : "keine Hinweise"),
          zahlen,
        ),
        fehlend.length ? h("p", { class: "a-hinweis a-fehler" }, `Pflichtfelder fehlen: ${fehlend.join(", ")}.`) : null,
        funde.length
          ? h(
              "ul",
              {},
              ...funde.slice(0, 30).map((f) =>
                h(
                  "li",
                  {},
                  f.zeile
                    ? h("button", { type: "button", class: "a-ed-zeile a-mono", onclick: () => springe(f.zeile!) }, `Z. ${f.zeile}`)
                    : null,
                  h("b", {}, f.regel),
                  " ",
                  f.text,
                ),
              ),
            )
          : null,
      ];
      pruefung.replaceChildren(...(teile.filter(Boolean) as Node[]));
      speichern.disabled = fehlend.length > 0 || (!geaendert && Boolean(o.sha));
    }

    /** Zeile im Gesamttext (mit Kopf) → Position im Textfeld (ohne Kopf). */
    function springe(zeile: number) {
      const kopfZeilen = inhaltJetzt().split("\n").length - textfeld.value.split("\n").length;
      const ziel = Math.max(0, zeile - 1 - kopfZeilen);
      const zeilen = textfeld.value.split("\n");
      const pos = zeilen.slice(0, ziel).reduce((s, z) => s + z.length + 1, 0);
      flaeche.dataset.modus = flaeche.dataset.modus === "vorschau" ? "geteilt" : flaeche.dataset.modus;
      textfeld.focus();
      textfeld.setSelectionRange(pos, pos + (zeilen[ziel]?.length ?? 0));
      const hoehe = textfeld.scrollHeight / Math.max(1, zeilen.length);
      textfeld.scrollTop = Math.max(0, ziel * hoehe - textfeld.clientHeight / 3);
    }

    async function sichern() {
      const inhalt = inhaltJetzt();
      speichern.disabled = true;
      try {
        const r = await api("inhalte", { pfad: o.pfad, inhalt, sha: o.sha });
        o.sha = r.sha ?? o.sha;
        o.original = inhalt;
        o.kopf = zerlege(inhalt).kopf;
        geaendert = false;
        toast(r.meldung || "Gespeichert.");
        const s = sammlungen.find((x) => x.id === sammlung);
        if (s && !s.dateien.some((x: Daten) => x.pfad === o.pfad)) {
          s.dateien.push({ pfad: o.pfad });
          s.dateien.sort((a: Daten, b: Daten) => a.pfad.localeCompare(b.pfad, "de"));
          zeichneSeite();
        }
        aktualisiere();
      } catch (e) {
        toast((e as Error).message, true);
        speichern.disabled = false;
      }
    }

    textfeld.addEventListener("input", aktualisiere);
    textfeld.addEventListener("keydown", (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "b") {
        e.preventDefault();
        einfuegen("**", "**", "fett");
      } else if (k === "i") {
        e.preventDefault();
        einfuegen("*", "*", "kursiv");
      } else if (k === "k") {
        e.preventDefault();
        const url = prompt("Adresse (https://… oder /hilfe/…)");
        if (url) einfuegen("[", `](${url.trim()})`, "Linktext");
      }
    });
    // Vorschau scrollt mit dem Text mit (anteilig).
    textfeld.addEventListener("scroll", () => {
      const anteil = textfeld.scrollTop / Math.max(1, textfeld.scrollHeight - textfeld.clientHeight);
      vorschau.scrollTop = anteil * (vorschau.scrollHeight - vorschau.clientHeight);
    });

    speichernJetzt = () => {
      if (!speichern.disabled) void sichern();
    };
    arbeit.replaceChildren(kopf, felder, leiste, flaeche, pruefung);
    aktualisiere();
    zeichneVorschau();
  }

  zeichneSeite();
  if (offen && sammlungen.some((s) => s.dateien.some((x: Daten) => x.pfad === offen!.pfad))) await oeffne(offen.pfad);
  else
    arbeit.replaceChildren(
      leer("Links eine Datei wählen oder einen neuen Eintrag anlegen. Gespeichert wird als Commit auf den Haupt-Branch; die Website baut danach von selbst neu."),
    );
}
