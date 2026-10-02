/**
 * Popup-Menüs und Dialoge fürs Admin-Portal.
 *
 * - `popupMenue(anker, eintraege)`: Menü am Knopf, mit Pfeiltasten, Escape,
 *   Klick daneben schließt; Fokus kehrt zum Knopf zurück.
 * - `dialogFenster(titel, inhalt, …)`: natives <dialog> (Fokusfalle und
 *   Escape vom Browser), für Kataloge und Rückfragen.
 *
 * Inhalte kommen als Text bzw. fertige Knoten (dom.h) — nie als HTML.
 */
import { h, svg, ICONS } from "./dom";

export interface MenueEintrag {
  text: string;
  /** Kleinere zweite Zeile. */
  unter?: string;
  icon?: keyof typeof ICONS;
  aktion?: () => void;
  /** Link statt Aktion. */
  href?: string;
  /** Häkchen (Auswahl wie Radio). */
  gewaehlt?: boolean;
  gefahr?: boolean;
  aus?: boolean;
}
export type MenuePunkt = MenueEintrag | "trenner" | { titel: string };

let offen: { schliessen: () => void } | null = null;

/** Schließt ein offenes Popup-Menü (z. B. beim Seitenwechsel). */
export function menueZu() {
  offen?.schliessen();
}

export function popupMenue(anker: HTMLElement, punkte: MenuePunkt[], opt: { breite?: number; label?: string } = {}) {
  const warOffen = offen && anker.getAttribute("aria-expanded") === "true";
  menueZu();
  if (warOffen) return;

  const menue = h("div", { class: "a-popup", role: "menu", "aria-label": opt.label || anker.getAttribute("aria-label") || "Menü" });
  if (opt.breite) menue.style.width = `${opt.breite}px`;
  const eintraege: HTMLElement[] = [];
  for (const p of punkte) {
    if (p === "trenner") {
      menue.append(h("div", { class: "a-popup-trenner", role: "separator" }));
      continue;
    }
    if ("titel" in p) {
      menue.append(h("div", { class: "a-popup-titel" }, p.titel));
      continue;
    }
    const inhalt = [
      p.gewaehlt !== undefined ? h("span", { class: "a-popup-haken", "aria-hidden": "true" }, p.gewaehlt ? svg("M20 6 9 17l-5-5", 15) : null) : null,
      p.icon ? svg(ICONS[p.icon], 16) : null,
      h("span", { class: "a-popup-text" }, p.text, p.unter ? h("small", {}, p.unter) : null),
    ];
    const attrs = {
      class: `a-popup-eintrag${p.gefahr ? " gefahr" : ""}`,
      role: p.gewaehlt !== undefined ? "menuitemradio" : "menuitem",
      "aria-checked": p.gewaehlt !== undefined ? String(p.gewaehlt) : null,
      "aria-disabled": p.aus ? "true" : null,
      tabindex: -1,
    };
    const el = p.href ? h("a", { ...attrs, href: p.href }, ...inhalt) : h("button", { ...attrs, type: "button" }, ...inhalt);
    el.addEventListener("click", (e) => {
      if (p.aus) {
        e.preventDefault();
        return;
      }
      schliessen(false);
      p.aktion?.();
    });
    eintraege.push(el);
    menue.append(el);
  }
  document.body.append(menue);

  // Position: unter dem Knopf, rechtsbündig; bei Platzmangel darüber.
  const platziere = () => {
    const r = anker.getBoundingClientRect();
    const b = menue.offsetWidth;
    const hoehe = menue.offsetHeight;
    let links = Math.min(innerWidth - b - 8, Math.max(8, r.right - b));
    if (r.left + b < innerWidth - 8 && r.right - b < 8) links = r.left;
    const unten = r.bottom + 6 + hoehe < innerHeight - 8;
    menue.style.left = `${links}px`;
    menue.style.top = `${unten ? r.bottom + 6 : Math.max(8, r.top - 6 - hoehe)}px`;
  };
  platziere();
  requestAnimationFrame(() => menue.classList.add("offen"));
  anker.setAttribute("aria-expanded", "true");

  const fokus = (i: number) => {
    const aktiv = eintraege.filter((e) => e.getAttribute("aria-disabled") !== "true");
    if (!aktiv.length) return;
    aktiv[(i + aktiv.length) % aktiv.length].focus();
  };
  const taste = (e: KeyboardEvent) => {
    const aktiv = eintraege.filter((x) => x.getAttribute("aria-disabled") !== "true");
    const i = aktiv.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      schliessen(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      fokus(i + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      fokus(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      fokus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      fokus(aktiv.length - 1);
    } else if (e.key === "Tab") {
      schliessen(false);
    }
  };
  const daneben = (e: Event) => {
    if (!menue.contains(e.target as Node) && !anker.contains(e.target as Node)) schliessen(false);
  };
  menue.addEventListener("keydown", taste);
  setTimeout(() => document.addEventListener("pointerdown", daneben), 0);
  addEventListener("resize", platziere);
  addEventListener("scroll", platziere, true);
  fokus(0);

  function schliessen(zurueck: boolean) {
    document.removeEventListener("pointerdown", daneben);
    removeEventListener("resize", platziere);
    removeEventListener("scroll", platziere, true);
    anker.setAttribute("aria-expanded", "false");
    menue.remove();
    offen = null;
    if (zurueck) anker.focus();
  }
  offen = { schliessen: () => schliessen(false) };
}

/** Modaler Dialog mit Titel, Inhalt und Aktionen; gibt `schliessen` zurück. */
export function dialogFenster(titel: string, inhalt: Node, opt: { breit?: boolean; untertitel?: string } = {}) {
  const d = h("dialog", { class: `a-dialog${opt.breit ? " breit" : ""}`, "aria-label": titel }) as HTMLDialogElement;
  const zu = h("button", { class: "a-rund", type: "button", "aria-label": "Schließen" }, svg(ICONS.x, 16));
  d.append(
    h("div", { class: "a-dialog-kopf" }, h("div", {}, h("h2", {}, titel), opt.untertitel ? h("p", {}, opt.untertitel) : null), zu),
    h("div", { class: "a-dialog-inhalt" }, inhalt),
  );
  const schliessen = () => {
    d.close();
  };
  zu.addEventListener("click", schliessen);
  d.addEventListener("click", (e) => e.target === d && schliessen());
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
  return schliessen;
}
