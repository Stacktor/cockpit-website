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

export function bestaetigen(titel: string, text: string, ja = "Ja, fortfahren"): Promise<boolean> {
  return new Promise((fertig) => {
    const d = h("dialog", { class: "a-dialog" }) as HTMLDialogElement;
    const schliessen = (w: boolean) => {
      d.close();
      d.remove();
      fertig(w);
    };
    d.append(
      h("h3", {}, titel),
      h("p", {}, text),
      h(
        "div",
        { class: "a-werkzeuge" },
        h("button", { class: "a-knopf", type: "button", onclick: () => schliessen(false) }, "Abbrechen"),
        h("button", { class: "a-knopf a-p", type: "button", onclick: () => schliessen(true) }, ja),
      ),
    );
    d.addEventListener("cancel", () => schliessen(false));
    document.body.append(d);
    d.showModal();
  });
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

export const kpi = (titel: string, wert: string, unter = "") =>
  h("div", { class: "a-karte a-kpi" }, h("div", { class: "a-titel" }, titel), h("div", { class: "a-wert" }, wert), unter ? h("div", { class: "a-unter" }, unter) : null);

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
export const badge = (text: string, farbe?: string) => h("span", { class: `a-badge ${farbe ?? STATUS_FARBE[text] ?? ""}` }, text);

export const leer = (text: string) => h("div", { class: "a-leer" }, text);

/** Waagerechte Balken für Verteilungen. */
export function balken(liste: { name: string; anzahl: number }[], max = 10, skala?: number) {
  const top = liste.slice(0, max);
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
export function verlauf(werte: { tag: string; wert: number }[], farbe = "#4f7dff") {
  if (!werte.length) return leer("Noch keine Daten.");
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
    ["0", "0.35"],
    ["1", "0"],
  ]) {
    const st = document.createElementNS(ns, "stop");
    st.setAttribute("offset", o);
    st.setAttribute("stop-color", farbe);
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
    l.setAttribute("stroke", "#1f2935");
    s.append(l);
  }
  const flaeche = document.createElementNS(ns, "path");
  flaeche.setAttribute("d", `${linie} L${B},${H} L0,${H} Z`);
  flaeche.setAttribute("fill", `url(#${id})`);
  const pfad = document.createElementNS(ns, "path");
  pfad.setAttribute("d", linie);
  pfad.setAttribute("fill", "none");
  pfad.setAttribute("stroke", farbe);
  pfad.setAttribute("stroke-width", "2");
  pfad.setAttribute("vector-effect", "non-scaling-stroke");
  s.append(flaeche, pfad);
  werte.forEach((w, i) => {
    const r = document.createElementNS(ns, "rect");
    r.setAttribute("x", String(x(i) - B / werte.length / 2));
    r.setAttribute("y", "0");
    r.setAttribute("width", String(B / werte.length));
    r.setAttribute("height", String(H));
    r.setAttribute("fill", "transparent");
    const t = document.createElementNS(ns, "title");
    t.textContent = `${new Date(w.tag).toLocaleDateString("de-DE")}: ${w.wert}`;
    r.append(t);
    s.append(r);
  });
  const fmt = (t: string) => new Date(t).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return h("div", { class: "a-diagramm" }, s, h("div", { class: "a-achse" }, h("span", {}, fmt(werte[0].tag)), h("span", {}, `max. ${max}`), h("span", {}, fmt(werte[werte.length - 1].tag))));
}

// ───────────── Tabelle mit Suche ─────────────

export interface Spalte {
  titel: string;
  wert: (z: Daten) => Node | string | number | null | undefined;
  klasse?: string;
  suche?: (z: Daten) => string;
}

export function tabelle(
  spalten: Spalte[],
  zeilen: Daten[],
  opt: { suche?: boolean; filter?: { name: string; werte: string[]; feld: (z: Daten) => string }; beiKlick?: (z: Daten) => void; leerText?: string } = {},
) {
  let text = "";
  let filterWert = "";
  const tbody = h("tbody");
  const zaehler = h("span", { class: "a-klein", style: "color:var(--a-faint)" });
  const zeichne = () => {
    tbody.replaceChildren();
    const q = text.toLowerCase();
    const sichtbar = zeilen.filter((z) => {
      if (opt.filter && filterWert && opt.filter.feld(z) !== filterWert) return false;
      if (!q) return true;
      return spalten.some((s) => String((s.suche ?? ((x: Daten) => String(s.wert(x) ?? "")))(z)).toLowerCase().includes(q));
    });
    zaehler.textContent = `${sichtbar.length} von ${zeilen.length}`;
    if (!sichtbar.length) {
      tbody.append(h("tr", {}, h("td", { colspan: spalten.length }, leer(opt.leerText || "Keine Einträge."))));
      return;
    }
    for (const z of sichtbar.slice(0, 500)) {
      const tr = h(
        "tr",
        { class: opt.beiKlick ? "a-klickbar" : "", tabindex: opt.beiKlick ? 0 : null },
        spalten.map((s) => {
          const v = s.wert(z);
          return h("td", { class: s.klasse || "" }, v instanceof Node ? v : v === null || v === undefined || v === "" ? "—" : String(v));
        }),
      );
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
  if (opt.filter) {
    const sel = h("select", { class: "a-eingabe", "aria-label": opt.filter.name }, h("option", { value: "" }, `${opt.filter.name}: alle`), opt.filter.werte.map((w) => h("option", { value: w }, w))) as HTMLSelectElement;
    sel.addEventListener("change", () => {
      filterWert = sel.value;
      zeichne();
    });
    werkzeuge.append(sel);
  }
  werkzeuge.append(zaehler);
  zeichne();
  return h(
    "div",
    {},
    werkzeuge,
    h("div", { class: "a-tabelle-rahmen" }, h("table", { class: "a-tabelle" }, h("thead", {}, h("tr", {}, spalten.map((s) => h("th", { class: s.klasse || "" }, s.titel)))), tbody)),
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
