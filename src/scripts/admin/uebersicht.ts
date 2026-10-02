/**
 * Übersicht als anpassbares Dashboard.
 *
 * Kacheln (Widgets) stammen aus einem Katalog; welche wo und wie groß stehen,
 * ist das Layout. Es liegt je Person im KV (/api/admin/layout) und zusätzlich
 * im localStorage (sofortiges Zeichnen). „Anpassen“ schaltet den Bearbeiten-
 * Modus: ziehen (Maus) oder per Menü/Pfeiltasten verschieben, Größe ändern,
 * entfernen, aus dem Katalog hinzufügen. Jede Kachel führt per Klick in ihren
 * Bereich. Zusatzdaten (Analytics, Builds, Doku) werden nur geladen, wenn eine
 * passende Kachel auf dem Dashboard liegt.
 */
import { h, svg, ICONS, datum, relativ, zahl, euro, type Daten } from "./dom";
import { api, badge, balken, hinweisKachel, karte, leer, toast, verlauf } from "./ui";
import { dialogFenster, menueZu, popupMenue, type MenuePunkt } from "./menue";

// ═════════════ Übersicht ═════════════
// Aufbau wie die Referenz „Nexus Analytics Dashboard": links (7/12) die
// Hauptkarte mit großer Kennzahl und Tages-Stielen, darunter neueste
// Anmeldungen und die Plätze-Karte; rechts (5/12) der Betriebs-Akkordeon und
// der Alpha-Trichter mit Strichcode-Diagramm.

const TAGE_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function initialen(name = "") {
  const teile = name.trim().split(/\s+/).filter(Boolean);
  return ((teile[0]?.[0] ?? "?") + (teile.length > 1 ? teile[teile.length - 1][0] : "")).toUpperCase();
}

/** Hauptkarte: Anmeldungen der letzten `tage` Tage als Stiele, heute hervorgehoben. */
function heldKarte(a: Daten, tage = 7) {
  const icon = h("div", { class: "a-kachel-icon", style: "width:32px;height:32px" }, svg(ICONS.alpha, 18));
  const kopf = h(
    "div",
    { class: "a-held-kopf" },
    h(
      "div",
      {},
      h("div", { class: "a-held-titel" }, icon, h("h2", { class: "a-maske" }, h("span", { class: "a-rein" }, "Alpha-Anmeldungen"))),
      h("p", {}, "Wie viele Menschen sich für die geschlossene Alpha melden — Tag für Tag und im Vergleich zur Vorwoche."),
    ),
    h("span", { class: "a-pille" }, `${tage} Tage`),
  );
  if (!a.ok) return h("section", { class: "a-karte a-held" }, kopf, hinweisKachel(a));

  const tageListe: { tag: string; anzahl: number }[] = a.proTag ?? [];
  const woche = tageListe.slice(-tage);
  const vorwoche = tageListe.length >= tage * 2 ? tageListe.slice(-tage * 2, -tage) : [];
  const summe = (l: { anzahl: number }[]) => l.reduce((x, t) => x + t.anzahl, 0);
  const jetzt = summe(woche);
  const vorher = summe(vorwoche);
  const aenderung = vorher > 0 ? Math.round(((jetzt - vorher) / vorher) * 100) : null;
  // Echtes Minuszeichen und schmales, geschütztes Leerzeichen vor „%".
  const anzeige = aenderung === null ? `+${zahl(jetzt)}` : `${aenderung >= 0 ? "+" : "−"}${Math.abs(aenderung)}\u202f%`;
  const satz =
    aenderung === null
      ? `${zahl(jetzt)} neue Anmeldungen in ${tage} Tagen, ${zahl(a.gesamt)} insgesamt.`
      : `${zahl(jetzt)} Anmeldungen in ${tage} Tagen gegenüber ${zahl(vorher)} im Zeitraum davor.`;

  const max = Math.max(1, ...woche.map((t) => t.anzahl));
  const stiele = h(
    "div",
    { class: `a-tage${woche.length > 10 ? " dicht" : ""}`, role: "img", "aria-label": `Anmeldungen der letzten ${tage} Tage: ${woche.map((t) => `${TAGE_KURZ[new Date(t.tag).getDay()]} ${t.anzahl}`).join(", ")}` },
    woche.map((t, i) => {
      const heute = i === woche.length - 1;
      // Knoten zwischen 12 % (Maximum) und 72 % (null) der Höhe.
      const oben = 72 - (t.anzahl / max) * 60;
      const kurz = TAGE_KURZ[new Date(t.tag).getDay()];
      const text = `${datum(t.tag)}: ${t.anzahl} ${t.anzahl === 1 ? "Anmeldung" : "Anmeldungen"}`;
      return h(
        "div",
        { class: `a-tag${heute ? " aktiv" : ""}`, tabindex: 0, title: text },
        heute
          ? h("span", { class: "a-wertpille", style: `top:${Math.max(6, oben - 4)}%` }, `${t.anzahl} heute`)
          : [
              h("span", { class: "a-knoten", style: `top:${oben}%` }),
              h("span", { class: "a-stiel", style: `top:${oben + 4}%` }),
              h("span", { class: "a-tip", style: `top:${oben}%` }, `${t.anzahl}`),
            ],
        h("span", { class: "a-kurz" }, woche.length > 10 && !heute && i % 5 !== 0 ? "" : kurz.slice(0, heute ? 2 : 1)),
      );
    }),
  );

  return h(
    "section",
    { class: "a-karte a-held" },
    kopf,
    h(
      "div",
      { class: "a-held-koerper" },
      h("div", { class: "a-held-zahl" }, h("div", { class: "a-maske" }, h("div", { class: "a-anzeige a-rein" }, anzeige)), h("p", {}, satz)),
      stiele,
    ),
  );
}

function neuesteAnmeldungen(a: Daten) {
  if (!a.ok) return h("div", {}, hinweisKachel(a));
  const liste: Daten[] = (a.neueste ?? []).slice(0, 4);
  return h(
    "div",
    {},
    liste.length
      ? h(
          "div",
          { class: "a-kacheln" },
          liste.map((e) =>
            h(
              "a",
              { class: "a-kachel", href: "#/alpha" },
              h(
                "div",
                { class: "a-kachel-links" },
                h("span", { class: "a-avatar", "aria-hidden": "true" }, initialen(e.name)),
                h("div", { style: "min-width:0" }, h("div", { class: "a-kachel-name" }, h("b", {}, e.name || "—"), badge(e.status || "neu")), h("span", { class: "a-kachel-meta" }, `${e.os || "?"} · ${relativ(e.zeit)}`)),
              ),
              h("span", { class: "a-plus", "aria-hidden": "true" }, svg(ICONS.pfeil, 15)),
            ),
          ),
        )
      : h("div", { class: "a-kachel" }, leer("Noch keine Anmeldungen.")),
  );
}

function plaetzeKarte(a: Daten) {
  return h(
    "div",
    { class: "a-promo" },
    h(
      "div",
      {},
      h("h3", {}, "Alpha-Plätze"),
      a.ok ? h("div", { class: "a-promo-zahl" }, `${zahl(a.frei)} frei`) : null,
      h("p", {}, a.ok ? `von ${zahl(a.plaetze)} Plätzen. Ist alles belegt, landen neue Anmeldungen auf der Warteliste.` : "Sobald die Anmeldung verbunden ist, siehst du hier die freien Plätze."),
    ),
    h("a", { class: "a-promo-knopf", href: "#/alpha" }, h("span", {}, "Anmeldungen prüfen"), h("span", { "aria-hidden": "true" }, svg(ICONS.pfeil, 16))),
  );
}

/** Aufklappbarer Eintrag im Betriebs-Akkordeon (erster offen). */
function akkEintrag(opt: { icon: keyof typeof ICONS; titel: string; status: HTMLElement | null; unter: string; offen?: boolean; inhalt: (Node | null | false)[] }) {
  const id = `akk-${Math.random().toString(36).slice(2, 8)}`;
  const inhalt = h("div", { class: "a-akk-inhalt", id, hidden: !opt.offen }, ...opt.inhalt);
  const knopf = h(
    "button",
    { class: "a-akk-kopf", type: "button", "aria-expanded": opt.offen ? "true" : "false", "aria-controls": id },
    h(
      "span",
      { class: "a-akk-links" },
      h("span", { class: `a-kachel-icon${opt.offen ? " a-dunkel" : ""}` }, svg(ICONS[opt.icon], 22)),
      h("span", {}, h("span", { class: "a-akk-titel" }, opt.titel, opt.status), h("span", { class: "a-akk-unter" }, opt.unter)),
    ),
    h("span", { class: "a-chevron", "aria-hidden": "true" }, svg(ICONS.runter, 16)),
  );
  const box = h("div", { class: `a-akk${opt.offen ? " offen" : ""}` }, knopf, inhalt);
  knopf.addEventListener("click", () => {
    const auf = inhalt.hidden === true;
    inhalt.hidden = !auf;
    knopf.setAttribute("aria-expanded", String(auf));
    box.classList.toggle("offen", auf);
    knopf.querySelector(".a-kachel-icon")!.classList.toggle("a-dunkel", auf);
  });
  return box;
}

function betrieb(d: Daten) {
  const { fehler: f, umfragen: u, lizenzen: l, downloads: dl, mails: m } = d;
  const nichtDa = (x: Daten) => (x.ok ? null : h("p", { style: "margin:0" }, x.text || "Nicht verbunden."));
  return h(
    "div",
    {},
    h(
      "div",
      { class: "a-akkordeon" },
      akkEintrag({
        icon: "fehler",
        titel: "Fehlerberichte",
        status: f.ok ? (f.offen ? badge(`${f.offen} offen`, "bad") : badge("Alles erledigt", "ok")) : null,
        unter: f.ok ? `${zahl(f.gesamt)} insgesamt` : "nicht verfügbar",
        offen: true,
        inhalt: [
          nichtDa(f),
          ...(f.ok ? (f.neueste ?? []).slice(0, 2).map((b: Daten) => h("div", { class: "a-zitat" }, b.beschreibung || "—", h("small", {}, `${b.version || "?"} · ${relativ(b.zeit)} · ${b.status || "neu"}`))) : []),
          f.ok && !(f.neueste ?? []).length ? h("p", { style: "margin:0" }, "Noch keine Meldungen aus der App.") : null,
        ],
      }),
      akkEintrag({
        icon: "umfrage",
        titel: "Umfragen",
        status: u.ok && u.nps ? badge(`NPS ${u.nps.wert}`, "info") : null,
        unter: u.ok ? `${zahl(u.gesamt)} Antworten` : "nicht verfügbar",
        inhalt: [
          nichtDa(u),
          u.ok && (u.jeUmfrage ?? []).length ? h("div", { class: "a-chips" }, (u.jeUmfrage as Daten[]).slice(0, 6).map((x) => h("span", { class: "a-chip" }, `${x.name} · ${x.anzahl}`))) : null,
          u.ok ? h("div", { class: "a-meta" }, h("span", {}, u.nps ? `NPS aus ${u.nps.n} Antworten` : "Noch kein NPS"), h("a", { href: "#/umfragen", style: "color:inherit" }, "Zur Auswertung")) : null,
        ],
      }),
      akkEintrag({
        icon: "lizenz",
        titel: "Lizenzen",
        status: l.ok ? badge(`${zahl(l.aktiv)} aktiv`, "ok") : null,
        unter: l.ok ? `${zahl(l.geraete)} Geräte · ${euro(l.umsatz30, l.waehrung)} in 30 Tagen` : "Lemon Squeezy nicht verbunden",
        inhalt: [nichtDa(l), l.ok ? h("a", { href: "#/lizenzen", class: "a-knopf", style: "justify-self:start" }, "Lizenzen öffnen") : null],
      }),
      akkEintrag({
        icon: "download",
        titel: "Downloads",
        status: dl.ok && dl.neueste ? badge(dl.neueste.tag) : null,
        unter: dl.ok ? `${zahl(dl.gesamt)} Downloads` : "GitHub nicht verbunden",
        inhalt: [nichtDa(dl), dl.ok && dl.neueste ? h("div", { class: "a-meta" }, h("span", {}, `Release ${dl.neueste.tag} vom ${datum(dl.neueste.datum)}`)) : null],
      }),
      akkEintrag({
        icon: "mail",
        titel: "Mails",
        status: m.ok ? (m.probleme ? badge(`${m.probleme} Probleme`, "warn") : badge("Zugestellt", "ok")) : null,
        unter: m.ok ? `${zahl(m.zugestellt)} von ${zahl(m.gesendet)} zugestellt (letzte 100)` : "Resend nicht verbunden",
        inhalt: [nichtDa(m), m.ok ? h("a", { href: "#/mail", class: "a-knopf", style: "justify-self:start" }, "Mail öffnen") : null],
      }),
    ),
  );
}

/** Alpha-Trichter: drei Kennzahlen, darunter 30 Tage Anmeldungen als Strichcode. */
function trichter(d: Daten) {
  const a = d.alpha;
  const u = d.umfragen;
  const tageListe: { tag: string; anzahl: number }[] = a.ok ? a.proTag ?? [] : [];
  const max = Math.max(1, ...tageListe.map((t) => t.anzahl));
  const n = tageListe.length;
  return h(
    "section",
    { class: "a-karte a-trichter" },
    h("div", { class: "a-karte-kopf", style: "margin:0" }, h("h2", {}, "Alpha-Trichter"), h("span", { class: "a-pille", style: "border:0;padding:0;color:var(--a-muted)" }, svg(ICONS.uhr, 15), "30 Tage")),
    h(
      "div",
      { class: "a-trichter-werte" },
      h("div", {}, h("span", {}, "Anmeldungen"), h("strong", {}, a.ok ? zahl(a.gesamt) : "—")),
      h("div", {}, h("span", {}, "Plätze belegt"), h("strong", {}, a.ok ? zahl(a.plaetze - a.frei) : "—")),
      h("div", {}, h("span", {}, "Antworten"), h("strong", {}, u.ok ? zahl(u.gesamt) : "—")),
    ),
    n
      ? h(
          "div",
          { class: "a-strichcode", role: "img", "aria-label": `Anmeldungen je Tag, 30 Tage, höchstens ${max} an einem Tag` },
          tageListe.map((t, i) =>
            h("i", {
              class: i >= n - 10 ? "d" : i >= n - 20 ? "m" : "",
              style: `height:${Math.max(8, (t.anzahl / max) * 100)}%;animation-delay:${i * 18}ms`,
              title: `${datum(t.tag)}: ${t.anzahl}`,
            }),
          ),
        )
      : null,
  );
}


// ═════════════ Katalog ═════════════

type Groesse = "s" | "m" | "l" | "xl" | "voll";
const GROESSEN: { id: Groesse; name: string }[] = [
  { id: "s", name: "Klein (¼)" },
  { id: "m", name: "Mittel (⅓)" },
  { id: "l", name: "Halb (½)" },
  { id: "xl", name: "Breit (⅔)" },
  { id: "voll", name: "Ganze Breite" },
];

interface Kontext {
  d: Daten;
  tage: number;
  extra: Record<string, Daten | undefined>;
}

interface Widget {
  id: string;
  titel: string;
  text: string;
  icon: keyof typeof ICONS;
  /** Bereich, in den ein Klick führt (null = keiner). */
  ziel: string | null;
  groessen: Groesse[];
  standard: Groesse;
  /** Zusatzdaten über /api/admin/<extra>, nur geladen, wenn die Kachel liegt. */
  extra?: "analytics" | "builds" | "doku";
  render: (k: Kontext, w: Widget) => HTMLElement;
}

const KPI: Groesse[] = ["s", "m"];
const BLOCK: Groesse[] = ["m", "l", "xl", "voll"];

/** Kopfzeile einer Kachel: Symbol, Titel, „Öffnen“. */
function kachelKarte(w: Widget, ...inhalt: (Node | null | false | undefined)[]) {
  return h(
    "section",
    { class: "a-karte a-wkarte" },
    h(
      "div",
      { class: "a-wkopf" },
      h("span", { class: "a-wicon", "aria-hidden": "true" }, svg(ICONS[w.icon], 16)),
      h("h2", {}, w.titel),
      w.ziel ? h("a", { class: "a-woeffnen", href: w.ziel, "aria-label": `${w.titel} öffnen`, title: "Öffnen" }, svg(ICONS.pfeil, 15)) : null,
    ),
    ...(inhalt.filter(Boolean) as Node[]),
  );
}

/** Kennzahl-Kachel: ganz anklickbar. */
function kennzahl(w: Widget, wert: string, unter: string, zusatz?: Node | null) {
  return h(
    w.ziel ? "a" : "div",
    { class: "a-karte a-kpi a-wkpi", href: w.ziel ?? null },
    h("div", { class: "a-wkpi-kopf" }, h("span", { class: "a-titel" }, w.titel), h("span", { class: "a-wicon", "aria-hidden": "true" }, svg(ICONS[w.icon], 15))),
    h("div", { class: "a-wert" }, wert),
    h("div", { class: "a-unter" }, unter),
    zusatz ?? null,
  );
}

const fortschritt = (anteil: number, text: string) =>
  h(
    "div",
    { class: "a-fortschritt", role: "img", "aria-label": text },
    h("span", { style: `width:${Math.round(Math.max(0, Math.min(1, anteil)) * 100)}%` }),
  );

const nichtVerbunden = (x: Daten | undefined) => (x && x.ok === false ? x.text || "Nicht verbunden" : "—");

const KATALOG: Widget[] = [
  {
    id: "anmeldungen",
    titel: "Anmeldungen",
    text: "Alpha-Anmeldungen gesamt und in den letzten 7 Tagen.",
    icon: "alpha",
    ziel: "#/alpha",
    groessen: KPI,
    standard: "s",
    render: ({ d }, w) => {
      const a = d.alpha;
      return a.ok ? kennzahl(w, zahl(a.gesamt), `+${zahl(a.letzte7)} in 7 Tagen`) : kennzahl(w, "—", nichtVerbunden(a));
    },
  },
  {
    id: "plaetze",
    titel: "Alpha-Plätze",
    text: "Freie Plätze mit Belegung als Balken.",
    icon: "lizenz",
    ziel: "#/alpha",
    groessen: KPI,
    standard: "s",
    render: ({ d }, w) => {
      const a = d.alpha;
      if (!a.ok) return kennzahl(w, "—", nichtVerbunden(a));
      return kennzahl(w, `${zahl(a.frei)} frei`, `${zahl(a.belegt)} von ${zahl(a.plaetze)} belegt`, fortschritt(a.belegt / Math.max(1, a.plaetze), `${a.belegt} von ${a.plaetze} Plätzen belegt`));
    },
  },
  {
    id: "fehler",
    titel: "Offene Fehler",
    text: "Fehlerberichte aus der App, die neu oder in Arbeit sind.",
    icon: "fehler",
    ziel: "#/fehler",
    groessen: KPI,
    standard: "s",
    render: ({ d }, w) => {
      const f = d.fehler;
      return f.ok ? kennzahl(w, zahl(f.offen), `${zahl(f.gesamt)} insgesamt`) : kennzahl(w, "—", nichtVerbunden(f));
    },
  },
  {
    id: "nps",
    titel: "NPS",
    text: "Weiterempfehlung aus den Umfragen.",
    icon: "umfrage",
    ziel: "#/umfragen",
    groessen: KPI,
    standard: "s",
    render: ({ d }, w) => {
      const u = d.umfragen;
      if (!u.ok) return kennzahl(w, "—", nichtVerbunden(u));
      return kennzahl(w, u.nps ? String(u.nps.wert) : "—", u.nps ? `aus ${zahl(u.nps.n)} Antworten` : `${zahl(u.gesamt)} Antworten, noch kein NPS`);
    },
  },
  {
    id: "lizenzen",
    titel: "Aktive Lizenzen",
    text: "Aktive Lizenzschlüssel und Geräte (Lemon Squeezy).",
    icon: "lizenz",
    ziel: "#/lizenzen",
    groessen: KPI,
    standard: "s",
    render: ({ d }, w) => {
      const l = d.lizenzen;
      return l.ok ? kennzahl(w, zahl(l.aktiv), `${zahl(l.geraete)} Geräte · ${zahl(l.lizenzen)} gesamt`) : kennzahl(w, "—", nichtVerbunden(l));
    },
  },
  {
    id: "umsatz",
    titel: "Umsatz 30 Tage",
    text: "Bestellungen und Umsatz der letzten 30 Tage.",
    icon: "umsatz",
    ziel: "#/umsatz",
    groessen: KPI,
    standard: "s",
    render: ({ d }, w) => {
      const l = d.lizenzen;
      return l.ok ? kennzahl(w, euro(l.umsatz30, l.waehrung), `${zahl(l.bestellungen30)} Bestellungen`) : kennzahl(w, "—", nichtVerbunden(l));
    },
  },
  {
    id: "downloads",
    titel: "Downloads",
    text: "Downloads aller Releases (GitHub).",
    icon: "download",
    ziel: "#/builds",
    groessen: KPI,
    standard: "s",
    render: ({ d }, w) => {
      const dl = d.downloads;
      return dl.ok ? kennzahl(w, zahl(dl.gesamt), dl.neueste ? `neueste: ${dl.neueste.tag} · ${datum(dl.neueste.datum)}` : "noch kein Release") : kennzahl(w, "—", nichtVerbunden(dl));
    },
  },
  {
    id: "mails",
    titel: "Zustellung",
    text: "Zugestellte Mails der letzten 100 (Resend).",
    icon: "mail",
    ziel: "#/mail",
    groessen: KPI,
    standard: "s",
    render: ({ d }, w) => {
      const m = d.mails;
      if (!m.ok) return kennzahl(w, "—", nichtVerbunden(m));
      const quote = m.gesendet ? Math.round((m.zugestellt / m.gesendet) * 100) : 100;
      return kennzahl(w, `${quote} %`, m.probleme ? `${zahl(m.probleme)} Probleme` : `${zahl(m.zugestellt)} von ${zahl(m.gesendet)} zugestellt`, fortschritt(quote / 100, `${quote} Prozent zugestellt`));
    },
  },
  {
    id: "verlauf",
    titel: "Anmeldungen im Verlauf",
    text: "Anmeldungen je Tag mit Vergleich zum Zeitraum davor (Zeitraum oben wählbar).",
    icon: "analytics",
    ziel: "#/alpha",
    groessen: ["l", "xl", "voll"],
    standard: "xl",
    render: ({ d, tage }) => heldKarte(d.alpha, tage),
  },
  {
    id: "betrieb",
    titel: "Betrieb",
    text: "Fehler, Umfragen, Lizenzen, Downloads und Mails zum Aufklappen.",
    icon: "builds",
    ziel: "#/fehler",
    groessen: BLOCK,
    standard: "m",
    render: ({ d }, w) => kachelKarte(w, betrieb(d)),
  },
  {
    id: "neueste",
    titel: "Neueste Anmeldungen",
    text: "Die letzten Anmeldungen mit Status.",
    icon: "alpha",
    ziel: "#/alpha",
    groessen: BLOCK,
    standard: "m",
    render: ({ d }, w) => kachelKarte(w, neuesteAnmeldungen(d.alpha)),
  },
  {
    id: "platzkarte",
    titel: "Alpha-Plätze (groß)",
    text: "Große Karte mit freien Plätzen und Knopf zu den Anmeldungen.",
    icon: "lizenz",
    ziel: "#/alpha",
    groessen: ["m", "l"],
    standard: "m",
    render: ({ d }) => plaetzeKarte(d.alpha),
  },
  {
    id: "trichter",
    titel: "Alpha-Trichter",
    text: "Anmeldungen, belegte Plätze und Antworten mit 30-Tage-Strichcode.",
    icon: "analytics",
    ziel: "#/analytics",
    groessen: BLOCK,
    standard: "m",
    render: ({ d }) => trichter(d),
  },
  {
    id: "quellen",
    titel: "Woher die Anmeldungen kommen",
    text: "„Wie hast du von cockpit erfahren?“ und UTM-Quellen.",
    icon: "analytics",
    ziel: "#/analytics",
    groessen: BLOCK,
    standard: "m",
    render: ({ d }, w) => kachelKarte(w, hinweisKachel(d.alpha) || balken(d.alpha.quellen, 6)),
  },
  {
    id: "status",
    titel: "Anmeldungen nach Status",
    text: "Neu, angenommen, eingeladen, Warteliste, abgelehnt.",
    icon: "alpha",
    ziel: "#/alpha",
    groessen: BLOCK,
    standard: "m",
    render: ({ d }, w) => kachelKarte(w, hinweisKachel(d.alpha) || balken(d.alpha.nachStatus ?? [], 6)),
  },
  {
    id: "umfragen",
    titel: "Antworten je Umfrage",
    text: "Wie viele Antworten jede Umfrage hat.",
    icon: "umfrage",
    ziel: "#/umfragen",
    groessen: BLOCK,
    standard: "m",
    render: ({ d }, w) => kachelKarte(w, hinweisKachel(d.umfragen) || balken(d.umfragen.jeUmfrage ?? [], 6)),
  },
  {
    id: "fehlerliste",
    titel: "Neueste Fehlerberichte",
    text: "Die letzten Meldungen aus der App.",
    icon: "fehler",
    ziel: "#/fehler",
    groessen: BLOCK,
    standard: "m",
    render: ({ d }, w) => {
      const f = d.fehler;
      const liste: Daten[] = f.ok ? f.neueste ?? [] : [];
      return kachelKarte(
        w,
        hinweisKachel(f),
        f.ok && !liste.length ? leer("Noch keine Meldungen aus der App.") : null,
        liste.length
          ? h("div", { class: "a-wliste" }, liste.slice(0, 4).map((b) => h("a", { href: "#/fehler", class: "a-wzeile" }, h("span", { class: "a-wzeile-text" }, b.beschreibung || "—"), h("span", { class: "a-wzeile-meta" }, badge(b.status || "neu"), relativ(b.zeit)))))
          : null,
      );
    },
  },
  {
    id: "aktivitaet",
    titel: "Letzte Aktivität",
    text: "Änderungen im Admin (Audit-Log).",
    icon: "uhr",
    ziel: "#/einstellungen",
    groessen: BLOCK,
    standard: "m",
    render: ({ d }, w) =>
      kachelKarte(
        w,
        Array.isArray(d.protokoll) && d.protokoll.length
          ? h("div", { class: "a-wliste" }, d.protokoll.slice(0, 5).map((p: Daten) => h("div", { class: "a-wzeile" }, h("span", { class: "a-wzeile-text" }, `${p.aktion}${p.details ? ` — ${p.details}` : ""}`), h("span", { class: "a-wzeile-meta" }, relativ(p.zeit)))))
          : leer("Noch keine Änderungen protokolliert."),
      ),
  },
  {
    id: "verbindungen",
    titel: "Verbindungen",
    text: "Welche Dienste verbunden sind (KV, Lemon Squeezy, Resend, GitHub).",
    icon: "einstellungen",
    ziel: "#/einstellungen",
    groessen: BLOCK,
    standard: "m",
    render: ({ d }, w) => {
      const dienste: [string, Daten][] = [
        ["Datenbank (KV)", d.alpha],
        ["Lemon Squeezy", d.lizenzen],
        ["Resend", d.mails],
        ["GitHub", d.downloads],
      ];
      return kachelKarte(
        w,
        h(
          "div",
          { class: "a-wliste" },
          dienste.map(([name, x]) => h("div", { class: "a-wzeile" }, h("span", { class: "a-wzeile-text" }, name), h("span", { class: "a-wzeile-meta" }, x.ok ? badge("verbunden", "ok") : badge("fehlt", "warn")))),
        ),
      );
    },
  },
  {
    id: "schnell",
    titel: "Schnellaktionen",
    text: "Häufige Wege mit einem Klick.",
    icon: "blitz",
    ziel: null,
    groessen: BLOCK,
    standard: "m",
    render: (_k, w) =>
      kachelKarte(
        w,
        h(
          "div",
          { class: "a-schnell" },
          [
            ["Anmeldungen prüfen", "#/alpha", "alpha"],
            ["Umfrage anlegen", "#/umfragen", "umfrage"],
            ["Rundmail schreiben", "#/mail", "mail"],
            ["Fehler sichten", "#/fehler", "fehler"],
            ["Builds ansehen", "#/builds", "builds"],
            ["Doku öffnen", "#/doku", "doku"],
          ].map(([t, href, icon]) => h("a", { class: "a-schnell-knopf", href }, svg(ICONS[icon as keyof typeof ICONS], 16), t)),
        ),
      ),
  },
  {
    id: "besucher",
    titel: "Website-Besucher",
    text: "Besucher je Tag (Cloudflare Analytics).",
    icon: "analytics",
    ziel: "#/analytics",
    groessen: ["l", "xl", "voll"],
    standard: "l",
    extra: "analytics",
    render: ({ extra, tage }, w) => {
      const b = extra.analytics?.besuche;
      if (!b) return kachelKarte(w, h("div", { class: "a-lade klein" }, h("div"), h("div"), h("div")));
      if (!b.ok) return kachelKarte(w, hinweisKachel(b));
      const reihe: Daten[] = (b.proTag ?? []).slice(-tage);
      const summe = reihe.reduce((s, t) => s + (t.besucher || 0), 0);
      return kachelKarte(w, h("div", { class: "a-wzahl" }, h("strong", {}, zahl(summe)), h("span", {}, `Besucher in ${tage} Tagen`)), verlauf(reihe.map((t) => ({ tag: t.tag, wert: t.besucher }))));
    },
  },
  {
    id: "builds",
    titel: "Build-Läufe",
    text: "Letzte GitHub-Actions-Läufe mit Ergebnis.",
    icon: "builds",
    ziel: "#/builds",
    groessen: BLOCK,
    standard: "m",
    extra: "builds",
    render: ({ extra }, w) => {
      const l = extra.builds?.laeufe;
      if (!l) return kachelKarte(w, h("div", { class: "a-lade klein" }, h("div"), h("div"), h("div")));
      if (!l.ok) return kachelKarte(w, hinweisKachel(l));
      const liste: Daten[] = l.liste ?? [];
      return kachelKarte(
        w,
        liste.length
          ? h("div", { class: "a-wliste" }, liste.slice(0, 5).map((x) => h("div", { class: "a-wzeile" }, h("span", { class: "a-wzeile-text" }, `${x.name} · ${x.titel || x.zweig}`), h("span", { class: "a-wzeile-meta" }, badge(x.ergebnis || x.status), relativ(x.zeit)))))
          : leer("Noch keine Läufe."),
      );
    },
  },
  {
    id: "doku",
    titel: "Doku",
    text: "Dokumente aus dem privaten Doku-Repo.",
    icon: "doku",
    ziel: "#/doku",
    groessen: BLOCK,
    standard: "m",
    extra: "doku",
    render: ({ extra }, w) => {
      const d = extra.doku;
      if (!d) return kachelKarte(w, h("div", { class: "a-lade klein" }, h("div"), h("div"), h("div")));
      if (!d.ok) return kachelKarte(w, hinweisKachel(d));
      const dateien: Daten[] = d.dateien ?? [];
      return kachelKarte(
        w,
        dateien.length
          ? h("div", { class: "a-wliste" }, dateien.slice(0, 6).map((x) => h("a", { class: "a-wzeile", href: "#/doku" }, h("span", { class: "a-wzeile-text a-mono" }, x.pfad), h("span", { class: "a-wzeile-meta" }, svg(ICONS.pfeil, 13)))))
          : leer("Noch keine Dokumente."),
      );
    },
  },
];
const NACH_ID = new Map(KATALOG.map((w) => [w.id, w]));

// ═════════════ Layout ═════════════

interface Platz {
  id: string;
  groesse: Groesse;
}
interface Einstellungen {
  layout: Platz[];
  tage: number;
  /** Automatisch neu laden alle n Minuten (0 = aus). */
  auto: number;
}

const STANDARD: Einstellungen = {
  tage: 7,
  auto: 0,
  layout: [
    { id: "anmeldungen", groesse: "s" },
    { id: "plaetze", groesse: "s" },
    { id: "fehler", groesse: "s" },
    { id: "nps", groesse: "s" },
    { id: "verlauf", groesse: "xl" },
    { id: "schnell", groesse: "m" },
    { id: "neueste", groesse: "m" },
    { id: "betrieb", groesse: "m" },
    { id: "trichter", groesse: "m" },
    { id: "lizenzen", groesse: "s" },
    { id: "umsatz", groesse: "s" },
    { id: "downloads", groesse: "s" },
    { id: "mails", groesse: "s" },
    { id: "quellen", groesse: "m" },
    { id: "fehlerliste", groesse: "m" },
    { id: "aktivitaet", groesse: "m" },
  ],
};
const SPEICHER = "cockpit-admin-dashboard";

/** Nur bekannte Kacheln, erlaubte Größen, keine Doppelten. */
function bereinigen(e: Partial<Einstellungen> | null | undefined): Einstellungen {
  const gesehen = new Set<string>();
  const layout = (Array.isArray(e?.layout) ? e!.layout : STANDARD.layout)
    .filter((p): p is Platz => !!p && typeof p.id === "string" && NACH_ID.has(p.id) && !gesehen.has(p.id) && (gesehen.add(p.id), true))
    .map((p) => {
      const w = NACH_ID.get(p.id)!;
      return { id: p.id, groesse: w.groessen.includes(p.groesse) ? p.groesse : w.standard };
    });
  return {
    layout,
    tage: [7, 14, 30].includes(Number(e?.tage)) ? Number(e!.tage) : STANDARD.tage,
    auto: [0, 1, 5, 15].includes(Number(e?.auto)) ? Number(e!.auto) : 0,
  };
}

function lokalLesen(): Einstellungen | null {
  try {
    const t = localStorage.getItem(SPEICHER);
    return t ? bereinigen(JSON.parse(t)) : null;
  } catch {
    return null;
  }
}
function lokalSchreiben(e: Einstellungen) {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(e));
  } catch {
    /* privat/gesperrt: dann eben nur im KV */
  }
}

let speichernZeit: number | undefined;
/** Speichert verzögert im KV (mehrere Änderungen hintereinander = ein Aufruf). */
function speichern(e: Einstellungen) {
  lokalSchreiben(e);
  clearTimeout(speichernZeit);
  speichernZeit = window.setTimeout(() => {
    api("layout", { layout: e.layout, tage: e.tage, auto: e.auto }).catch((f) => toast(`Layout nicht gespeichert: ${(f as Error).message}`, true));
  }, 600);
}

// ═════════════ Dashboard ═════════════

let einst: Einstellungen = lokalLesen() ?? bereinigen(null);
let anpassen = false;
let autoZeit: number | undefined;
/** Letzte Übersichtsdaten (auch für die Glocke). */
export let letzteDaten: Daten | null = null;

export async function dashboard(ziel: HTMLElement, neu: () => void) {
  menueZu();
  clearInterval(autoZeit);
  const [d, gespeichert] = await Promise.all([api("uebersicht"), api("layout").catch(() => null)]);
  letzteDaten = d;
  if (gespeichert?.layout) {
    einst = bereinigen(gespeichert as Einstellungen);
    lokalSchreiben(einst);
  }
  const glocke = document.querySelector("#a-glocke .a-punkt") as HTMLElement | null;
  if (glocke) glocke.hidden = meldungen(d).filter((m) => m.wichtig).length === 0;

  const extra: Kontext["extra"] = {};
  const brett = h("div", { class: "a-brett", role: "list", "aria-label": "Dashboard-Kacheln" });
  const leiste = werkzeugLeiste(neu, () => zeichne());

  const zeichne = () => {
    brett.classList.toggle("anpassen", anpassen);
    brett.replaceChildren(
      ...einst.layout.map((p, i) => platzElement(p, i, { d, tage: einst.tage, extra }, zeichne)),
      ...(anpassen ? [hinzufuegenKachel(zeichne)] : []),
    );
    if (!einst.layout.length && !anpassen) brett.append(h("div", { class: "a-hinweis", style: "grid-column:1/-1" }, "Keine Kacheln. Über „Anpassen“ → „Kachel hinzufügen“ das Dashboard füllen."));
    leiste.aktualisieren();
  };
  zeichne();
  fuegeAn(ziel, leiste.el, brett);

  // Zusatzdaten nur für liegende Kacheln, danach nur diese Kacheln neu zeichnen.
  const noetig = new Set(einst.layout.map((p) => NACH_ID.get(p.id)?.extra).filter(Boolean) as string[]);
  for (const pfad of noetig) {
    api(pfad)
      .then((x) => (extra[pfad] = x))
      .catch((f) => (extra[pfad] = { ok: false, art: "fehler", text: (f as Error).message }))
      .then(() => zeichne());
  }

  if (einst.auto > 0) {
    autoZeit = window.setInterval(() => {
      if (!location.hash.match(/^#?\/?(uebersicht)?$/) || document.hidden || anpassen) return;
      neu();
    }, einst.auto * 60_000);
  }
}

const fuegeAn = (z: HTMLElement, ...k: Node[]) => z.append(...k);

/** Werkzeugleiste über dem Dashboard: Zeitraum, Aktualisieren, Anpassen, Schnellaktionen. */
function werkzeugLeiste(neu: () => void, zeichne: () => void) {
  const zeitraumKnopf = h("button", { class: "a-knopf", type: "button", "aria-haspopup": "menu", "aria-expanded": "false" }) as HTMLButtonElement;
  const autoKnopf = h("button", { class: "a-knopf", type: "button", "aria-haspopup": "menu", "aria-expanded": "false" }) as HTMLButtonElement;
  const anpassenKnopf = h("button", { class: "a-knopf", type: "button", "aria-pressed": "false" }) as HTMLButtonElement;
  const mehrKnopf = h("button", { class: "a-rund", type: "button", "aria-label": "Weitere Aktionen", "aria-haspopup": "menu", "aria-expanded": "false" }, svg("M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z|M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z|M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", 18)) as HTMLButtonElement;
  const hinzu = h("button", { class: "a-knopf a-p", type: "button", hidden: true }, svg(ICONS.plus, 15), "Kachel hinzufügen") as HTMLButtonElement;

  zeitraumKnopf.addEventListener("click", () =>
    popupMenue(
      zeitraumKnopf,
      [{ titel: "Zeitraum der Verläufe" }, ...[7, 14, 30].map((t) => ({ text: `${t} Tage`, gewaehlt: einst.tage === t, aktion: () => setze({ tage: t }) }))],
      { label: "Zeitraum" },
    ),
  );
  autoKnopf.addEventListener("click", () =>
    popupMenue(
      autoKnopf,
      [
        { titel: "Automatisch aktualisieren" },
        ...[
          [0, "Aus"],
          [1, "Jede Minute"],
          [5, "Alle 5 Minuten"],
          [15, "Alle 15 Minuten"],
        ].map(([m, t]) => ({ text: String(t), gewaehlt: einst.auto === m, aktion: () => setze({ auto: Number(m) }, true) })),
        "trenner",
        { text: "Jetzt neu laden", icon: "neu", aktion: neu },
      ],
      { label: "Aktualisieren" },
    ),
  );
  anpassenKnopf.addEventListener("click", () => {
    anpassen = !anpassen;
    zeichne();
    if (!anpassen) toast("Dashboard gespeichert.");
  });
  hinzu.addEventListener("click", () => katalogOeffnen(zeichne));
  mehrKnopf.addEventListener("click", () =>
    popupMenue(
      mehrKnopf,
      [
        { titel: "Schnellaktionen" },
        { text: "Anmeldungen prüfen", icon: "alpha", href: "#/alpha" },
        { text: "Umfrage anlegen", icon: "umfrage", href: "#/umfragen" },
        { text: "Rundmail an Tester", icon: "mail", href: "#/mail" },
        { text: "Schlüssel & Einstellungen", icon: "einstellungen", href: "#/einstellungen" },
        "trenner",
        { titel: "Dashboard" },
        { text: "Kachel hinzufügen", icon: "plus", aktion: () => katalogOeffnen(zeichne) },
        { text: anpassen ? "Anpassen beenden" : "Kacheln anpassen", icon: "einstellungen", aktion: () => anpassenKnopf.click() },
        { text: "Auf Standard zurücksetzen", icon: "neu", gefahr: true, aktion: () => zuruecksetzen(zeichne) },
      ],
      { breite: 260, label: "Weitere Aktionen" },
    ),
  );

  function setze(teil: Partial<Einstellungen>, neuStarten = false) {
    einst = bereinigen({ ...einst, ...teil });
    speichern(einst);
    if (neuStarten) neu();
    else zeichne();
  }

  const el = h(
    "div",
    { class: "a-brett-leiste" },
    h("div", { class: "a-brett-links" }, zeitraumKnopf, autoKnopf),
    h("div", { class: "a-brett-rechts" }, hinzu, anpassenKnopf, mehrKnopf),
  );
  return {
    el,
    aktualisieren() {
      zeitraumKnopf.replaceChildren(svg(ICONS.uhr, 15), `${einst.tage} Tage`, svg(ICONS.runter, 14));
      autoKnopf.replaceChildren(svg(ICONS.neu, 15), einst.auto ? `Alle ${einst.auto} Min.` : "Automatisch: aus", svg(ICONS.runter, 14));
      anpassenKnopf.replaceChildren(svg(anpassen ? "M20 6 9 17l-5-5" : "M12 20h9|M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z", 15), anpassen ? "Fertig" : "Anpassen");
      anpassenKnopf.setAttribute("aria-pressed", String(anpassen));
      anpassenKnopf.classList.toggle("a-p", anpassen);
      hinzu.hidden = !anpassen;
    },
  };
}

/** Eine Kachel im Raster samt Bearbeiten-Werkzeugen. */
function platzElement(p: Platz, index: number, k: Kontext, zeichne: () => void) {
  const w = NACH_ID.get(p.id)!;
  let inhalt: HTMLElement;
  try {
    inhalt = w.render(k, w);
  } catch (e) {
    inhalt = kachelKarte(w, h("div", { class: "a-hinweis a-fehler" }, `Kachel konnte nicht gezeichnet werden: ${(e as Error).message}`));
  }
  const platz = h("div", { class: `a-platz g-${p.groesse}`, role: "listitem", "data-id": p.id, "aria-label": w.titel }, inhalt);

  // Klick auf die freie Fläche einer Kachel öffnet ihren Bereich.
  if (w.ziel && !anpassen) {
    platz.classList.add("klickbar");
    platz.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button, input, select, textarea, summary, [role=button], .a-akkordeon") || getSelection()?.toString()) return;
      location.hash = w.ziel!;
    });
  }

  if (anpassen) {
    platz.classList.add("bearbeiten");
    platz.draggable = true;
    platz.setAttribute("aria-roledescription", "verschiebbare Kachel");
    const griff = h(
      "button",
      { class: "a-griff", type: "button", "aria-label": `${w.titel} verschieben (Pfeiltasten)`, title: "Ziehen oder Pfeiltasten" },
      svg("M9 5h.01|M9 12h.01|M9 19h.01|M15 5h.01|M15 12h.01|M15 19h.01", 16),
    );
    griff.addEventListener("keydown", (e) => {
      const r = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
      if (!r) return;
      e.preventDefault();
      if (verschiebe(index, index + r)) {
        zeichne();
        (document.querySelector(`.a-platz[data-id="${p.id}"] .a-griff`) as HTMLElement | null)?.focus();
      }
    });
    const menueKnopf = h("button", { class: "a-griff", type: "button", "aria-label": `${w.titel}: Optionen`, "aria-haspopup": "menu", "aria-expanded": "false" }, svg("M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z|M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z|M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", 16));
    menueKnopf.addEventListener("click", () => kachelMenue(menueKnopf, p, index, zeichne));
    const weg = h("button", { class: "a-griff weg", type: "button", "aria-label": `${w.titel} entfernen` }, svg(ICONS.x, 15));
    weg.addEventListener("click", () => {
      einst.layout.splice(index, 1);
      speichern(einst);
      zeichne();
      toast(`„${w.titel}“ entfernt.`);
    });
    platz.prepend(h("div", { class: "a-platz-werkzeug" }, griff, menueKnopf, weg));
    ziehbar(platz, index, zeichne);
  } else if (w.ziel) {
    // Auch ohne Bearbeiten: kleines Menü je Kachel (öffnen, Größe, entfernen).
    const menueKnopf = h("button", { class: "a-griff leise", type: "button", "aria-label": `${w.titel}: Optionen`, "aria-haspopup": "menu", "aria-expanded": "false" }, svg("M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z|M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z|M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", 16));
    menueKnopf.addEventListener("click", (e) => {
      e.stopPropagation();
      kachelMenue(menueKnopf, p, index, zeichne);
    });
    platz.prepend(h("div", { class: "a-platz-werkzeug leise" }, menueKnopf));
  }
  return platz;
}

function kachelMenue(anker: HTMLElement, p: Platz, index: number, zeichne: () => void) {
  const w = NACH_ID.get(p.id)!;
  const punkte: MenuePunkt[] = [];
  if (w.ziel) punkte.push({ text: "Bereich öffnen", icon: "pfeil", href: w.ziel }, "trenner");
  punkte.push({ titel: "Größe" });
  for (const g of GROESSEN.filter((g) => w.groessen.includes(g.id))) {
    punkte.push({
      text: g.name,
      gewaehlt: p.groesse === g.id,
      aktion: () => {
        p.groesse = g.id;
        speichern(einst);
        zeichne();
      },
    });
  }
  punkte.push(
    "trenner",
    { text: "Nach vorne", icon: "pfeil", aus: index === 0, aktion: () => verschiebe(index, index - 1) && zeichne() },
    { text: "Nach hinten", aus: index === einst.layout.length - 1, aktion: () => verschiebe(index, index + 1) && zeichne() },
    { text: "Ganz nach oben", aus: index === 0, aktion: () => verschiebe(index, 0) && zeichne() },
    "trenner",
    {
      text: "Entfernen",
      icon: "x",
      gefahr: true,
      aktion: () => {
        einst.layout.splice(index, 1);
        speichern(einst);
        zeichne();
        toast(`„${w.titel}“ entfernt.`);
      },
    },
  );
  popupMenue(anker, punkte, { breite: 220, label: `${w.titel}: Optionen` });
}

function verschiebe(von: number, nach: number) {
  if (nach < 0 || nach >= einst.layout.length || von === nach) return false;
  const [p] = einst.layout.splice(von, 1);
  einst.layout.splice(nach, 0, p);
  speichern(einst);
  return true;
}

/** Ziehen mit der Maus (HTML5 Drag & Drop); Ziel-Kachel zeigt die Einfügeseite. */
function ziehbar(platz: HTMLElement, index: number, zeichne: () => void) {
  platz.addEventListener("dragstart", (e) => {
    e.dataTransfer?.setData("text/plain", String(index));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => platz.classList.add("zieht"));
  });
  platz.addEventListener("dragend", () => {
    platz.classList.remove("zieht");
    document.querySelectorAll(".a-platz.vor, .a-platz.nach").forEach((x) => x.classList.remove("vor", "nach"));
  });
  const seite = (e: DragEvent) => {
    const r = platz.getBoundingClientRect();
    return e.clientX < r.left + r.width / 2 ? "vor" : "nach";
  };
  platz.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const s = seite(e);
    platz.classList.toggle("vor", s === "vor");
    platz.classList.toggle("nach", s === "nach");
  });
  platz.addEventListener("dragleave", () => platz.classList.remove("vor", "nach"));
  platz.addEventListener("drop", (e) => {
    e.preventDefault();
    const von = Number(e.dataTransfer?.getData("text/plain"));
    platz.classList.remove("vor", "nach");
    if (!Number.isInteger(von)) return;
    let nach = seite(e) === "vor" ? index : index + 1;
    if (von < nach) nach -= 1;
    if (verschiebe(von, nach)) zeichne();
  });
}

/** Platzhalter am Ende im Bearbeiten-Modus. */
function hinzufuegenKachel(zeichne: () => void) {
  const k = h("button", { class: "a-platz g-s a-neue-kachel", type: "button" }, svg(ICONS.plus, 20), h("span", {}, "Kachel hinzufügen"));
  k.addEventListener("click", () => katalogOeffnen(zeichne));
  return k;
}

/** Katalog aller Kacheln, die noch nicht auf dem Dashboard liegen. */
function katalogOeffnen(zeichne: () => void) {
  const liegt = new Set(einst.layout.map((p) => p.id));
  const frei = KATALOG.filter((w) => !liegt.has(w.id));
  let schliessen = () => {};
  const raster = h(
    "div",
    { class: "a-katalog" },
    frei.length
      ? frei.map((w) => {
          const b = h(
            "button",
            { class: "a-katalog-eintrag", type: "button" },
            h("span", { class: "a-wicon" }, svg(ICONS[w.icon], 18)),
            h("span", {}, h("b", {}, w.titel), h("small", {}, w.text)),
            h("span", { class: "a-katalog-plus", "aria-hidden": "true" }, svg(ICONS.plus, 16)),
          );
          b.addEventListener("click", () => {
            einst.layout.push({ id: w.id, groesse: w.standard });
            speichern(einst);
            schliessen();
            anpassen = true;
            // Zusatzdaten brauchen einen neuen Ladevorgang.
            if (w.extra) dispatchEvent(new HashChangeEvent("hashchange"));
            else zeichne();
            toast(`„${w.titel}“ hinzugefügt.`);
          });
          return b;
        })
      : leer("Alle Kacheln liegen schon auf dem Dashboard."),
  );
  schliessen = dialogFenster("Kachel hinzufügen", raster, { breit: true, untertitel: "Wähle aus, was das Dashboard zeigen soll. Größe und Reihenfolge änderst du danach im Anpassen-Modus." });
}

function zuruecksetzen(zeichne: () => void) {
  const knoepfe = h("div", { class: "a-werkzeuge", style: "justify-content:flex-end" });
  const nein = h("button", { class: "a-knopf", type: "button" }, "Abbrechen");
  const ja = h("button", { class: "a-knopf a-rot", type: "button" }, "Zurücksetzen");
  knoepfe.append(nein, ja);
  const schliessen = dialogFenster("Dashboard zurücksetzen?", h("div", {}, h("p", { style: "margin:0 0 16px" }, "Alle Kacheln, Größen und die Reihenfolge gehen auf den Standard zurück."), knoepfe));
  nein.addEventListener("click", schliessen);
  ja.addEventListener("click", () => {
    einst = bereinigen(null);
    speichern(einst);
    schliessen();
    zeichne();
    toast("Dashboard zurückgesetzt.");
  });
}

// ═════════════ Glocke ═════════════

interface Meldung {
  text: string;
  unter: string;
  href: string;
  icon: keyof typeof ICONS;
  wichtig: boolean;
}

/** Was Aufmerksamkeit braucht — für das Glocken-Menü in der Kopfzeile. */
export function meldungen(d: Daten | null): Meldung[] {
  if (!d) return [];
  const m: Meldung[] = [];
  const neuAnm = d.alpha?.ok ? (d.alpha.nachStatus ?? []).find((x: Daten) => x.name === "neu")?.anzahl ?? 0 : 0;
  if (d.fehler?.ok && d.fehler.offen) m.push({ text: `${d.fehler.offen} offene Fehlerberichte`, unter: "neu oder in Arbeit", href: "#/fehler", icon: "fehler", wichtig: true });
  if (neuAnm) m.push({ text: `${neuAnm} neue Anmeldungen`, unter: "warten auf Prüfung", href: "#/alpha", icon: "alpha", wichtig: true });
  if (d.alpha?.ok && d.alpha.frei === 0) m.push({ text: "Alle Alpha-Plätze belegt", unter: "neue Anmeldungen landen auf der Warteliste", href: "#/alpha", icon: "lizenz", wichtig: false });
  if (d.mails?.ok && d.mails.probleme) m.push({ text: `${d.mails.probleme} Mail-Probleme`, unter: "unzustellbar oder Beschwerde", href: "#/mail", icon: "mail", wichtig: true });
  for (const [name, x, href] of [
    ["Lemon Squeezy", d.lizenzen, "#/einstellungen"],
    ["Resend", d.mails, "#/einstellungen"],
    ["GitHub", d.downloads, "#/einstellungen"],
  ] as [string, Daten, string][]) {
    if (x && x.ok === false) m.push({ text: `${name} nicht verbunden`, unter: x.text || "Schlüssel prüfen", href, icon: "einstellungen", wichtig: false });
  }
  return m;
}

/** Glocke in der Kopfzeile: Menü mit allem, was gerade Aufmerksamkeit braucht. */
export async function glockeOeffnen(anker: HTMLElement) {
  const d = letzteDaten ?? (await api("uebersicht").catch(() => null));
  if (d) letzteDaten = d;
  const liste = meldungen(d);
  popupMenue(
    anker,
    liste.length
      ? [{ titel: "Braucht Aufmerksamkeit" }, ...liste.map((x) => ({ text: x.text, unter: x.unter, icon: x.icon, href: x.href }))]
      : [{ titel: "Alles ruhig" }, { text: "Keine offenen Punkte", unter: "Fehler, Anmeldungen und Mails sind erledigt", icon: "start", aus: true }],
    { breite: 300, label: "Benachrichtigungen" },
  );
}
