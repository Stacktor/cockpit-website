/**
 * Admin-Portal: Seitenleiste, Hash-Router (#/alpha …), Neu-Laden, Sperrbildschirm.
 * Jede Ansicht holt ihre Daten selbst über /api/admin/*.
 */
import { h, svg, ICONS } from "./dom";
import { ApiFehler, schubladeZu, tokenAusAdresse } from "./ui";
import * as B from "./bereiche";

type Id = keyof typeof B;
const NAV: { gruppe: string; punkte: { id: Id; titel: string; icon: keyof typeof ICONS }[] }[] = [
  { gruppe: "Überblick", punkte: [{ id: "uebersicht", titel: "Übersicht", icon: "start" }] },
  {
    gruppe: "Alpha",
    punkte: [
      { id: "alpha", titel: "Anmeldungen", icon: "alpha" },
      { id: "umfragen", titel: "Umfragen", icon: "umfrage" },
      { id: "fehler", titel: "Fehlerberichte", icon: "fehler" },
    ],
  },
  {
    gruppe: "Geschäft",
    punkte: [
      { id: "lizenzen", titel: "Lizenzen", icon: "lizenz" },
      { id: "umsatz", titel: "Kunden & Umsatz", icon: "umsatz" },
      { id: "mail", titel: "Mail", icon: "mail" },
    ],
  },
  {
    gruppe: "Betrieb",
    punkte: [
      { id: "analytics", titel: "Analytics", icon: "analytics" },
      { id: "builds", titel: "Downloads & Builds", icon: "builds" },
      { id: "einstellungen", titel: "Einstellungen", icon: "einstellungen" },
    ],
  },
];
const TITEL = Object.fromEntries(NAV.flatMap((g) => g.punkte.map((p) => [p.id, p.titel]))) as Record<Id, string>;

const leiste = document.getElementById("a-leiste")!;
const inhalt = document.getElementById("a-inhalt")!;
const titel = document.getElementById("a-titel")!;
const stand = document.getElementById("a-stand")!;

function aktuell(): Id {
  const id = location.hash.replace(/^#\/?/, "") as Id;
  return id in TITEL ? id : "uebersicht";
}

function zeichneLeiste() {
  const nav = document.getElementById("a-nav")!;
  nav.replaceChildren(
    ...NAV.flatMap((g) => [
      h("div", { class: "a-gruppe" }, g.gruppe),
      ...g.punkte.map((p) =>
        h("a", { class: "a-nav", href: `#/${p.id}`, "aria-current": p.id === aktuell() ? "page" : null }, svg(ICONS[p.icon]), p.titel),
      ),
    ]),
  );
}

let lauf = 0;
async function lade() {
  const id = aktuell();
  const meinLauf = ++lauf;
  titel.textContent = TITEL[id];
  document.title = `${TITEL[id]} · cockpit Admin`;
  zeichneLeiste();
  schubladeZu();
  leiste.classList.remove("offen");
  inhalt.replaceChildren(h("div", { class: "a-lade" }, h("div"), h("div"), h("div")));
  const ziel = h("div", { class: "a-inhalt", style: "padding:0;animation:none" });
  try {
    await B[id](ziel, lade);
    if (meinLauf !== lauf) return;
    inhalt.replaceChildren(...ziel.childNodes);
    stand.textContent = `Stand ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (e) {
    if (meinLauf !== lauf) return;
    const f = e as ApiFehler;
    if (f.status === 401 || f.status === 503) {
      inhalt.replaceChildren(
        h(
          "div",
          { class: "a-sperre" },
          svg(ICONS.lizenz, 36),
          h("h2", { style: "color:var(--a-ink);margin:0" }, "Kein Zugang"),
          h("p", { style: "max-width:520px;margin:0" }, f.message),
        ),
      );
    } else {
      inhalt.replaceChildren(h("div", { class: "a-hinweis a-fehler" }, `Konnte nicht geladen werden: ${f.message}`));
    }
  }
}

tokenAusAdresse();
addEventListener("hashchange", lade);
document.getElementById("a-neu")!.addEventListener("click", lade);
document.getElementById("a-menue")!.addEventListener("click", () => leiste.classList.toggle("offen"));
document.getElementById("a-schleier")!.addEventListener("click", schubladeZu);
document.querySelector("[data-zu]")!.addEventListener("click", schubladeZu);
addEventListener("keydown", (e) => e.key === "Escape" && schubladeZu());
lade();
