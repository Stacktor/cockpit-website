/**
 * Admin-Portal: Navigation oben (mobil als Blatt), Hash-Router (#/alpha …),
 * Seitenkopf mit maskierter Titel-Einblendung, Neu-Laden, Sperrbildschirm.
 * Jede Ansicht holt ihre Daten selbst über /api/admin/*.
 */
import { h, svg, ICONS } from "./dom";
import { ApiFehler, schubladeZu, tokenAusAdresse } from "./ui";
import { menueZu } from "./menue";
import { glockeOeffnen } from "./uebersicht";
import * as B from "./bereiche";

type Id = keyof typeof B;
const NAV: { id: Id; titel: string; kurz: string; text: string }[] = [
  { id: "uebersicht", titel: "Übersicht", kurz: "Übersicht", text: "Alpha, Feedback, Lizenzen und Betrieb auf einen Blick." },
  { id: "alpha", titel: "Anmeldungen", kurz: "Alpha", text: "Bewerbungen für die Alpha prüfen, annehmen und einladen." },
  { id: "umfragen", titel: "Umfragen", kurz: "Umfragen", text: "Fragebögen für die App anlegen und Antworten auswerten." },
  { id: "fehler", titel: "Fehlerberichte", kurz: "Fehler", text: "Meldungen aus der App sichten und abarbeiten." },
  { id: "lizenzen", titel: "Lizenzen", kurz: "Lizenzen", text: "Schlüssel, Geräte und Laufzeiten aus Lemon Squeezy." },
  { id: "umsatz", titel: "Kunden & Umsatz", kurz: "Umsatz", text: "Bestellungen, Kunden, Erstattungen und Rabattcodes." },
  { id: "mail", titel: "Mail", kurz: "Mail", text: "Zustellung prüfen und Rundmails an Tester schicken." },
  { id: "analytics", titel: "Analytics", kurz: "Analytics", text: "Besuche, Quellen, Kampagnen und der Weg zur Anmeldung." },
  { id: "speicher", titel: "Speicher", kurz: "Speicher", text: "Der Sync-Bucket: Belegung je Lizenz und Gerät, aufräumen." },
  { id: "builds", titel: "Downloads & Builds", kurz: "Builds", text: "Releases, Downloads je Plattform und Build-Läufe." },
  { id: "alarme", titel: "Alarme", kurz: "Alarme", text: "Eigene Regeln, wann das Admin dich warnt, auf Wunsch per Mail." },
  { id: "doku", titel: "Doku", kurz: "Doku", text: "Interne Doku aus dem privaten Repo. Nur du siehst sie." },
  { id: "einstellungen", titel: "Einstellungen", kurz: "Einstellungen", text: "API-Schlüssel, Verbindungen und Audit-Log." },
];
const EINTRAG = Object.fromEntries(NAV.map((p) => [p.id, p])) as Record<Id, (typeof NAV)[number]>;
/** In der Kopfleiste steht „Einstellungen" als Zahnrad rechts. */
const OBEN = NAV.filter((p) => p.id !== "einstellungen");

const inhalt = document.getElementById("a-inhalt")!;
const titel = document.getElementById("a-titel")!;
const beschreibung = document.getElementById("a-beschreibung")!;
const stand = document.getElementById("a-stand")!;
const blatt = document.getElementById("a-blatt")!;
const menue = document.getElementById("a-menue")!;
const reduziert = matchMedia("(prefers-reduced-motion: reduce)");

function aktuell(): Id {
  const id = location.hash.replace(/^#\/?/, "") as Id;
  return id in EINTRAG ? id : "uebersicht";
}

function zeichneNavigation() {
  const id = aktuell();
  document.getElementById("a-nav")!.replaceChildren(
    ...OBEN.map((p) => h("a", { class: "a-nav", href: `#/${p.id}`, "aria-current": p.id === id ? "page" : null }, p.kurz)),
  );
  document.getElementById("a-blatt-nav")!.replaceChildren(
    ...NAV.map((p) =>
      h(
        "a",
        { class: "a-blatt-link", href: `#/${p.id}`, "aria-current": p.id === id ? "page" : null },
        h("span", {}, p.titel),
        h("small", {}, p.text),
      ),
    ),
  );
  document.getElementById("a-ziele")!.replaceChildren(...NAV.map((p) => h("option", { value: p.titel })));
}

// ───────────── Mobiles Blatt (Fokusfalle, Escape) ─────────────

function blattAuf() {
  blatt.hidden = false;
  requestAnimationFrame(() => blatt.classList.add("offen"));
  menue.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  (blatt.querySelector("[aria-current=page]") as HTMLElement | null)?.focus();
}
function blattZu() {
  if (blatt.hidden) return;
  blatt.classList.remove("offen");
  menue.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  setTimeout(() => (blatt.hidden = true), reduziert.matches ? 0 : 220);
}
blatt.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const fokus = [...blatt.querySelectorAll<HTMLElement>("a, button")];
  const erst = fokus[0];
  const letzt = fokus[fokus.length - 1];
  if (e.shiftKey && document.activeElement === erst) {
    e.preventDefault();
    letzt.focus();
  } else if (!e.shiftKey && document.activeElement === letzt) {
    e.preventDefault();
    erst.focus();
  }
});

// ───────────── Einblendung ─────────────

/** Maskierte Titel-Einblendung und gestaffeltes Hereinkommen der Karten. */
function einblenden() {
  if (reduziert.matches) return;
  titel.classList.remove("a-rein");
  void titel.offsetWidth;
  titel.classList.add("a-rein");
  const karten = inhalt.querySelectorAll<HTMLElement>(".a-karte, .a-hinweis, .a-kachel");
  karten.forEach((k, i) => {
    k.classList.add("a-auftritt");
    k.style.animationDelay = `${Math.min(i, 8) * 70}ms`;
  });
}

// ───────────── Neue Version ─────────────
// Ein Tab, der über ein Deployment hinweg offen bleibt, hätte sonst altes
// Skript gegen die neue API (z. B. „Cannot read properties of undefined“).
// Vergleicht die eingebundenen Skripte mit denen der aktuellen Seite.
const skripte = (d: Document) =>
  [...d.querySelectorAll("script[src]")]
    .map((s) => new URL(s.getAttribute("src") ?? "", location.href).pathname)
    .filter((p) => p.startsWith("/_astro/"))
    .sort()
    .join(" ");
const MEINE_SKRIPTE = skripte(document);
const PRUEF_ABSTAND = 5 * 60_000;
let geprueft = Date.now();

async function neueVersion(): Promise<boolean> {
  geprueft = Date.now();
  try {
    const r = await fetch(location.pathname, { cache: "no-store", credentials: "same-origin" });
    if (!r.ok) return false;
    const dort = skripte(new DOMParser().parseFromString(await r.text(), "text/html"));
    return !!dort && !!MEINE_SKRIPTE && dort !== MEINE_SKRIPTE;
  } catch {
    return false;
  }
}

/** Lädt die Seite neu (Bereich bleibt über den Hash erhalten), höchstens einmal je Minute. */
function neuLaden(): boolean {
  try {
    const zuletzt = Number(sessionStorage.getItem("admin-neu-geladen") || 0);
    if (Date.now() - zuletzt < 60_000) return false;
    sessionStorage.setItem("admin-neu-geladen", String(Date.now()));
  } catch {
    // Ohne sessionStorage trotzdem neu laden.
  }
  location.reload();
  return true;
}

let lauf = 0;
async function lade() {
  const id = aktuell();
  const meinLauf = ++lauf;
  const e = EINTRAG[id];
  titel.textContent = e.titel;
  beschreibung.textContent = e.text;
  document.title = `${e.titel} · cockpit Admin`;
  zeichneNavigation();
  schubladeZu();
  blattZu();
  menueZu();
  inhalt.replaceChildren(h("div", { class: "a-lade" }, h("div"), h("div"), h("div")));
  if (Date.now() - geprueft > PRUEF_ABSTAND && (await neueVersion()) && neuLaden()) return;
  if (meinLauf !== lauf) return;
  const ziel = h("div");
  try {
    await B[id](ziel, lade);
    if (meinLauf !== lauf) return;
    inhalt.replaceChildren(...ziel.childNodes);
    stand.textContent = `Stand ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    einblenden();
  } catch (err) {
    if (meinLauf !== lauf) return;
    const f = err as ApiFehler;
    if (f.status === 401 || f.status === 503) {
      inhalt.replaceChildren(
        h(
          "div",
          { class: "a-sperre" },
          h("div", { class: "a-kachel-icon a-dunkel" }, svg(ICONS.lizenz, 22)),
          h("h2", {}, "Kein Zugang"),
          h("p", {}, f.message),
        ),
      );
    } else {
      // Ein Programmfehler statt einer API-Antwort: oft nur eine veraltete Seite.
      if (!(err instanceof ApiFehler) && (await neueVersion()) && neuLaden()) return;
      if (meinLauf !== lauf) return;
      inhalt.replaceChildren(
        h(
          "div",
          { class: "a-hinweis a-fehler" },
          `Konnte nicht geladen werden: ${f.message}`,
          " ",
          h("button", { type: "button", class: "a-knopf a-klein", onclick: () => location.reload() }, "Seite neu laden"),
        ),
      );
    }
  }
}

// ───────────── Ereignisse ─────────────

tokenAusAdresse();
addEventListener("hashchange", lade);
document.getElementById("a-neu")!.addEventListener("click", lade);
const glocke = document.getElementById("a-glocke")!;
glocke.addEventListener("click", () => void glockeOeffnen(glocke));
menue.addEventListener("click", () => (blatt.hidden ? blattAuf() : blattZu()));
document.querySelector("[data-blatt-zu]")!.addEventListener("click", blattZu);
document.getElementById("a-schleier")!.addEventListener("click", schubladeZu);
document.querySelector("[data-zu]")!.addEventListener("click", schubladeZu);
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  schubladeZu();
  blattZu();
});
const suche = document.getElementById("a-suche") as HTMLInputElement;
const springe = () => {
  const q = suche.value.trim().toLowerCase();
  if (!q) return;
  const ziel = NAV.find((p) => p.titel.toLowerCase() === q) ?? NAV.find((p) => `${p.titel} ${p.kurz}`.toLowerCase().includes(q));
  if (ziel) {
    location.hash = `#/${ziel.id}`;
    suche.value = "";
    suche.blur();
  }
};
suche.addEventListener("change", springe);
suche.addEventListener("keydown", (e) => e.key === "Enter" && springe());
lade();
