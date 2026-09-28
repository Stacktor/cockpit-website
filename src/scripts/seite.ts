/**
 * Kleine, abhängigkeitsfreie Helfer für jede Seite: Einblenden beim Scrollen,
 * schrumpfende Kopfzeile, Knopf-Welle, Hell/Dunkel-Umschalter, Menüs.
 * Alles respektiert „Bewegung reduzieren".
 */

const ruhig = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function einblenden() {
  const teile = document.querySelectorAll<HTMLElement>(".rv");
  if (ruhig() || !("IntersectionObserver" in window)) {
    teile.forEach((t) => t.classList.add("an"));
    return;
  }
  const beobachter = new IntersectionObserver(
    (eintraege) => {
      for (const e of eintraege) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("an");
        beobachter.unobserve(e.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  teile.forEach((t) => beobachter.observe(t));
}

function kopfzeile() {
  const kopf = document.querySelector<HTMLElement>(".kopf");
  if (!kopf) return;
  let klein: boolean | null = null;
  const pruefe = () => {
    const jetzt = scrollY > 24;
    if (jetzt !== klein) {
      kopf.classList.toggle("klein", jetzt);
      klein = jetzt;
    }
  };
  addEventListener("scroll", pruefe, { passive: true });
  pruefe();
}

function welle() {
  if (ruhig()) return;
  document.addEventListener("pointerdown", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>(".btn");
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty("--wx", `${((e.clientX - r.left) / r.width) * 100}%`);
    b.style.setProperty("--wy", `${((e.clientY - r.top) / r.height) * 100}%`);
    b.classList.remove("welle");
    void b.offsetWidth;
    b.classList.add("welle");
    setTimeout(() => b.classList.remove("welle"), 600);
  });
}

type Wahl = "light" | "dark" | "system";

function farbschema() {
  const html = document.documentElement;
  const medien = matchMedia("(prefers-color-scheme: dark)");
  const anwenden = (wahl: Wahl) => {
    const dunkel = wahl === "dark" || (wahl === "system" && medien.matches);
    html.dataset.theme = dunkel ? "dark" : "light";
    html.dataset.themeWahl = wahl;
    document.querySelectorAll<HTMLButtonElement>("[data-theme-knopf]").forEach((k) => {
      k.setAttribute("aria-pressed", String(k.dataset.themeKnopf === wahl));
    });
  };
  const aktuell = () => (html.dataset.themeWahl as Wahl) || "system";
  anwenden(aktuell());
  medien.addEventListener("change", () => anwenden(aktuell()));
  document.querySelectorAll<HTMLButtonElement>("[data-theme-knopf]").forEach((k) => {
    k.addEventListener("click", () => {
      const wahl = k.dataset.themeKnopf as Wahl;
      try {
        localStorage.setItem("cockpit-web-theme", wahl);
      } catch {
        /* privat: nur für diese Seite */
      }
      anwenden(wahl);
    });
  });
}

/** Mega-Menüs (Desktop): Klick, Hover mit Verzögerung, Escape, Klick daneben. */
function megamenues() {
  const eintraege = [...document.querySelectorAll<HTMLElement>("[data-menue]")];
  const schliesseAlle = (ausser?: HTMLElement) => {
    for (const e of eintraege) {
      if (e === ausser) continue;
      e.querySelector("button")?.setAttribute("aria-expanded", "false");
      e.classList.remove("offen");
    }
  };
  const feinZeiger = matchMedia("(hover: hover) and (pointer: fine)");
  for (const e of eintraege) {
    const knopf = e.querySelector<HTMLButtonElement>("button");
    if (!knopf) continue;
    const oeffne = () => {
      schliesseAlle(e);
      e.classList.add("offen");
      knopf.setAttribute("aria-expanded", "true");
    };
    const schliesse = () => {
      e.classList.remove("offen");
      knopf.setAttribute("aria-expanded", "false");
    };
    knopf.addEventListener("click", () => (e.classList.contains("offen") ? schliesse() : oeffne()));
    let t: number | undefined;
    e.addEventListener("pointerenter", () => {
      if (!feinZeiger.matches) return;
      clearTimeout(t);
      t = window.setTimeout(oeffne, 80);
    });
    e.addEventListener("pointerleave", () => {
      if (!feinZeiger.matches) return;
      clearTimeout(t);
      t = window.setTimeout(schliesse, 180);
    });
    e.addEventListener("focusout", (ev) => {
      if (!e.contains(ev.relatedTarget as Node)) schliesse();
    });
  }
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    const offen = eintraege.find((e) => e.classList.contains("offen"));
    if (offen) {
      schliesseAlle();
      offen.querySelector<HTMLButtonElement>("button")?.focus();
    }
  });
  document.addEventListener("click", (ev) => {
    if (!eintraege.some((e) => e.contains(ev.target as Node))) schliesseAlle();
  });
}

/** Burger-Menü (Mobil): Seitenblatt mit Fokusfalle und Scroll-Sperre. */
function burger() {
  const knopf = document.querySelector<HTMLButtonElement>(".burger");
  const blatt = document.getElementById("mobilmenue");
  if (!knopf || !blatt) return;
  const fokussierbar = () =>
    [...blatt.querySelectorAll<HTMLElement>("a, button, summary")].filter((x) => x.offsetParent !== null);
  const setze = (offen: boolean) => {
    knopf.setAttribute("aria-expanded", String(offen));
    knopf.setAttribute("aria-label", offen ? "Menü schließen" : "Menü öffnen");
    document.body.classList.toggle("menue-offen", offen);
    blatt.toggleAttribute("inert", !offen);
    if (offen) setTimeout(() => fokussierbar()[0]?.focus(), 60);
  };
  setze(false);
  knopf.addEventListener("click", () => setze(knopf.getAttribute("aria-expanded") !== "true"));
  blatt.querySelector("[data-schliessen]")?.addEventListener("click", () => {
    setze(false);
    knopf.focus();
  });
  blatt.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) setze(false);
  });
  document.addEventListener("keydown", (e) => {
    if (knopf.getAttribute("aria-expanded") !== "true") return;
    if (e.key === "Escape") {
      setze(false);
      knopf.focus();
    }
    if (e.key === "Tab") {
      const f = fokussierbar();
      if (!f.length) return;
      const erstes = f[0];
      const letztes = f[f.length - 1];
      if (e.shiftKey && document.activeElement === erstes) {
        e.preventDefault();
        letztes.focus();
      } else if (!e.shiftKey && document.activeElement === letztes) {
        e.preventDefault();
        erstes.focus();
      }
    }
  });
  matchMedia("(min-width: 961px)").addEventListener("change", (m) => m.matches && setze(false));
}

/** Freie Alpha-Plätze überall dort, wo `[data-alpha-plaetze]` steht. */
async function alphaPlaetze() {
  const ziele = document.querySelectorAll<HTMLElement>("[data-alpha-plaetze]");
  if (!ziele.length) return;
  try {
    const r = await fetch("/api/alpha", { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as { plaetze?: number; frei?: number };
    if (typeof d.frei !== "number" || typeof d.plaetze !== "number") return;
    ziele.forEach((z) => {
      z.textContent =
        d.frei! > 0 ? `Noch ${d.frei} von ${d.plaetze} Plätzen frei` : "Alle Plätze vergeben — Warteliste offen";
      z.closest("[hidden]")?.removeAttribute("hidden");
    });
  } catch {
    /* Zähler ist Beiwerk */
  }
}

/**
 * Kommt jemand über einen Kampagnen-Link (utm_…) auf irgendeine Seite, tragen die
 * Links zur Alpha-Anmeldung die Kennzeichen weiter — ohne etwas zu speichern.
 */
function kampagneWeitergeben() {
  const p = new URLSearchParams(location.search);
  const weiter = new URLSearchParams();
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"]) {
    const v = p.get(k);
    if (v) weiter.set(k, v.slice(0, 80));
  }
  if (![...weiter.keys()].length) return;
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/alpha/"]').forEach((a) => {
    const url = new URL(a.href);
    weiter.forEach((v, k) => url.searchParams.set(k, v));
    a.href = url.pathname + url.search + url.hash;
  });
}

export function starteSeite() {
  einblenden();
  kopfzeile();
  welle();
  farbschema();
  megamenues();
  burger();
  void alphaPlaetze();
  kampagneWeitergeben();
}
