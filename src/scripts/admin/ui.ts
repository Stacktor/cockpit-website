import { h, svg, ICONS, type Daten } from "./dom";

// ───────────── API ─────────────

let token = "";
/** ?token=… (Notlösung ohne Access) einmal aus der Adresse lesen und entfernen. */
export function tokenAusAdresse() {
  const u = new URL(location.href);
  const t = u.searchParams.get("token");
  if (t) {
    token = t;
    u.searchParams.delete("token");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }
}

export class ApiFehler extends Error {
  constructor(
    public status: number,
    text: string,
  ) {
    super(text);
  }
}

export async function api(pfad: string, body?: Daten): Promise<Daten> {
  const r = await fetch(`/api/admin/${pfad}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "X-Admin-Token": token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiFehler(r.status, d.fehler || `Fehler ${r.status}`);
  return d;
}

export function exportUrl(pfad: string) {
  return `/api/admin/${pfad}${token ? `${pfad.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : ""}`;
}

// ───────────── Rückmeldungen ─────────────

let toastZeit: number | undefined;
export function toast(text: string, fehler = false) {
  const t = document.getElementById("a-toast")!;
  t.textContent = text;
  t.classList.toggle("fehler", fehler);
  t.classList.add("zeigen");
  clearTimeout(toastZeit);
  toastZeit = window.setTimeout(() => t.classList.remove("zeigen"), 3600);
}

/** Wörter, an denen eine zerstörerische Aktion zu erkennen ist (roter Knopf). */
const GEFAHR = /lösch|sperr|abmeld|entfern|leeren|widerruf|zurücksetz/i;

/**
 * Rückfrage vor einer Aktion. Zerstörerische Aktionen (am Knopftext erkannt oder
 * per `gefahr`) bekommen einen roten Knopf und ein Warnsymbol.
 */
export function bestaetigen(titel: string, text: string, ja = "Ja, fortfahren", opt: { gefahr?: boolean } = {}): Promise<boolean> {
  const gefahr = opt.gefahr ?? GEFAHR.test(ja);
  return new Promise((fertig) => {
    const d = h("dialog", { class: `a-dialog a-rueckfrage${gefahr ? " gefahr" : ""}`, "aria-label": titel }) as HTMLDialogElement;
    let ergebnis = false;
    const schliessen = (w: boolean) => {
      ergebnis = w;
      d.close();
    };
    const nein = h("button", { class: "a-knopf", type: "button", onclick: () => schliessen(false) }, "Abbrechen") as HTMLButtonElement;
    d.append(
      h(
        "div",
        { class: "a-rueckfrage-inhalt" },
        h("span", { class: "a-rueckfrage-symbol" }, svg(ICONS[gefahr ? "warnung" : "frage"], 18)),
        h("div", {}, h("h3", {}, titel), h("p", {}, text)),
      ),
      h(
        "div",
        { class: "a-dialog-fuss" },
        nein,
        h("button", { class: `a-knopf ${gefahr ? "a-rot-voll" : "a-p"}`, type: "button", onclick: () => schliessen(true) }, ja),
      ),
    );
    d.addEventListener("click", (e) => e.target === d && schliessen(false));
    d.addEventListener("close", () => {
      d.remove();
      fertig(ergebnis);
    });
    document.body.append(d);
    d.showModal();
    // Bei Gefahr steht der Fokus auf „Abbrechen“, damit Enter nichts löscht.
    if (gefahr) nein.focus();
  });
}

/** Kopiert Text in die Zwischenablage und meldet es kurz. */
export async function kopieren(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Kopiert.");
  } catch {
    toast("Kopieren ging nicht. Bitte von Hand markieren.", true);
  }
}

/** Kleiner runder Knopf zum Kopieren; stoppt den Klick, damit Tabellenzeilen nicht aufgehen. */
export function kopierKnopf(text: string, label = "Kopieren") {
  const k = h("button", { class: "a-rund a-kopier", type: "button", "aria-label": label, title: label }, svg(ICONS.kopieren, 14)) as HTMLButtonElement;
  k.addEventListener("click", (e) => {
    e.stopPropagation();
    void kopieren(text).then(() => {
      k.replaceChildren(svg(ICONS.haken, 14));
      setTimeout(() => k.replaceChildren(svg(ICONS.kopieren, 14)), 1400);
    });
  });
  return k;
}

/** Führt eine Aktion aus, sperrt den Knopf, meldet Ergebnis und lädt auf Wunsch neu. */
export async function aktion(knopf: HTMLButtonElement | null, fn: () => Promise<Daten>, danach?: () => void) {
  if (knopf) knopf.disabled = true;
  try {
    const d = await fn();
    if (d.meldung) toast(d.meldung);
    danach?.();
    return d;
  } catch (e) {
    toast((e as Error).message, true);
    return null;
  } finally {
    if (knopf) knopf.disabled = false;
  }
}

// ───────────── Bausteine ─────────────

export const knopf = (text: string, onclick: (e: Event) => void, art = "", icon?: keyof typeof ICONS) =>
  h("button", { class: `a-knopf ${art}`, type: "button", onclick }, icon ? svg(ICONS[icon], 15) : null, text) as HTMLButtonElement;

export const karte = (titel: string | null, ...inhalt: (Node | null | false)[]) =>
  h("section", { class: "a-karte" }, titel ? h("h2", {}, titel) : null, ...inhalt);

export function karteMitKopf(titel: string, rechts: Node | null, ...inhalt: (Node | null | false)[]) {
  return h("section", { class: "a-karte" }, h("div", { class: "a-karte-kopf" }, h("h2", {}, titel), rechts), ...inhalt);
}

export const kpi = (titel: string, wert: string, unter: string | Node = "", trendWert?: Node | null) =>
  h(
    "div",
    { class: "a-karte a-kpi" },
    h("div", { class: "a-titel" }, titel),
    h("div", { class: "a-wert" }, wert, trendWert ?? null),
    unter ? h("div", { class: "a-unter" }, unter) : null,
  );

/** Veränderung gegenüber dem Vorzeitraum als kleine Pille („+12 %“), sonst nichts. */
export function trend(jetzt: number | null | undefined, vorher: number | null | undefined): HTMLElement | null {
  if (typeof jetzt !== "number" || typeof vorher !== "number") return null;
  if (!vorher) return jetzt ? h("span", { class: "a-trend hoch", title: "Vorzeitraum: 0" }, "neu") : null;
  const p = Math.round(((jetzt - vorher) / vorher) * 100);
  const art = p > 0 ? "hoch" : p < 0 ? "runter" : "gleich";
  return h("span", { class: `a-trend ${art}`, title: `Vorzeitraum: ${vorher.toLocaleString("de-DE")}` }, `${p > 0 ? "+" : ""}${p} %`);
}

/** Prozent mit einer Nachkommastelle, „—“ ohne Grundmenge. */
export const prozent = (teil: number, ganzes: number) => (ganzes ? `${((teil / ganzes) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %` : "—");

/** Trichter: Stufen mit Anzahl und Quote zur vorigen Stufe. */
export function stufen(liste: { name: string; anzahl: number; hilfe?: string }[]) {
  // Jede Spur zeigt den Anteil an der vorigen Stufe; so bleiben kleine Stufen sichtbar,
  // auch wenn die erste (Besuche) viel größer ist.
  const anteil = (i: number) => (i ? Math.min(1, liste[i].anzahl / Math.max(1, liste[i - 1].anzahl)) : liste[0].anzahl ? 1 : 0);
  return h(
    "ol",
    { class: "a-stufen" },
    liste.map((x, i) =>
      h(
        "li",
        {},
        h("div", { class: "a-stufe-kopf" }, h("span", {}, x.name), h("b", {}, x.anzahl.toLocaleString("de-DE"))),
        h("div", { class: "a-stufe-spur" }, h("span", { style: `width:${Math.max(2, anteil(i) * 100)}%;animation-delay:${i * 60}ms` })),
        h(
          "div",
          { class: "a-stufe-fuss" },
          !i ? x.hilfe || "Ausgangsmenge" : x.anzahl > liste[i - 1].anzahl ? "mehr als in der vorigen Stufe" : `${prozent(x.anzahl, liste[i - 1].anzahl)} der vorigen Stufe`,
        ),
      ),
    ),
  );
}

/** Kachel für eine Quelle, die nicht eingerichtet ist oder ausfiel. */
export function hinweisKachel(d: Daten | null | undefined): HTMLElement | null {
  if (!d || d.ok !== false) return null;
  return h("div", { class: `a-hinweis ${d.art === "fehler" ? "a-fehler" : ""}` }, d.text || "Nicht verfügbar.");
}

const STATUS_FARBE: Record<string, string> = {
  neu: "info",
  angenommen: "violett",
  eingeladen: "ok",
  warteliste: "warn",
  abgelehnt: "bad",
  "in-arbeit": "warn",
  erledigt: "ok",
  verworfen: "",
  active: "ok",
  inactive: "",
  expired: "bad",
  disabled: "bad",
  paid: "ok",
  refunded: "bad",
  delivered: "ok",
  bounced: "bad",
  complained: "bad",
  sent: "info",
  success: "ok",
  failure: "bad",
  cancelled: "",
  in_progress: "warn",
  queued: "warn",
};
/** Technische Status aus Lemon Squeezy, Resend und GitHub auf Deutsch. */
const STATUS_TEXT: Record<string, string> = {
  "in-arbeit": "in Arbeit",
  active: "aktiv",
  inactive: "inaktiv",
  expired: "abgelaufen",
  disabled: "gesperrt",
  paid: "bezahlt",
  pending: "offen",
  refunded: "erstattet",
  published: "aktiv",
  draft: "Entwurf",
  delivered: "zugestellt",
  bounced: "zurückgewiesen",
  complained: "Spam",
  sent: "gesendet",
  success: "erfolgreich",
  failure: "fehlgeschlagen",
  cancelled: "abgebrochen",
  in_progress: "läuft",
  queued: "wartet",
  completed: "fertig",
  skipped: "übersprungen",
};
export const badge = (text: string, farbe?: string) =>
  h("span", { class: `a-badge ${farbe ?? STATUS_FARBE[text] ?? ""}`, title: STATUS_TEXT[text] ? text : null }, STATUS_TEXT[text] ?? text);

export const leer = (text: string) => h("div", { class: "a-leer" }, text);

/** Waagerechte Balken für Verteilungen. */
export function balken(liste: { name: string; anzahl: number }[] | null | undefined, max = 10, skala?: number) {
  const top = (liste ?? []).slice(0, max);
  const groesst = skala ?? Math.max(1, ...top.map((x) => x.anzahl));
  if (!top.length || top.every((x) => !x.anzahl)) return leer("Noch keine Daten.");
  return h(
    "div",
    { class: "a-balken" },
    top.map((x, i) =>
      h(
        "div",
        { class: "a-balken-zeile", title: `${x.name}: ${x.anzahl}` },
        h("span", { class: "a-name" }, x.name),
        h("div", { class: "a-balken-spur" }, h("span", { style: `width:${(x.anzahl / groesst) * 100}%;animation-delay:${i * 40}ms` })),
        h("span", { class: "a-z" }, x.anzahl.toLocaleString("de-DE")),
      ),
    ),
  );
}

/** Flächendiagramm für Tageswerte. */
export function verlauf(
  werte: { tag: string; wert: number }[] | null | undefined,
  farbe = "var(--a-ink)",
  zweite?: { werte: { tag: string; wert: number }[]; farbe?: string; name: string; erste: string },
) {
  if (!werte?.length) return leer("Noch keine Daten.");
  const B = 600;
  const H = 150;
  const max = Math.max(1, ...werte.map((w) => w.wert));
  const x = (i: number) => (werte.length === 1 ? B / 2 : (i / (werte.length - 1)) * B);
  const y = (v: number) => H - 8 - (v / max) * (H - 24);
  const linie = werte.map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(w.wert).toFixed(1)}`).join(" ");
  const ns = "http://www.w3.org/2000/svg";
  const s = document.createElementNS(ns, "svg");
  s.setAttribute("viewBox", `0 0 ${B} ${H}`);
  s.setAttribute("preserveAspectRatio", "none");
  s.setAttribute("role", "img");
  const id = `g${Math.random().toString(36).slice(2, 7)}`;
  const defs = document.createElementNS(ns, "defs");
  const grad = document.createElementNS(ns, "linearGradient");
  grad.setAttribute("id", id);
  grad.setAttribute("x1", "0");
  grad.setAttribute("y1", "0");
  grad.setAttribute("x2", "0");
  grad.setAttribute("y2", "1");
  for (const [o, a] of [
    ["0", "0.12"],
    ["1", "0"],
  ]) {
    const st = document.createElementNS(ns, "stop");
    st.setAttribute("offset", o);
    st.style.stopColor = farbe;
    st.setAttribute("stop-opacity", a);
    grad.append(st);
  }
  defs.append(grad);
  s.append(defs);
  for (let i = 1; i <= 3; i++) {
    const l = document.createElementNS(ns, "line");
    l.setAttribute("x1", "0");
    l.setAttribute("x2", String(B));
    l.setAttribute("y1", String((H / 4) * i));
    l.setAttribute("y2", String((H / 4) * i));
    l.style.stroke = "var(--a-linie-2)";
    s.append(l);
  }
  const flaeche = document.createElementNS(ns, "path");
  flaeche.setAttribute("d", `${linie} L${B},${H} L0,${H} Z`);
  flaeche.setAttribute("fill", `url(#${id})`);
  const pfad = document.createElementNS(ns, "path");
  pfad.setAttribute("d", linie);
  pfad.setAttribute("fill", "none");
  pfad.style.stroke = farbe;
  pfad.setAttribute("stroke-width", "2");
  pfad.setAttribute("vector-effect", "non-scaling-stroke");
  s.append(flaeche, pfad);
  // Zweite Reihe mit eigener Skala (z. B. Anmeldungen über Besuchen), gestrichelt.
  const zweitNach = new Map((zweite?.werte ?? []).map((w) => [w.tag.slice(0, 10), w.wert]));
  const zweitMax = Math.max(1, ...zweitNach.values());
  if (zweite) {
    const y2 = (v: number) => H - 8 - (v / zweitMax) * (H - 24);
    const l2 = werte.map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y2(zweitNach.get(w.tag.slice(0, 10)) ?? 0).toFixed(1)}`).join(" ");
    const p2 = document.createElementNS(ns, "path");
    p2.setAttribute("d", l2);
    p2.setAttribute("fill", "none");
    p2.style.stroke = zweite.farbe ?? "var(--a-indigo)";
    p2.setAttribute("stroke-width", "2");
    p2.setAttribute("stroke-dasharray", "4 4");
    p2.setAttribute("vector-effect", "non-scaling-stroke");
    s.append(p2);
  }
  werte.forEach((w, i) => {
    const r = document.createElementNS(ns, "rect");
    r.setAttribute("x", String(x(i) - B / werte.length / 2));
    r.setAttribute("y", "0");
    r.setAttribute("width", String(B / werte.length));
    r.setAttribute("height", String(H));
    r.setAttribute("fill", "transparent");
    const t = document.createElementNS(ns, "title");
    t.textContent = `${new Date(w.tag).toLocaleDateString("de-DE")}: ${w.wert.toLocaleString("de-DE")}${zweite ? ` ${zweite.erste} · ${zweitNach.get(w.tag.slice(0, 10)) ?? 0} ${zweite.name}` : ""}`;
    r.append(t);
    s.append(r);
  });
  const fmt = (t: string) => new Date(t).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const legende = zweite
    ? h(
        "div",
        { class: "a-legende" },
        h("span", {}, h("i", { style: `background:${farbe}` }), `${zweite.erste} (max. ${max.toLocaleString("de-DE")})`),
        h("span", {}, h("i", { class: "gestrichelt", style: `border-color:${zweite.farbe ?? "var(--a-indigo)"}` }), `${zweite.name} (max. ${zweitMax.toLocaleString("de-DE")})`),
      )
    : null;
  return h(
    "div",
    { class: "a-diagramm" },
    legende,
    s,
    h("div", { class: "a-achse" }, h("span", {}, fmt(werte[0].tag)), zweite ? h("span") : h("span", {}, `max. ${max.toLocaleString("de-DE")}`), h("span", {}, fmt(werte[werte.length - 1].tag))),
  );
}

// ───────────── Tabelle mit Suche ─────────────

export interface Spalte {
  titel: string;
  wert: (z: Daten) => Node | string | number | null | undefined;
  klasse?: string;
  suche?: (z: Daten) => string;
}

type Filter = { name: string; werte: string[]; feld: (z: Daten) => string | string[] };
type Sammel = { titel: string; klasse?: string; aus: (zeilen: Daten[]) => void };

export function tabelle(
  spalten: Spalte[],
  zeilen: Daten[],
  opt: {
    suche?: boolean;
    /** Ein oder mehrere Filter; `feld` darf mehrere Werte liefern (z. B. Merkmale). */
    filter?: Filter | Filter[];
    beiKlick?: (z: Daten) => void;
    leerText?: string;
    /** Auswahl per Kästchen mit Sammelaktionen (bekommen die ausgewählten Zeilen). */
    auswahl?: { schluessel: (z: Daten) => string; aktionen: Sammel[] };
  } = {},
) {
  let text = "";
  const filter = opt.filter ? (Array.isArray(opt.filter) ? opt.filter : [opt.filter]) : [];
  const filterWerte = filter.map(() => "");
  const gewaehlt = new Set<string>();
  const tbody = h("tbody");
  const zaehler = h("span", { class: "a-klein", style: "color:var(--a-faint)" });
  const leiste = h("div", { class: "a-werkzeuge a-auswahl", style: "margin-bottom:12px", hidden: true });
  let sichtbar: Daten[] = [];
  const passt = (z: Daten) =>
    filter.every((f, i) => {
      if (!filterWerte[i]) return true;
      const w = f.feld(z);
      return Array.isArray(w) ? w.includes(filterWerte[i]) : w === filterWerte[i];
    });
  const zeigeLeiste = () => {
    if (!opt.auswahl) return;
    leiste.hidden = gewaehlt.size === 0;
    const ausgewaehlt = zeilen.filter((z) => gewaehlt.has(opt.auswahl!.schluessel(z)));
    leiste.replaceChildren(
      h("b", {}, `${gewaehlt.size} ausgewählt`),
      ...opt.auswahl.aktionen.map((a) => {
        const k = h("button", { class: `a-knopf ${a.klasse || ""}`, type: "button" }, a.titel);
        k.addEventListener("click", () => a.aus(ausgewaehlt));
        return k;
      }),
      (() => {
        const k = h("button", { class: "a-knopf", type: "button" }, "Auswahl aufheben");
        k.addEventListener("click", () => {
          gewaehlt.clear();
          zeichne();
        });
        return k;
      })(),
    );
  };
  const kopfKaestchen = h("input", { type: "checkbox", "aria-label": "Alle sichtbaren auswählen" }) as HTMLInputElement;
  kopfKaestchen.addEventListener("change", () => {
    for (const z of sichtbar) {
      const k = opt.auswahl!.schluessel(z);
      if (kopfKaestchen.checked) gewaehlt.add(k);
      else gewaehlt.delete(k);
    }
    zeichne();
  });
  const zeichne = () => {
    tbody.replaceChildren();
    const q = text.toLowerCase();
    sichtbar = zeilen.filter((z) => {
      if (!passt(z)) return false;
      if (!q) return true;
      return spalten.some((s) => String((s.suche ?? ((x: Daten) => String(s.wert(x) ?? "")))(z)).toLowerCase().includes(q));
    });
    zaehler.textContent = `${sichtbar.length} von ${zeilen.length}`;
    kopfKaestchen.checked = sichtbar.length > 0 && opt.auswahl ? sichtbar.every((z) => gewaehlt.has(opt.auswahl!.schluessel(z))) : false;
    zeigeLeiste();
    const breite = spalten.length + (opt.auswahl ? 1 : 0);
    if (!sichtbar.length) {
      tbody.append(h("tr", {}, h("td", { colspan: breite }, leer(opt.leerText || "Keine Einträge."))));
      return;
    }
    for (const z of sichtbar.slice(0, 500)) {
      const zellen = spalten.map((s) => {
        const v = s.wert(z);
        return h("td", { class: s.klasse || "" }, v instanceof Node ? v : v === null || v === undefined || v === "" ? "—" : String(v));
      });
      if (opt.auswahl) {
        const k = opt.auswahl.schluessel(z);
        const box = h("input", { type: "checkbox", "aria-label": "Auswählen", checked: gewaehlt.has(k) }) as HTMLInputElement;
        box.addEventListener("click", (e) => e.stopPropagation());
        box.addEventListener("change", () => {
          if (box.checked) gewaehlt.add(k);
          else gewaehlt.delete(k);
          zeigeLeiste();
          kopfKaestchen.checked = sichtbar.every((x) => gewaehlt.has(opt.auswahl!.schluessel(x)));
        });
        zellen.unshift(h("td", { class: "a-kaestchen" }, box));
      }
      const tr = h("tr", { class: opt.beiKlick ? "a-klickbar" : "", tabindex: opt.beiKlick ? 0 : null }, zellen);
      if (opt.beiKlick) {
        tr.addEventListener("click", () => opt.beiKlick!(z));
        tr.addEventListener("keydown", (e) => (e as KeyboardEvent).key === "Enter" && opt.beiKlick!(z));
      }
      tbody.append(tr);
    }
  };
  const werkzeuge = h("div", { class: "a-werkzeuge", style: "margin-bottom:12px" });
  if (opt.suche !== false) {
    const eingabe = h("input", { class: "a-eingabe", type: "search", placeholder: "Suchen …", "aria-label": "Suchen", style: "flex:1;min-width:180px" }) as HTMLInputElement;
    eingabe.addEventListener("input", () => {
      text = eingabe.value.trim();
      zeichne();
    });
    werkzeuge.append(eingabe);
  }
  filter.forEach((f, i) => {
    const sel = h("select", { class: "a-eingabe", "aria-label": f.name }, h("option", { value: "" }, `${f.name}: alle`), f.werte.map((w) => h("option", { value: w }, STATUS_TEXT[w] ?? w))) as HTMLSelectElement;
    sel.addEventListener("change", () => {
      filterWerte[i] = sel.value;
      zeichne();
    });
    werkzeuge.append(sel);
  });
  werkzeuge.append(zaehler);
  zeichne();
  const kopf = spalten.map((s) => h("th", { class: s.klasse || "" }, s.titel));
  if (opt.auswahl) kopf.unshift(h("th", { class: "a-kaestchen" }, kopfKaestchen));
  return h(
    "div",
    {},
    werkzeuge,
    leiste,
    h("div", { class: "a-tabelle-rahmen" }, h("table", { class: "a-tabelle" }, h("thead", {}, h("tr", {}, kopf)), tbody)),
  );
}

// ───────────── Schublade (Detailansicht) ─────────────

export function schublade(titel: string, ...inhalt: (Node | null | false)[]) {
  const s = document.getElementById("a-schublade")!;
  const schleier = document.getElementById("a-schleier")!;
  s.querySelector("h2")!.textContent = titel;
  s.querySelector(".a-schublade-inhalt")!.replaceChildren(...(inhalt.filter(Boolean) as Node[]));
  s.classList.add("offen");
  schleier.classList.add("offen");
  s.setAttribute("aria-hidden", "false");
  (s.querySelector("[data-zu]") as HTMLElement).focus();
}
export function schubladeZu() {
  document.getElementById("a-schublade")!.classList.remove("offen");
  document.getElementById("a-schleier")!.classList.remove("offen");
  document.getElementById("a-schublade")!.setAttribute("aria-hidden", "true");
}

export function liste(paare: [string, Node | string | number | null | undefined][]) {
  return h(
    "dl",
    { class: "a-dl" },
    paare.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v instanceof Node ? v : v === null || v === undefined || v === "" ? "—" : String(v))]),
  );
}

export function feld(titel: string, eingabe: HTMLElement, hilfe?: string) {
  return h("label", { class: "a-feld" }, h("span", {}, titel), eingabe, hilfe ? h("small", {}, hilfe) : null);
}
