import { h, datum, relativ, type Daten } from "./dom";
import { api, aktion, bestaetigen, knopf, leer } from "./ui";
import type { Bereich } from "./bereiche";

/** Wie viele Änderungen sofort sichtbar sind; der Rest klappt auf. */
const SICHTBAR = 6;
const ARTEN = ["Neu", "Verbessert", "Behoben"] as const;
const PLATTFORMEN = ["Windows", "Mac"] as const;

type Stand = "synchron" | "ohne-build" | "laeuft" | "fehler" | "bereit";

const kurz = (sha: string) => String(sha || "").slice(0, 7);
const titelOhneNummer = (t: unknown) => String(t || "Entwicklungsstand").replace(/\s*\(#\d+\)$/, "");
const plural = (n: number, eins: string, viele: string) => `${n} ${n === 1 ? eins : viele}`;

/** Ein Plattform-Baustein: Punkt + Name + Zustand in Worten, nie nur Farbe. */
function plattform(name: string, s?: Daten) {
  const art = !s ? "wartet" : s.status === "Bereit" ? "ok" : s.status === "Fehlgeschlagen" ? "bad" : "lauf";
  const text = !s ? "Wartet" : s.status === "Bereit" ? "Fertig" : s.status === "Fehlgeschlagen" ? "Fehlgeschlagen" : "Wird gebaut";
  const inhalt = [h("span", { class: "a-fg-punkt", "aria-hidden": "true" }), h("span", { class: "a-fg-pname" }, name), h("span", { class: "a-fg-ptext" }, text)];
  return s?.url
    ? h("a", { class: `a-fg-plattform ${art}`, href: s.url, target: "_blank", rel: "noopener", title: "Bauprotokoll öffnen" }, ...inhalt)
    : h("span", { class: `a-fg-plattform ${art}` }, ...inhalt);
}

const plattformen = (systeme: Daten[] = []) =>
  h("div", { class: "a-fg-plattformen" }, ...PLATTFORMEN.map((n) => plattform(n, systeme.find((s) => s.name === n))));

function stand(d: Daten, build?: Daten): Stand {
  if (d.gleicherStand) return "synchron";
  if (!build) return "ohne-build";
  if ((build.systeme || []).some((s: Daten) => s.status === "Fehlgeschlagen")) return "fehler";
  if (build.freigabefaehig) return "bereit";
  return "laeuft";
}

/** Drei Schritte als Leiste: was ist erledigt, was ist jetzt dran. */
function schritte(d: Daten, build: Daten | undefined, zustand: Stand) {
  const anzahl = (d.aenderungen || []).length;
  const alphaLaeuft = (d.freigaben || []).some((r: Daten) => r.status === "Läuft");
  const eintrag = (nr: number, titel: string, text: string, art: "fertig" | "jetzt" | "offen") =>
    h("li", { class: `a-fg-schritt ${art}`, "aria-current": art === "jetzt" ? "step" : null }, h("span", { class: "a-fg-nr" }, art === "fertig" ? "✓" : String(nr)), h("div", {}, h("strong", {}, titel), h("small", {}, text)));
  const zwei = zustand === "bereit" || zustand === "synchron" ? "fertig" : "jetzt";
  const zweiText =
    zustand === "synchron" ? "Nichts offen" : zustand === "bereit" ? `Build ${build?.nummer} getestet` : zustand === "fehler" ? "Ein Testbuild ist fehlgeschlagen" : zustand === "laeuft" ? "Testbuilds laufen" : "Noch kein Testbuild";
  const drei = alphaLaeuft ? "jetzt" : zustand === "bereit" ? "jetzt" : "offen";
  const dreiText = alphaLaeuft ? "Freigabe wird gebaut" : zustand === "bereit" ? "Wartet auf deine Entscheidung" : d.alpha ? `Aktuell live: ${d.alpha.version}` : "Noch nichts veröffentlicht";
  return h(
    "ol",
    { class: "a-fg-schritte", "aria-label": "Ablauf von der Änderung bis zur Alpha" },
    eintrag(1, "Änderungen", zustand === "synchron" ? "Alpha ist aktuell" : plural(anzahl, "Änderung", "Änderungen") + " seit der Alpha", "fertig"),
    eintrag(2, "Dev testen", zweiText, zwei),
    eintrag(3, "Alpha freigeben", dreiText, drei),
  );
}

/** Die eine Karte, die sagt, was jetzt zu tun ist. */
function naechsterSchritt(d: Daten, build: Daten | undefined, zustand: Stand, neu: () => void) {
  const testen = (text: string, art: string) => {
    const k = knopf(text, () =>
      void (async () => {
        if (!(await bestaetigen("Dev-Build erstellen?", "Der aktuelle Stand wird für Windows und Mac gebaut. Die Alpha bleibt dabei bestehen.", "Testbuild erstellen"))) return;
        await aktion(k, () => api("releases", { aktion: "testen", sha: d.dev }), neu);
      })(), art);
    k.disabled = !d.freigabeVerbunden;
    return k;
  };

  const texte: Record<Stand, { kopf: string; text: string }> = {
    synchron: { kopf: "Alpha ist auf dem neuesten Stand", text: "Dev und Alpha enthalten denselben Quellstand. Es gibt nichts freizugeben." },
    "ohne-build": { kopf: "Für den aktuellen Stand fehlt noch ein Testbuild", text: "Erst wenn Windows und Mac gebaut und von dir ausprobiert sind, lässt sich der Stand für die Alpha freigeben." },
    laeuft: { kopf: "Testbuilds werden gebaut", text: "Sobald beide Plattformen fertig sind, kannst du den Stand ausprobieren und freigeben." },
    fehler: { kopf: "Ein Testbuild ist fehlgeschlagen", text: "Öffne das Bauprotokoll der betroffenen Plattform. Danach lässt sich der Testbuild neu starten." },
    bereit: { kopf: "Bereit für deine Entscheidung", text: "Beide Testbuilds sind fertig. Probiere den Build auf deinen Geräten aus und gib ihn dann frei." },
  };
  const t = texte[zustand];

  let aktionen: (HTMLElement | null)[] = [];
  if (zustand === "bereit" && build) {
    const alpha = knopf("Für Alpha freigeben", () =>
      void (async () => {
        if (!(await bestaetigen(`Build ${build.nummer} für Alpha freigeben?`, "Genau dieser getestete Stand wird übernommen und ohne Dev-Werkzeuge neu gebaut. Erst nach erfolgreichen Plattform- und Signaturprüfungen erhalten Alpha-Nutzer das Update.", "Alpha freigeben"))) return;
        await aktion(alpha, () => api("releases", { aktion: "alpha", sha: build.sha }), neu);
      })(), "a-p a-fg-gross");
    alpha.disabled = !d.freigabeVerbunden;
    aktionen = [alpha];
  } else if (zustand === "ohne-build") aktionen = [testen("Testbuild erstellen", "a-p a-fg-gross")];
  else if (zustand === "fehler") aktionen = [testen("Testbuild neu starten", "a-p a-fg-gross")];

  return h(
    "section",
    { class: `a-karte a-fg-haupt ${zustand}`, "aria-live": "polite" },
    h("div", { class: "a-fg-haupt-text" },
      h("span", { class: "a-fg-kicker" }, "Nächster Schritt"),
      h("h2", {}, t.kopf),
      h("p", {}, t.text),
      !d.freigabeVerbunden ? h("p", { class: "a-fg-hinweis" }, "Die Knöpfe sind gesperrt, bis der Freigabeanschluss verbunden ist. ", h("a", { href: "#/einstellungen" }, "Verbindung einrichten →")) : null),
    build && zustand !== "synchron"
      ? h("div", { class: "a-fg-build" },
          h("div", { class: "a-fg-build-kopf" }, h("strong", {}, `Build ${build.nummer}`), h("span", {}, `${build.version || "Dev"} · ${relativ(build.zeit)}`)),
          h("p", { class: "a-fg-build-titel" }, titelOhneNummer(build.titel)),
          plattformen(build.systeme))
      : null,
    aktionen.length ? h("div", { class: "a-fg-aktion" }, ...aktionen) : null,
    zustand === "bereit" || zustand === "laeuft" ? h("div", { class: "a-fg-aktion-zweit" }, testen("Neuen Testbuild anfordern", "a-fg-leise")) : null,
  );
}

/** Änderungen nach Art gruppiert, mit Zähler; mehr als SICHTBAR klappt auf. */
function aenderungen(liste: Daten[]) {
  const gruppen = ARTEN.map((art) => ({ art, eintraege: liste.filter((c) => c.art === art) })).filter((g) => g.eintraege.length);
  const zeile = (c: Daten) => h("li", {}, String(c.text));
  const rest = liste.length - SICHTBAR;
  let gezaehlt = 0;
  const kopf = h("div", { class: "a-fg-zaehler" }, ...gruppen.map((g) => h("span", { class: `a-fg-zahl ${g.art.toLowerCase()}` }, h("b", {}, String(g.eintraege.length)), ` ${g.art}`)));
  const baue = (sichtbar: boolean) =>
    h("div", { class: "a-fg-gruppen" }, ...gruppen.map((g) => {
      const zeilen = g.eintraege.filter(() => (sichtbar ? true : gezaehlt++ < SICHTBAR));
      return zeilen.length ? h("section", {}, h("h3", { class: `a-fg-art ${g.art.toLowerCase()}` }, g.art), h("ul", {}, ...zeilen.map(zeile))) : null;
    }));
  const behaelter = h("div", {});
  const zeige = (alle: boolean) => {
    gezaehlt = 0;
    behaelter.replaceChildren(baue(alle), ...(rest > 0 && !alle ? [knopf(`Alle ${liste.length} anzeigen`, () => zeige(true), "a-fg-leise")] : []));
  };
  zeige(false);
  return liste.length ? h("div", {}, kopf, behaelter) : leer("Keine neuen Produktänderungen gegenüber der Alpha-Quelle.");
}

function fruehere(builds: Daten[]) {
  if (!builds.length) return null;
  return h("details", { class: "a-karte a-fg-liste" },
    h("summary", {}, `Frühere Testbuilds (${builds.length})`),
    ...builds.map((b) =>
      h("div", { class: "a-fg-zeile" },
        h("div", { class: "a-fg-zeile-text" }, h("strong", {}, `Build ${b.nummer}`), h("span", {}, titelOhneNummer(b.titel)), h("small", {}, `${b.version || "Dev"} · ${relativ(b.zeit)} · ${kurz(b.sha)}`)),
        plattformen(b.systeme))));
}

function verlauf(d: Daten) {
  const liste = d.freigaben || [];
  return h("section", { class: "a-karte" },
    h("h2", {}, "Alpha-Verlauf"),
    liste.length
      ? h("ol", { class: "a-fg-verlauf" }, ...liste.map((r: Daten) =>
          h("li", { class: r.status === "Erfolgreich" ? "ok" : r.status === "Fehlgeschlagen" ? "bad" : "lauf" },
            h("span", { class: "a-fg-punkt", "aria-hidden": "true" }),
            h("div", {}, h("strong", {}, r.titel), h("small", {}, `${r.status} · ${datum(r.zeit)}`)),
            h("a", { href: r.url, target: "_blank", rel: "noopener", "aria-label": `${r.titel}: Bauprotokoll öffnen` }, "Protokoll"))))
      : leer("Noch keine Freigabe angefordert."));
}

export const releases: Bereich = async (ziel, neu) => {
  const d = await api("releases");
  const builds: Daten[] = d.builds || [];
  const aktuell = builds.find((b) => b.sha === d.dev);
  const zustand = stand(d, aktuell);

  const haupt = h("div", { class: "a-fg-haupt-spalte" }, naechsterSchritt(d, aktuell, zustand, neu));
  if (zustand !== "synchron")
    haupt.append(h("section", { class: "a-karte" }, h("h2", {}, "Das ist neu gegenüber der Alpha"), aenderungen(d.aenderungen || [])));
  const frueher = fruehere(builds.filter((b) => b !== aktuell));
  if (frueher) haupt.append(frueher);
  if (d.offen?.length)
    haupt.append(h("details", { class: "a-karte a-fg-liste" },
      h("summary", {}, `Noch in Vorbereitung (${d.offen.length})`),
      ...d.offen.map((p: Daten) => h("div", { class: "a-fg-zeile" }, h("div", { class: "a-fg-zeile-text" }, h("strong", {}, String(p.titel).replace(/^(feat|fix|docs)(\([^)]*\))?:\s*/, "")), h("small", {}, p.status))))));

  const seite = h("aside", { class: "a-fg-seite" },
    h("section", { class: "a-karte a-fg-live" },
      h("span", { class: "a-fg-kicker" }, "Aktuell für Tester"),
      d.alpha ? h("div", { class: "a-fg-version" }, `Alpha ${d.alpha.version}`) : h("div", { class: "a-fg-version" }, "—"),
      d.alpha ? h("small", {}, `Veröffentlicht ${relativ(d.alpha.zeit)}`) : h("small", {}, "Noch nichts veröffentlicht"),
      h("a", { class: "a-fg-link", href: "https://github.com/Stacktor/cockpit-releases/releases/latest", target: "_blank", rel: "noopener" }, "Signierte Downloads öffnen →")),
    verlauf(d));

  ziel.append(
    h("p", { class: "a-fg-einleitung" }, "Dev ist dein Testbereich. Alpha ist die bewusst freigegebene Ausgabe für eingeladene Personen."),
    schritte(d, aktuell, zustand),
    h("div", { class: "a-fg-raster" }, haupt, seite),
    h("p", { class: "a-fg-fuss" }, d.dev ? `Stand der Entwicklung: ${kurz(d.dev)}` : ""),
  );
};
