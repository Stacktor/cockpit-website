import { h, svg, ICONS, datum, zeit, relativ, zahl, euro, type Daten } from "./dom";
import {
  aktion,
  api,
  badge,
  balken,
  bestaetigen,
  exportUrl,
  feld,
  hinweisKachel,
  karte,
  karteMitKopf,
  knopf,
  kpi,
  leer,
  liste,
  schublade,
  schubladeZu,
  tabelle,
  toast,
  verlauf,
} from "./ui";

import { dashboard } from "./uebersicht";

export type Bereich = (ziel: HTMLElement, neu: () => void) => Promise<void>;

const fuege = (z: HTMLElement, ...k: (Node | null | false | undefined)[]) => z.append(...(k.filter(Boolean) as Node[]));
const raster = (klasse: string, ...kinder: (Node | null | false)[]) => h("div", { class: `a-raster ${klasse}` }, ...kinder);
const tage = (liste: { tag: string; anzahl: number }[]) => liste.map((t) => ({ tag: t.tag, wert: t.anzahl }));
const eingabe = (attrs: Daten = {}) => h("input", { class: "a-eingabe", ...attrs }) as HTMLInputElement;
const auswahl = (werte: string[], aktuell = "") =>
  h("select", { class: "a-eingabe" }, werte.map((w) => h("option", { value: w, selected: w === aktuell }, w))) as HTMLSelectElement;
const text = (wert = "", attrs: Daten = {}) => {
  const t = h("textarea", { class: "a-eingabe", ...attrs }) as HTMLTextAreaElement;
  t.value = wert;
  return t;
};

// ═════════════ Übersicht ═════════════
// Anpassbares Dashboard (Kacheln verschieben, hinzufügen, Größe) — siehe uebersicht.ts.

export const uebersicht: Bereich = (ziel, neu) => dashboard(ziel, neu);

// ═════════════ Alpha ═════════════

export const alpha: Bereich = async (ziel, neu) => {
  const d = await api("alpha");
  const e: Daten[] = d.eintraege;
  const z = (s: string) => e.filter((x) => (x.status || "neu") === s).length;
  const belegt = e.filter((x) => !["warteliste", "abgelehnt"].includes(x.status || "neu")).length;
  const plaetzeEingabe = eingabe({ type: "number", min: 0, max: 10000, value: d.plaetze, style: "width:90px", "aria-label": "Plätze" });

  fuege(ziel, 
    raster(
      "a-r4",
      kpi("Plätze belegt", `${belegt} / ${d.plaetze}`, `${Math.max(0, d.plaetze - belegt)} frei`),
      kpi("Neu", zahl(z("neu")), "warten auf Entscheidung"),
      kpi("Eingeladen", zahl(z("eingeladen")), `${z("angenommen")} angenommen, noch nicht eingeladen`),
      kpi("Warteliste", zahl(z("warteliste")), `${z("abgelehnt")} abgelehnt`),
    ),
    !d.einladenBereit
      ? h(
          "div",
          { class: "a-hinweis" },
          "Für „Einladen“ braucht es unter Einstellungen: Lemon-Squeezy-Schlüssel, Store-ID, Variant-ID und Checkout-Link der Alpha sowie den Resend-Schlüssel. Ohne Rabattcode (kostenlose Variante) reichen Checkout-Link und Resend.",
        )
      : null,
    karteMitKopf(
      "Anmeldungen",
      h(
        "div",
        { class: "a-werkzeuge" },
        h("span", { class: "a-klein", style: "color:var(--a-muted)" }, "Plätze:"),
        plaetzeEingabe,
        knopf("Speichern", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("alpha", { aktion: "plaetze", plaetze: Number(plaetzeEingabe.value) }), neu)),
      ),
      tabelle(
        [
          { titel: "Name", wert: (x) => h("div", {}, h("b", {}, x.name), h("div", { class: "a-klein" }, x.mail)), suche: (x) => `${x.name} ${x.mail}` },
          { titel: "System", wert: (x) => x.os },
          { titel: "Situation", wert: (x) => x.situation },
          { titel: "Quelle", wert: (x) => x.utm?.utm_source || x.herkunft },
          { titel: "Status", wert: (x) => badge(x.status || "neu"), suche: (x) => x.status || "neu" },
          { titel: "Angemeldet", wert: (x) => h("span", { class: "a-klein", title: zeit(x.zeit) }, relativ(x.zeit)) },
        ],
        e,
        { filter: { name: "Status", werte: d.status, feld: (x) => x.status || "neu" }, beiKlick: (x) => alphaDetail(x, d, neu), leerText: "Noch keine Anmeldungen." },
      ),
    ),
  );
};

function alphaDetail(x: Daten, d: Daten, neu: () => void) {
  const status = auswahl(d.status, x.status || "neu");
  const notiz = text(x.notiz || "", { placeholder: "Interne Notiz (nur hier sichtbar)" });
  const ohneCode = h("input", { type: "checkbox" }) as HTMLInputElement;
  const nachher = () => {
    schubladeZu();
    neu();
  };
  schublade(
    x.name,
    liste([
      ["E-Mail", h("a", { href: `mailto:${x.mail}` }, x.mail)],
      ["System", x.os],
      ["Situation", x.situation],
      ["Bewerbungen/Monat", x.bewerbungenMonat],
      ["Bisher", (x.werkzeuge || []).join(", ")],
      ["KI", x.ki],
      ["Technik", x.technik],
      ["Gefunden über", [x.herkunft, x.utm ? Object.entries(x.utm).map(([k, v]) => `${k}=${v}`).join(" ") : ""].filter(Boolean).join(" · ")],
      ["Verweis", x.referrer || x.quelle],
      ["Feedback-Wege", (x.feedback || []).join(", ")],
      ["Land", x.land],
      ["Angemeldet", zeit(x.zeit)],
      ["Eingeladen", x.eingeladen ? `${zeit(x.eingeladen.zeit)}${x.eingeladen.code ? ` · Code ${x.eingeladen.code}` : ""}` : null],
    ]),
    karte("Größte Hürde", h("div", { class: "a-vor" }, x.grund || "—")),
    karte(
      "Einladen",
      h("p", { class: "a-klein", style: "color:var(--a-muted);margin:0 0 10px" }, "Legt einen einmaligen 100-%-Code für die Alpha-Variante an und schickt eine Mail mit Checkout-Link. Danach steht der Status auf „eingeladen“."),
      h("label", { class: "a-werkzeuge", style: "margin-bottom:10px" }, ohneCode, "Ohne Rabattcode (Alpha-Variante ist kostenlos)"),
      knopf(
        x.status === "eingeladen" ? "Erneut einladen" : "Annehmen & einladen",
        async (ev) => {
          if (!(await bestaetigen("Einladung senden?", `${x.mail} bekommt jetzt eine Mail mit dem Link zum Alpha-Schlüssel.`, "Einladen"))) return;
          aktion(ev.currentTarget as HTMLButtonElement, () => api("alpha", { aktion: "einladen", mail: x.mail, ohneCode: ohneCode.checked }), nachher);
        },
        "a-p",
        "mail",
      ),
    ),
    karte(
      "Status & Notiz",
      feld("Status", status),
      feld("Notiz", notiz),
      h(
        "div",
        { class: "a-werkzeuge" },
        knopf("Status speichern", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("alpha", { aktion: "status", mail: x.mail, status: status.value }), nachher)),
        knopf("Notiz speichern", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("alpha", { aktion: "notiz", mail: x.mail, notiz: notiz.value }), neu)),
        knopf(
          "Anmeldung löschen",
          async (ev) => {
            if (!(await bestaetigen("Anmeldung löschen?", "Alle Angaben dieser Person werden entfernt (z. B. auf Wunsch nach DSGVO). Das lässt sich nicht rückgängig machen.", "Löschen"))) return;
            aktion(ev.currentTarget as HTMLButtonElement, () => api("alpha", { aktion: "loeschen", mail: x.mail }), nachher);
          },
          "a-rot",
        ),
      ),
    ),
  );
}

// ═════════════ Lizenzen ═════════════

export const lizenzen: Bereich = async (ziel, neu) => {
  const d = await api("lizenzen");
  const l: Daten[] = d.lizenzen;
  const status = [...new Set(l.map((x) => (x.deaktiviert ? "disabled" : x.status)))];
  fuege(ziel, 
    raster(
      "a-r4",
      kpi("Lizenzen", zahl(l.length)),
      kpi("Aktiv", zahl(l.filter((x) => x.status === "active" && !x.deaktiviert).length)),
      kpi("Geräte angemeldet", zahl(l.reduce((s, x) => s + (x.genutzt || 0), 0))),
      kpi("Gesperrt / abgelaufen", zahl(l.filter((x) => x.deaktiviert || x.status === "expired").length)),
    ),
    karte(
      null,
      tabelle(
        [
          { titel: "Schlüssel", wert: (x) => h("span", { class: "a-mono" }, x.schluessel), suche: (x) => x.schluessel },
          { titel: "Kunde", wert: (x) => h("div", {}, x.kundenName || "—", h("div", { class: "a-klein" }, x.kunde)), suche: (x) => `${x.kundenName} ${x.kunde}` },
          { titel: "Produkt", wert: (x) => x.produkt },
          { titel: "Status", wert: (x) => h("span", {}, badge(x.deaktiviert ? "disabled" : x.status), x.testmodus ? badge("Test", "") : null) },
          { titel: "Geräte", wert: (x) => `${x.genutzt ?? 0} / ${x.limit ?? "∞"}`, klasse: "a-zahl" },
          { titel: "Läuft ab", wert: (x) => (x.laeuftAb ? datum(x.laeuftAb) : "unbefristet") },
          { titel: "Erstellt", wert: (x) => datum(x.erstellt) },
        ],
        l,
        { filter: { name: "Status", werte: status, feld: (x) => (x.deaktiviert ? "disabled" : x.status) }, beiKlick: (x) => lizenzDetail(x.id, neu), leerText: "Noch keine Lizenzen." },
      ),
    ),
  );
};

async function lizenzDetail(id: string, neu: () => void) {
  schublade("Lizenz wird geladen …", h("div", { class: "a-lade" }, h("div")));
  let d: Daten;
  try {
    d = await api(`lizenzen?id=${encodeURIComponent(id)}`);
  } catch (e) {
    schublade("Lizenz", h("div", { class: "a-hinweis a-fehler" }, (e as Error).message));
    return;
  }
  const x = d.lizenz;
  const tageEingabe = eingabe({ type: "number", value: 365, min: 1, max: 3650, style: "width:90px", "aria-label": "Tage" });
  const limitEingabe = eingabe({ type: "number", value: x.limit || 3, min: 1, max: 100, style: "width:80px", "aria-label": "Geräte" });
  const tu = (daten: Daten) => (ev: Event) =>
    aktion(ev.currentTarget as HTMLButtonElement, () => api("lizenzen", { id: x.id, ...daten }), () => {
      lizenzDetail(id, neu);
      neu();
    });
  schublade(
    `Lizenz ${x.schluessel}`,
    liste([
      ["Kunde", x.kundenName],
      ["E-Mail", x.kunde ? h("a", { href: `mailto:${x.kunde}` }, x.kunde) : null],
      ["Produkt", x.produkt],
      ["Status", badge(x.deaktiviert ? "disabled" : x.status)],
      ["Geräte", `${x.genutzt ?? 0} von ${x.limit ?? "∞"}`],
      ["Läuft ab", x.laeuftAb ? zeit(x.laeuftAb) : "unbefristet"],
      ["Bestellung", x.bestellung],
      ["Erstellt", zeit(x.erstellt)],
    ]),
    karte(
      "Geräte",
      d.geraete.length
        ? h(
            "div",
            { class: "a-balken" },
            d.geraete.map((g: Daten) =>
              h(
                "div",
                { class: "a-frage-kopf" },
                h("span", { style: "flex:1" }, g.name, h("div", { class: "a-klein", style: "color:var(--a-faint)" }, `seit ${datum(g.erstellt)}`)),
                knopf("Abmelden", async (ev) => {
                  if (await bestaetigen("Gerät abmelden?", `„${g.name}“ verliert die Freischaltung; der Platz wird frei.`, "Abmelden")) tu({ aktion: "geraet-abmelden", instanz: g.id })(ev);
                }),
              ),
            ),
          )
        : leer("Kein Gerät angemeldet."),
    ),
    karte(
      "Aktionen",
      h(
        "div",
        { class: "a-werkzeuge", style: "margin-bottom:12px" },
        x.deaktiviert ? knopf("Entsperren", tu({ aktion: "entsperren" })) : knopf("Sperren", async (ev) => (await bestaetigen("Lizenz sperren?", "Die App stuft beim nächsten Prüfen auf „Kostenlos“ zurück.", "Sperren")) && tu({ aktion: "sperren" })(ev), "a-rot"),
        knopf("Unbefristet", tu({ aktion: "unbefristet" })),
      ),
      h("div", { class: "a-werkzeuge", style: "margin-bottom:12px" }, "Verlängern um", tageEingabe, "Tage", knopf("Verlängern", (ev) => tu({ aktion: "verlaengern", tage: Number(tageEingabe.value), bisherAblauf: x.laeuftAb })(ev))),
      h("div", { class: "a-werkzeuge" }, "Geräte-Limit", limitEingabe, knopf("Setzen", (ev) => tu({ aktion: "geraete", limit: Number(limitEingabe.value) })(ev))),
    ),
  );
}

// ═════════════ Kunden & Umsatz ═════════════

export const umsatz: Bereich = async (ziel, neu) => {
  const d = await api("umsatz");
  const k = d.kennzahlen;
  const reiter = ["Bestellungen", "Kunden", "Rabattcodes"];
  const inhalt = h("div");
  const zeige = (i: number) => {
    tabs.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-selected", String(i === j)));
    inhalt.replaceChildren(
      i === 0
        ? tabelle(
            [
              { titel: "Nr.", wert: (o) => `#${o.nummer}` },
              { titel: "Kunde", wert: (o) => h("div", {}, o.name, h("div", { class: "a-klein" }, o.kunde)), suche: (o) => `${o.name} ${o.kunde}` },
              { titel: "Produkt", wert: (o) => `${o.produkt}${o.variante ? ` · ${o.variante}` : ""}` },
              { titel: "Summe", wert: (o) => euro(o.summe, o.waehrung), klasse: "a-zahl" },
              { titel: "Status", wert: (o) => h("span", {}, badge(o.erstattet ? "refunded" : o.status), o.testmodus ? badge("Test", "") : null) },
              { titel: "Datum", wert: (o) => zeit(o.zeit) },
            ],
            d.bestellungen,
            { leerText: "Noch keine Bestellungen." },
          )
        : i === 1
          ? tabelle(
              [
                { titel: "Name", wert: (c) => c.name },
                { titel: "E-Mail", wert: (c) => c.mail },
                { titel: "Land", wert: (c) => c.land },
                { titel: "Umsatz", wert: (c) => euro(c.umsatz, k.waehrung), klasse: "a-zahl" },
                { titel: "Seit", wert: (c) => datum(c.zeit) },
              ],
              d.kunden,
              { leerText: "Noch keine Kunden." },
            )
          : rabatte(d.rabatte, neu),
    );
  };
  const tabs = h("div", { class: "a-tabs", role: "tablist" }, reiter.map((r, i) => h("button", { class: "a-tab", role: "tab", type: "button", onclick: () => zeige(i) }, r)));
  zeige(0);
  fuege(ziel, 
    raster(
      "a-r4",
      kpi("Umsatz gesamt", euro(k.umsatz, k.waehrung), `${k.bestellungen} bezahlte Bestellungen`),
      kpi("Umsatz 30 Tage", euro(k.umsatz30, k.waehrung)),
      kpi("Kunden", zahl(k.kunden)),
      kpi("Erstattungen", zahl(k.erstattet)),
    ),
    karte("Bestellungen pro Tag (30 Tage)", verlauf(tage(d.proTag))),
    karte(null, tabs, inhalt),
  );
};

function rabatte(liste: Daten[], neu: () => void) {
  const name = eingabe({ placeholder: "Name, z. B. Coach-Aktion" });
  const code = eingabe({ placeholder: "CODE (leer = zufällig)", style: "text-transform:uppercase" });
  const prozent = eingabe({ type: "number", min: 1, max: 100, value: 20, style: "width:80px" });
  const anzahl = eingabe({ type: "number", min: 0, value: 0, style: "width:80px" });
  return h(
    "div",
    { style: "display:grid;gap:16px" },
    h(
      "div",
      { class: "a-frage" },
      h("b", {}, "Neuer Rabattcode"),
      h("div", { class: "a-werkzeuge" }, name, code, prozent, "%", "max.", anzahl, "Einlösungen (0 = unbegrenzt)"),
      h(
        "div",
        {},
        knopf("Anlegen", (ev) =>
          aktion(ev.currentTarget as HTMLButtonElement, () => api("umsatz", { aktion: "rabatt", name: name.value, code: code.value, prozent: Number(prozent.value), anzahl: Number(anzahl.value) }), neu),
        "a-p"),
      ),
    ),
    tabelle(
      [
        { titel: "Code", wert: (r) => h("span", { class: "a-mono" }, r.code), suche: (r) => `${r.code} ${r.name}` },
        { titel: "Name", wert: (r) => r.name },
        { titel: "Rabatt", wert: (r) => (r.art === "percent" ? `${r.betrag} %` : euro(r.betrag / 100)) },
        { titel: "Eingelöst", wert: (r) => `${r.eingeloest ?? "?"}${r.max ? ` / ${r.max}` : ""}` },
        { titel: "Status", wert: (r) => badge(r.status) },
        {
          titel: "",
          wert: (r) =>
            knopf("Löschen", async (ev) => {
              ev.stopPropagation();
              if (await bestaetigen("Rabattcode löschen?", `${r.code} kann danach nicht mehr eingelöst werden.`, "Löschen"))
                aktion(ev.currentTarget as HTMLButtonElement, () => api("umsatz", { aktion: "rabatt-loeschen", id: r.id }), neu);
            }, "a-rot"),
        },
      ],
      liste,
      { leerText: "Noch keine Rabattcodes." },
    ),
  );
}

// ═════════════ Umfragen ═════════════

const TYPEN = ["einfach", "mehrfach", "skala", "nps", "euro", "text", "matrix"];
const ausloeserText = (a: Daten) =>
  a?.art === "tage" ? `nach ${a.wert} Tagen` : a?.art === "meilenstein" ? `ab ${a.wert} ${a.zaehler === "anschreiben" ? "Anschreiben" : "Bewerbungen"}` : "sofort";

export const umfragen: Bereich = async (ziel, neu) => {
  const d = await api("umfragen");
  fuege(ziel, 
    d.standard
      ? h("div", { class: "a-hinweis" }, "Es gelten die Standard-Fragebögen. Sobald du einen bearbeitest oder eine neue Umfrage anlegst, werden beide ins KV übernommen und sind hier änderbar.")
      : null,
    h("div", { class: "a-werkzeuge" }, knopf("Neue Umfrage", () => editor(null, neu), "a-p")),
    ...d.umfragen.map((u: Daten) => umfrageKarte(u.definition, u.auswertung, neu)),
    d.web && d.web.ok && d.web.gesamt ? webUmfrageKarte(d.web) : null,
  );
};

function umfrageKarte(def: Daten, aus: Daten, neu: () => void) {
  const inhalt = h("div", { style: "display:grid;gap:12px" });
  let offen = false;
  const umschalten = knopf("Auswertung", () => {
    offen = !offen;
    inhalt.replaceChildren(...(offen ? auswertung(aus) : []));
    umschalten.lastChild!.textContent = offen ? "Auswertung schließen" : "Auswertung";
  });
  return karteMitKopf(
    def.titel,
    h(
      "div",
      { class: "a-werkzeuge" },
      badge(def.aktiv ? "aktiv" : "pausiert", def.aktiv ? "ok" : ""),
      badge(ausloeserText(def.ausloeser), "info"),
      badge(`${aus.antworten} Antworten`, ""),
    ),
    h("p", { class: "a-klein", style: "color:var(--a-muted);margin:0 0 12px" }, `${def.id} · ${def.fragen.length} Fragen${aus.letzte ? ` · letzte Antwort ${relativ(aus.letzte)}` : ""}`),
    h(
      "div",
      { class: "a-werkzeuge", style: "margin-bottom:12px" },
      umschalten,
      knopf("Bearbeiten", () => editor(def, neu)),
      knopf(def.aktiv ? "Pausieren" : "Aktivieren", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("umfragen", { aktion: "aktiv", id: def.id, aktiv: !def.aktiv }), neu)),
      h("a", { class: "a-knopf", href: exportUrl(`umfragen?export=${encodeURIComponent(def.id)}`), download: `umfrage-${def.id}.csv` }, "CSV"),
      knopf("Löschen", async (ev) => {
        if (await bestaetigen("Umfrage löschen?", "Die Definition wird entfernt, bereits gegebene Antworten bleiben erhalten.", "Löschen"))
          aktion(ev.currentTarget as HTMLButtonElement, () => api("umfragen", { aktion: "loeschen", id: def.id }), neu);
      }, "a-rot"),
    ),
    inhalt,
  );
}

function auswertung(a: Daten): HTMLElement[] {
  if (!a.antworten) return [leer("Noch keine Antworten.")];
  const teile: HTMLElement[] = [];
  if (a.preispunkte) {
    const p = a.preispunkte;
    teile.push(
      h(
        "div",
        { class: "a-frage" },
        h("b", {}, `Preis nach Van Westendorp (${p.n} stimmige Antworten)`),
        p.n >= 3
          ? raster("a-r4", kpi("Optimaler Preis", euro(p.optimal)), kpi("Untere Grenze", euro(p.untereGrenze)), kpi("Obere Grenze", euro(p.obereGrenze)), kpi("Median „günstig“", euro(p.median?.guenstig)))
          : leer("Ab drei stimmigen Antworten gibt es Preispunkte."),
      ),
    );
  }
  let abschnitt = "";
  for (const f of a.fragen) {
    if (f.abschnitt && f.abschnitt !== abschnitt) {
      abschnitt = f.abschnitt;
      teile.push(h("h3", { style: "margin:8px 0 0;font-size:13px;color:var(--a-muted);text-transform:uppercase;letter-spacing:.06em" }, abschnitt));
    }
    const kopf = h("div", { class: "a-frage-kopf" }, badge(f.typ, ""), h("b", { style: "flex:1" }, f.text), h("span", { class: "a-klein", style: "color:var(--a-faint)" }, `n = ${f.n}`));
    let koerper: Node;
    switch (f.typ) {
      case "einfach":
      case "mehrfach":
        koerper = balken(f.verteilung, 30);
        break;
      case "skala":
        koerper = h("div", {}, h("div", { class: "a-klein", style: "margin-bottom:8px" }, `Durchschnitt ${f.schnitt ?? "—"} von 5`), balken(f.verteilung));
        break;
      case "nps":
        koerper = f.nps
          ? h("div", {}, raster("a-r4", kpi("NPS", String(f.nps.wert)), kpi("Promotoren", zahl(f.nps.promotoren)), kpi("Passive", zahl(f.nps.passive)), kpi("Kritiker", zahl(f.nps.kritiker))))
          : leer("—");
        break;
      case "euro":
        koerper = h("div", { class: "a-klein" }, `Median ${euro(f.median)} · min. ${euro(f.min)} · max. ${euro(f.max)}`);
        break;
      case "matrix":
        koerper = h(
          "div",
          {},
          h("div", { class: "a-klein", style: "margin-bottom:8px" }, "Durchschnitt je Funktion (1–5); „nicht genutzt“ zählt nicht mit"),
          balken(
            f.zeilen.filter((z: Daten) => z.schnitt !== null).map((z: Daten) => ({ name: `${z.name} (n = ${z.n})`, anzahl: z.schnitt })),
            30,
            5,
          ),
        );
        break;
      case "text":
        koerper = f.texte.length
          ? h("div", { style: "display:grid;gap:8px;max-height:320px;overflow:auto" }, f.texte.map((t: Daten) => h("div", { class: "a-zitat" }, t.text, h("small", {}, `${t.email || "?"} · ${relativ(t.zeit)}`))))
          : leer("Keine Texte.");
        break;
      default:
        koerper = leer("—");
    }
    teile.push(h("div", { class: "a-frage" }, kopf, koerper));
  }
  return teile;
}

function webUmfrageKarte(w: Daten) {
  return karte(
    `Beendete Web-Preisumfrage (${w.gesamt} Antworten)`,
    w.preispunkte
      ? raster("a-r4", kpi("Optimaler Preis", euro(w.preispunkte.optimal)), kpi("Untere Grenze", euro(w.preispunkte.untereGrenze)), kpi("Obere Grenze", euro(w.preispunkte.obereGrenze)), kpi("Median Abo/Monat", euro(w.median?.monatlich)))
      : leer("Zu wenige stimmige Antworten für Preispunkte."),
    h("div", { style: "margin-top:12px" }, balken(Object.entries(w.modelle || {}).map(([name, anzahl]) => ({ name, anzahl: Number(anzahl) })))),
  );
}

function editor(def: Daten | null, neu: () => void) {
  const u: Daten = def ? structuredClone(def) : { id: "", titel: "", beschreibung: "", aktiv: false, ausloeser: { art: "tage", wert: 7 }, fragen: [] };
  const id = eingabe({ value: u.id, placeholder: "z. B. puls-woche4", readonly: Boolean(def) });
  const titel = eingabe({ value: u.titel, placeholder: "Titel im Popup" });
  const beschreibung = text(u.beschreibung || "", { placeholder: "Kurzer Einleitungstext" });
  const aktiv = h("input", { type: "checkbox", checked: Boolean(u.aktiv) }) as HTMLInputElement;
  const art = auswahl(["sofort", "tage", "meilenstein"], u.ausloeser?.art || "tage");
  const wert = eingabe({ type: "number", min: 0, value: u.ausloeser?.wert ?? 7, style: "width:80px" });
  const zaehler = auswahl(["bewerbungen", "anschreiben"], u.ausloeser?.zaehler || "bewerbungen");
  const fragenListe = h("div", { style: "display:grid;gap:10px" });

  const fragen: Daten[] = u.fragen.map((f: Daten) => ({ ...f }));
  const zeichneFragen = () => {
    fragenListe.replaceChildren(
      ...fragen.map((f, i) => {
        const fid = eingabe({ value: f.id || "", placeholder: "id", style: "width:130px" });
        const typ = auswahl(TYPEN, f.typ || "einfach");
        const ftext = eingabe({ value: f.text || "", placeholder: "Fragetext", style: "flex:1;min-width:200px" });
        const abschnitt = eingabe({ value: f.abschnitt || "", placeholder: "Abschnitt (optional)", style: "width:170px" });
        const pflicht = h("input", { type: "checkbox", checked: Boolean(f.pflicht) }) as HTMLInputElement;
        const optionen = text((f.optionen || f.zeilen || []).join("\n"), { placeholder: "Eine Antwortmöglichkeit (bzw. Zeile) pro Zeile", rows: 3 });
        const links = eingabe({ value: f.labels?.[0] || "", placeholder: "Beschriftung 1", style: "width:140px" });
        const rechts = eingabe({ value: f.labels?.[1] || "", placeholder: "Beschriftung 5", style: "width:140px" });
        const max = eingabe({ type: "number", value: f.max ?? 1000, style: "width:100px" });
        const extra = h("div");
        const sync = () => {
          f.id = fid.value.trim();
          f.typ = typ.value;
          f.text = ftext.value;
          f.abschnitt = abschnitt.value;
          f.pflicht = pflicht.checked;
          const zeilen = optionen.value.split("\n").map((s) => s.trim()).filter(Boolean);
          delete f.optionen;
          delete f.zeilen;
          delete f.labels;
          delete f.max;
          if (f.typ === "einfach" || f.typ === "mehrfach") f.optionen = zeilen;
          if (f.typ === "matrix") f.zeilen = zeilen;
          if (f.typ === "skala" && links.value && rechts.value) f.labels = [links.value, rechts.value];
          if (f.typ === "euro") f.max = Number(max.value);
        };
        const zeigeExtra = () => {
          extra.replaceChildren(
            ...(["einfach", "mehrfach", "matrix"].includes(typ.value) ? [optionen] : []),
            ...(typ.value === "skala" ? [h("div", { class: "a-werkzeuge" }, links, rechts)] : []),
            ...(typ.value === "euro" ? [h("div", { class: "a-werkzeuge" }, "Höchstbetrag", max, "€")] : []),
          );
        };
        [fid, typ, ftext, abschnitt, pflicht, optionen, links, rechts, max].forEach((el) => el.addEventListener("input", sync));
        typ.addEventListener("change", () => {
          sync();
          zeigeExtra();
        });
        zeigeExtra();
        const verschiebe = (um: number) => {
          const j = i + um;
          if (j < 0 || j >= fragen.length) return;
          [fragen[i], fragen[j]] = [fragen[j], fragen[i]];
          zeichneFragen();
        };
        return h(
          "div",
          { class: "a-frage" },
          h(
            "div",
            { class: "a-frage-kopf" },
            h("b", {}, `Frage ${i + 1}`),
            h("span", { style: "flex:1" }),
            knopf("↑", () => verschiebe(-1)),
            knopf("↓", () => verschiebe(1)),
            knopf("Entfernen", () => {
              fragen.splice(i, 1);
              zeichneFragen();
            }, "a-rot"),
          ),
          h("div", { class: "a-werkzeuge" }, fid, typ, abschnitt, h("label", { class: "a-werkzeuge" }, pflicht, "Pflicht")),
          h("div", { class: "a-werkzeuge" }, ftext),
          extra,
        );
      }),
    );
  };
  zeichneFragen();

  const zeigeAusloeser = () => {
    wert.style.display = art.value === "sofort" ? "none" : "";
    zaehler.style.display = art.value === "meilenstein" ? "" : "none";
  };
  art.addEventListener("change", zeigeAusloeser);
  zeigeAusloeser();

  schublade(
    def ? `Bearbeiten: ${def.titel}` : "Neue Umfrage",
    feld("ID", id, "Kleinbuchstaben, Ziffern, Bindestriche. Ändert sich nie — Antworten hängen daran."),
    feld("Titel", titel),
    feld("Beschreibung", beschreibung),
    h("div", { class: "a-feld" }, h("span", {}, "Auslöser"), h("div", { class: "a-werkzeuge" }, art, wert, zaehler), h("small", {}, "„tage“ = Tage seit dem ersten Start; „meilenstein“ = Anzahl Bewerbungen bzw. Anschreiben in der App.")),
    h("label", { class: "a-werkzeuge" }, aktiv, "Aktiv (wird Alpha-Testern angezeigt)"),
    h("h3", { style: "margin:6px 0 0;font-size:14px" }, "Fragen"),
    fragenListe,
    h(
      "div",
      { class: "a-werkzeuge" },
      knopf("Frage hinzufügen", () => {
        fragen.push({ id: `frage${fragen.length + 1}`, typ: "einfach", text: "", pflicht: false, optionen: [] });
        zeichneFragen();
      }),
      h("span", { style: "flex:1" }),
      knopf(
        "Speichern",
        (ev) =>
          aktion(
            ev.currentTarget as HTMLButtonElement,
            () =>
              api("umfragen", {
                aktion: "speichern",
                umfrage: {
                  id: id.value.trim(),
                  titel: titel.value,
                  beschreibung: beschreibung.value,
                  aktiv: aktiv.checked,
                  ausloeser: { art: art.value, wert: Number(wert.value), zaehler: zaehler.value },
                  fragen,
                },
              }),
            () => {
              schubladeZu();
              neu();
            },
          ),
        "a-p",
      ),
    ),
  );
}

// ═════════════ Fehlerberichte ═════════════

export const fehler: Bereich = async (ziel, neu) => {
  const d = await api("fehler");
  const b: Daten[] = d.berichte;
  fuege(ziel, 
    raster(
      "a-r4",
      kpi("Neu", zahl(b.filter((x) => x.status === "neu").length)),
      kpi("In Arbeit", zahl(b.filter((x) => x.status === "in-arbeit").length)),
      kpi("Erledigt", zahl(b.filter((x) => x.status === "erledigt").length)),
      kpi("Gesamt", zahl(b.length)),
    ),
    karte(
      null,
      tabelle(
        [
          { titel: "Beschreibung", wert: (x) => h("div", { style: "max-width:520px" }, String(x.beschreibung || "").slice(0, 140)), suche: (x) => `${x.beschreibung} ${x.email}` },
          { titel: "Version", wert: (x) => x.version },
          { titel: "System", wert: (x) => x.system },
          { titel: "Von", wert: (x) => x.email || x.name || badge("anonym"), suche: (x) => `${x.email || ""} ${x.quelle || ""}` },
          { titel: "Status", wert: (x) => badge(x.status) },
          { titel: "Zeit", wert: (x) => h("span", { title: zeit(x.zeit) }, relativ(x.zeit)) },
        ],
        b,
        { filter: { name: "Status", werte: d.status, feld: (x) => x.status }, beiKlick: (x) => fehlerDetail(x, d.status, neu), leerText: "Keine Fehlerberichte." },
      ),
    ),
  );
};

function fehlerDetail(x: Daten, status: string[], neu: () => void) {
  const s = auswahl(status, x.status);
  const notiz = text(x.notiz || "", { placeholder: "Notiz (z. B. behoben in 0.1.1)" });
  const nachher = () => {
    schubladeZu();
    neu();
  };
  schublade(
    "Fehlerbericht",
    liste([
      ["Von", x.email ? h("a", { href: `mailto:${x.email}?subject=${encodeURIComponent("Dein Fehlerbericht zu cockpit")}` }, x.email) : x.name || "anonym (ohne E-Mail)"],
      ["Herkunft", x.quelle === "alpha" ? "Alpha-Lizenz" : x.quelle === "lizenz" ? "Pro-Lizenz" : x.quelle === "anonym" ? "ohne Lizenz" : "Alpha-Lizenz"],
      ["Version", x.version],
      ["System", x.system],
      ["Zeit", zeit(x.zeit)],
      ["Status", badge(x.status)],
    ]),
    karte("Beschreibung", h("div", { class: "a-vor" }, x.beschreibung)),
    x.protokoll ? karte("Technisches Protokoll", h("pre", { class: "a-vor a-mono" }, x.protokoll)) : null,
    karte(
      "Bearbeiten",
      feld("Status", s),
      feld("Notiz", notiz),
      h(
        "div",
        { class: "a-werkzeuge" },
        knopf("Speichern", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("fehler", { schluessel: x.schluessel, status: s.value, notiz: notiz.value }), nachher), "a-p"),
        knopf("Löschen", async (ev) => {
          if (await bestaetigen("Bericht löschen?", "Der Bericht wird endgültig entfernt.", "Löschen"))
            aktion(ev.currentTarget as HTMLButtonElement, () => api("fehler", { aktion: "loeschen", schluessel: x.schluessel }), nachher);
        }, "a-rot"),
      ),
    ),
  );
}

// ═════════════ Analytics ═════════════

export const analytics: Bereich = async (ziel) => {
  const d = await api("analytics");
  const b = d.besuche;
  const e = d.eigene;
  const t = e.ok ? e.trichter : null;
  const quote = b.ok && t && b.besucher30 ? ((t.anmeldungen30 / b.besucher30) * 100).toFixed(1).replace(".", ",") + " %" : "—";
  fuege(ziel, 
    raster(
      "a-r4",
      kpi("Besucher (30 Tage)", b.ok ? zahl(b.besucher30) : "—", b.ok ? "eindeutige Besucher der Zone" : "Cloudflare nicht verbunden"),
      kpi("Seitenaufrufe (30 Tage)", b.ok ? zahl(b.seiten30) : "—"),
      kpi("Anmeldungen (30 Tage)", t ? zahl(t.anmeldungen30) : "—", `Quote ${quote}`),
      kpi("Große Umfrage beantwortet", t ? zahl(t.grosseUmfrage) : "—", t ? `Puls: ${t.ersteUmfrage}` : ""),
    ),
    hinweisKachel(b),
    b.ok ? karte("Besucher pro Tag", verlauf(b.proTag.map((x: Daten) => ({ tag: x.tag, wert: x.besucher }))), h("p", { class: "a-klein", style: "color:var(--a-faint);margin:8px 0 0" }, b.hinweis)) : null,
    raster(
      "a-r3",
      b.ok ? karte("Länder (30 Tage)", balken(b.laender)) : null,
      d.details.ok ? karte("Meistbesuchte Seiten (24 h)", balken(d.details.pfade)) : karte("Seiten (24 h)", hinweisKachel(d.details)),
      d.details.ok ? karte("Herkunft (24 h)", balken(d.details.herkunft)) : null,
    ),
    e.ok
      ? raster(
          "a-r2",
          karte("Anmeldungen pro Tag", verlauf(tage(e.anmeldungenProTag), "#334155")),
          karte(
            "Trichter",
            balken(
              [
                { name: "Besucher (30 Tage)", anzahl: b.ok ? b.besucher30 : 0 },
                { name: "Anmeldungen (30 Tage)", anzahl: t.anmeldungen30 },
                { name: "Anmeldungen gesamt", anzahl: t.anmeldungen },
                { name: "Eingeladen", anzahl: t.eingeladen },
                { name: "Puls-Umfrage beantwortet", anzahl: t.ersteUmfrage },
                { name: "Große Umfrage beantwortet", anzahl: t.grosseUmfrage },
              ].filter((x) => x.anzahl || x.name.startsWith("Anmeldungen")),
            ),
          ),
          karte("„Wie hast du von cockpit erfahren?“", balken(e.quellen)),
          karte("Kampagnen (utm)", balken(e.kampagnen)),
          karte("Systeme", balken(e.systeme)),
          karte("Situation", balken(e.situation)),
        )
      : hinweisKachel(e),
  );
};

// ═════════════ Doku ═════════════
// Interne Doku aus einem privaten GitHub-Repo (nur lesend). GitHub rendert das
// Markdown; bevor es ins DOM kommt, lässt `saeubern` nur harmlose Elemente und
// Attribute durch — die einzige Stelle im Admin, an der HTML eingefügt wird.

const DOKU_TAGS = new Set(
  "A P BR HR H1 H2 H3 H4 H5 H6 UL OL LI PRE CODE BLOCKQUOTE TABLE THEAD TBODY TR TH TD EM STRONG B I DEL S KBD SUP SUB DL DT DD DETAILS SUMMARY IMG INPUT DIV SPAN".split(" "),
);
const DOKU_WEG = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "TEMPLATE", "NOSCRIPT", "svg", "math"]);
const DOKU_ATTR = new Set(["href", "src", "alt", "title", "colspan", "rowspan", "align", "type", "checked", "disabled", "open", "id"]);
const SICHERE_URL = /^(https?:\/\/|#|mailto:)|^(?!\/\/)[\p{L}\p{N}_.\/()-]+(#[\w-]*)?$/u;

function saeubern(html: string): DocumentFragment {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const raus: Element[] = [];
  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    if (!DOKU_TAGS.has(el.tagName) || (el.tagName === "INPUT" && el.getAttribute("type") !== "checkbox")) {
      raus.push(el);
      continue;
    }
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase();
      if (!DOKU_ATTR.has(n) || ((n === "href" || n === "src") && !SICHERE_URL.test(a.value.trim()))) el.removeAttribute(a.name);
    }
    if (el.tagName === "INPUT") el.setAttribute("disabled", "");
  }
  // Verbotene Elemente samt Inhalt entfernen, unbekannte nur „auspacken".
  for (const el of raus) {
    if (!el.isConnected) continue;
    if (DOKU_WEG.has(el.tagName) || el.namespaceURI !== "http://www.w3.org/1999/xhtml") el.remove();
    else el.replaceWith(...Array.from(el.childNodes));
  }
  const frag = document.createDocumentFragment();
  frag.append(...Array.from(doc.body.childNodes).map((k) => document.importNode(k, true)));
  return frag;
}

/** Relativen Link aus einer Doku-Datei gegen deren Ordner auflösen. */
function dokuZiel(von: string, href: string): string | null {
  const [pfad] = href.split("#");
  if (!pfad || /^[a-z]+:/i.test(pfad) || !/\.md$/i.test(pfad)) return null;
  const teile = pfad.startsWith("/") ? [] : von.split("/").slice(0, -1);
  for (const t of pfad.split("/")) {
    if (!t || t === ".") continue;
    if (t === "..") teile.pop();
    else teile.push(t);
  }
  return teile.join("/");
}

let dokuAktuell = "";

export const doku: Bereich = async (ziel) => {
  const d = await api("doku");
  if (!d.ok) {
    fuege(
      ziel,
      hinweisKachel(d),
      karte(
        "So richtest du die Doku ein",
        h(
          "ol",
          { class: "a-doku-schritte" },
          h("li", {}, "Auf GitHub ein privates Repo anlegen, z. B. ", h("code", {}, "Stacktor/cockpit-docs"), "."),
          h("li", {}, "Einen Fine-grained Token mit „Contents: Read“ für dieses Repo erstellen (oder den vorhandenen Token erweitern)."),
          h("li", {}, "Unter Einstellungen den GitHub-Token eintragen; bei anderem Namen auch „Doku-Repo (privat)“ setzen."),
        ),
      ),
    );
    return;
  }
  const dateien: Daten[] = d.dateien;
  if (!dateien.length) {
    fuege(ziel, leer(`${d.repo} enthält noch keine Markdown-Dateien.`));
    return;
  }
  if (!dateien.some((x) => x.pfad === dokuAktuell)) dokuAktuell = dateien[0].pfad;

  const text = h("article", { class: "a-karte a-doku-text", "aria-live": "polite" });
  const liste = h("nav", { class: "a-doku-liste", "aria-label": "Dokumente" });
  const suche = eingabe({ type: "search", placeholder: "Dokument suchen …", "aria-label": "Dokument suchen" });

  const zeichneListe = () => {
    const q = suche.value.trim().toLowerCase();
    const gruppen = new Map<string, Daten[]>();
    for (const x of dateien) {
      if (q && !x.pfad.toLowerCase().includes(q)) continue;
      const ordner = x.pfad.includes("/") ? x.pfad.slice(0, x.pfad.lastIndexOf("/")) : "";
      if (!gruppen.has(ordner)) gruppen.set(ordner, []);
      gruppen.get(ordner)!.push(x);
    }
    liste.replaceChildren(
      ...[...gruppen].map(([ordner, xs]) =>
        h(
          "div",
          { class: "a-doku-gruppe" },
          ordner ? h("div", { class: "a-doku-ordner" }, ordner) : null,
          ...xs.map((x) =>
            h(
              "button",
              { type: "button", class: "a-doku-link", "aria-current": x.pfad === dokuAktuell ? "page" : null, onclick: () => oeffne(x.pfad) },
              x.pfad.split("/").pop()!.replace(/\.md$/i, ""),
            ),
          ),
        ),
      ),
    );
    if (!gruppen.size) liste.append(h("p", { class: "a-klein" }, "Nichts gefunden."));
  };

  async function oeffne(pfad: string) {
    dokuAktuell = pfad;
    zeichneListe();
    text.replaceChildren(h("div", { class: "a-laden" }, "Lädt …"));
    try {
      const x = await api(`doku?pfad=${encodeURIComponent(pfad)}`);
      if (!x.ok) {
        text.replaceChildren(hinweisKachel(x)!);
        return;
      }
      const kopf = h(
        "div",
        { class: "a-doku-kopf" },
        h("span", { class: "a-mono" }, pfad),
        h("a", { href: x.url, target: "_blank", rel: "noopener noreferrer", class: "a-knopf a-klein" }, svg(ICONS.extern, 14), "Auf GitHub"),
      );
      const inhalt = h("div", { class: "a-doku-inhalt" });
      inhalt.append(saeubern(x.html));
      inhalt.addEventListener("click", (ev) => {
        const a = (ev.target as HTMLElement).closest("a");
        const href = a?.getAttribute("href");
        if (!a || !href) return;
        if (href.startsWith("#")) {
          ev.preventDefault();
          const id = decodeURIComponent(href.slice(1));
          (inhalt.querySelector(`[id="user-content-${CSS.escape(id)}"]`) || inhalt.querySelector(`[id="${CSS.escape(id)}"]`))?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        const zielPfad = dokuZiel(pfad, href);
        if (zielPfad) {
          ev.preventDefault();
          oeffne(zielPfad);
        } else if (/^https?:/.test(href)) {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
        }
      });
      text.replaceChildren(kopf, inhalt);
    } catch (e) {
      text.replaceChildren(h("div", { class: "a-hinweis a-fehler" }, (e as Error).message));
    }
  }

  suche.addEventListener("input", zeichneListe);
  fuege(
    ziel,
    h(
      "div",
      { class: "a-doku" },
      h("aside", { class: "a-karte a-doku-seite" }, h("div", { class: "a-doku-repo a-mono" }, svg(ICONS.lizenz, 13), d.repo, " · privat"), suche, liste),
      text,
    ),
  );
  zeichneListe();
  await oeffne(dokuAktuell);
};

// ═════════════ Downloads & Builds ═════════════

export const builds: Bereich = async (ziel) => {
  const d = await api("builds");
  const r = d.releases;
  const gesamt = r.ok ? r.liste.reduce((s: number, x: Daten) => s + x.downloads, 0) : 0;
  const proDatei: Record<string, number> = {};
  if (r.ok) for (const rel of r.liste) for (const f of rel.dateien) proDatei[f.name] = (proDatei[f.name] || 0) + f.downloads;
  fuege(ziel, 
    raster(
      "a-r4",
      kpi("Downloads gesamt", r.ok ? zahl(gesamt) : "—"),
      kpi("Releases", r.ok ? zahl(r.liste.length) : "—", r.ok && r.liste[0] ? `neueste: ${r.liste[0].tag}` : ""),
      kpi("Offene Issues", d.issues.ok ? zahl(d.issues.liste.length) : "—"),
      kpi("Letzter CI-Lauf", d.laeufe.ok && d.laeufe.liste[0] ? d.laeufe.liste[0].ergebnis || d.laeufe.liste[0].status : "—", d.laeufe.ok && d.laeufe.liste[0] ? relativ(d.laeufe.liste[0].zeit) : ""),
    ),
    raster(
      "a-r2",
      karte("Downloads je Datei", r.ok ? balken(Object.entries(proDatei).map(([name, anzahl]) => ({ name, anzahl })).sort((a, b) => b.anzahl - a.anzahl)) : hinweisKachel(r)),
      karte(
        "Releases",
        r.ok
          ? r.liste.length
            ? tabelle(
                [
                  { titel: "Version", wert: (x) => h("a", { href: x.url, target: "_blank", rel: "noopener" }, x.tag) },
                  { titel: "Datum", wert: (x) => datum(x.datum) },
                  { titel: "Downloads", wert: (x) => zahl(x.downloads), klasse: "a-zahl" },
                ],
                r.liste,
                { suche: false },
              )
            : leer("Noch kein öffentliches Release.")
          : hinweisKachel(r),
      ),
    ),
    karte(
      "GitHub Actions",
      d.laeufe.ok
        ? tabelle(
            [
              { titel: "Workflow", wert: (x) => h("a", { href: x.url, target: "_blank", rel: "noopener" }, x.name) },
              { titel: "Titel", wert: (x) => h("span", { class: "a-klein" }, String(x.titel || "").slice(0, 70)) },
              { titel: "Zweig", wert: (x) => h("span", { class: "a-mono" }, x.zweig) },
              { titel: "Ergebnis", wert: (x) => badge(x.ergebnis || x.status) },
              { titel: "Zeit", wert: (x) => relativ(x.zeit) },
            ],
            d.laeufe.liste,
            { suche: false },
          )
        : hinweisKachel(d.laeufe),
    ),
    raster(
      "a-r2",
      karte(
        "Offene Issues",
        d.issues.ok
          ? d.issues.liste.length
            ? h("div", { class: "a-balken" }, d.issues.liste.map((i: Daten) => h("div", { class: "a-zitat" }, h("a", { href: i.url, target: "_blank", rel: "noopener" }, `#${i.nummer} ${i.titel}`), h("small", {}, relativ(i.zeit)))))
            : leer("Keine offenen Issues.")
          : hinweisKachel(d.issues),
      ),
      karte(
        "Testbuild-Entwürfe",
        d.entwuerfe.ok
          ? d.entwuerfe.liste.length
            ? h("div", { class: "a-balken" }, d.entwuerfe.liste.map((x: Daten) => h("div", { class: "a-zitat" }, h("a", { href: x.url, target: "_blank", rel: "noopener" }, x.name || x.tag), h("small", {}, relativ(x.zeit)))))
            : leer("Kein Entwurf vorhanden.")
          : hinweisKachel(d.entwuerfe),
      ),
    ),
  );
};

// ═════════════ Mail ═════════════

export const mail: Bereich = async (ziel, neu) => {
  const d = await api("mail");
  const gruppe = h("select", { class: "a-eingabe" }, d.gruppen.map((g: Daten) => h("option", { value: g.id }, `${g.titel} (${g.anzahl})`))) as HTMLSelectElement;
  const betreff = eingabe({ placeholder: "Betreff", style: "width:100%" });
  const inhalt = text("", { rows: 9, placeholder: "Text der Mail. Leerzeile = neuer Absatz, Links (https://…) werden klickbar. Die Anrede „Hallo <Vorname>,“ wird automatisch ergänzt." });
  const senden = async (test: boolean, knopfEl: HTMLButtonElement) => {
    if (!test) {
      const v = await api("mail", { aktion: "vorschau", gruppe: gruppe.value }).catch((e) => (toast(e.message, true), null));
      if (!v) return;
      if (!(await bestaetigen("Rundmail senden?", `${v.anzahl} Empfänger, z. B. ${v.beispiele.join(", ") || "—"}.`, `An ${v.anzahl} senden`))) return;
    }
    aktion(knopfEl, () => api("mail", { aktion: "senden", gruppe: gruppe.value, betreff: betreff.value, text: inhalt.value, test }), test ? undefined : neu);
  };
  const r = d.resend;
  fuege(ziel, 
    karte(
      "Rundmail an Tester",
      feld("Empfänger", gruppe),
      feld("Betreff", betreff),
      feld("Text", inhalt, d.absender ? `Absender: ${d.absender}` : undefined),
      h(
        "div",
        { class: "a-werkzeuge" },
        knopf("Test an mich", (ev) => senden(true, ev.currentTarget as HTMLButtonElement)),
        knopf("Senden …", (ev) => senden(false, ev.currentTarget as HTMLButtonElement), "a-p", "mail"),
      ),
    ),
    r.ok
      ? raster(
          "a-r3",
          karte("Zustellung (letzte 100)", balken(r.nachStatus)),
          karte(
            "Domains",
            r.domains.length ? h("div", { class: "a-balken" }, r.domains.map((x: Daten) => h("div", { class: "a-frage-kopf" }, h("b", { style: "flex:1" }, x.name), badge(x.status, x.status === "verified" ? "ok" : "warn")))) : leer("Keine Domain eingerichtet."),
          ),
          karte("Kontaktlisten", r.listen.length ? h("div", { class: "a-balken" }, r.listen.map((x: Daten) => h("div", {}, x.name))) : leer("Keine Liste.")),
        )
      : hinweisKachel(r),
    r.ok
      ? karte(
          "Letzte Mails",
          tabelle(
            [
              { titel: "An", wert: (m) => m.an },
              { titel: "Betreff", wert: (m) => m.betreff },
              { titel: "Status", wert: (m) => badge(m.status || "?") },
              { titel: "Zeit", wert: (m) => relativ(m.zeit) },
            ],
            r.letzte,
          ),
        )
      : null,
  );
};

// ═════════════ Einstellungen ═════════════

export const einstellungen: Bereich = async (ziel, neu) => {
  const d = await api("einstellungen");
  const s = d.schutz;
  const t = d.tresor;
  fuege(ziel, 
    karte(
      "Schutz & Grundlagen",
      h(
        "div",
        { class: "a-werkzeuge" },
        badge(s.access ? "Cloudflare Access geprüft" : "Access nicht eingerichtet", s.access ? "ok" : "warn"),
        badge(s.token ? "ADMIN_TOKEN gesetzt" : "kein ADMIN_TOKEN", s.token ? "info" : ""),
        badge(s.kv ? "KV verbunden" : "KV fehlt", s.kv ? "ok" : "bad"),
        badge(s.master ? "Tresor bereit" : s.masterZuKurz ? "ADMIN_MASTER_KEY zu kurz" : "ADMIN_MASTER_KEY fehlt", s.master ? "ok" : "bad"),
      ),
      h("p", { class: "a-klein", style: "color:var(--a-muted);margin:12px 0 0" }, `Angemeldet als ${d.benutzer}.`),
      !s.master
        ? h(
            "div",
            { class: "a-hinweis", style: "margin-top:12px" },
            s.masterZuKurz
              ? "Das Secret ADMIN_MASTER_KEY ist gesetzt, aber kürzer als 16 Zeichen. Im Pages-Projekt einen längeren Wert eintragen (z. B. 32 zufällige Zeichen aus einem Passwortmanager) und die Bereitstellung neu starten. Bis dahin gelten die Umgebungsvariablen."
              : "Um Schlüssel hier zu speichern, im Pages-Projekt das Secret ADMIN_MASTER_KEY anlegen (mindestens 16 zufällige Zeichen, z. B. aus einem Passwortmanager) und die Bereitstellung neu starten. Bis dahin gelten die Umgebungsvariablen.",
          )
        : null,
    ),
    karte(
      "API-Schlüssel",
      h(
        "div",
        { style: "display:grid;gap:12px" },
        t.geheim.map((g: Daten) => {
          const e = eingabe({ type: "password", placeholder: g.gesetzt ? "Neuen Schlüssel eingeben, um zu tauschen" : "Schlüssel eingeben", autocomplete: "off", style: "flex:1;min-width:220px" });
          return h(
            "div",
            { class: "a-frage" },
            h(
              "div",
              { class: "a-frage-kopf" },
              h("b", { style: "flex:1" }, g.titel),
              g.defekt ? badge("nicht lesbar", "bad") : g.gesetzt ? badge(`${g.anzeige} · ${g.quelle === "dashboard" ? "Dashboard" : "Umgebung"}`, "ok") : badge("fehlt", "warn"),
            ),
            h("div", { class: "a-klein", style: "color:var(--a-faint)" }, g.hilfe),
            h(
              "div",
              { class: "a-werkzeuge" },
              e,
              knopf("Speichern", async (ev) => {
                const r = await aktion(ev.currentTarget as HTMLButtonElement, () => api("einstellungen", { aktion: "geheim", name: g.name, wert: e.value }), neu);
                if (r?.test) toast(`${g.titel}: ${r.test.text}`, !r.test.ok);
              }, "a-p"),
              g.gesetzt
                ? knopf("Testen", async (ev) => {
                    const r = await aktion(ev.currentTarget as HTMLButtonElement, () => api("einstellungen", { aktion: "geheim-testen", name: g.name }));
                    if (r?.test) toast(`${g.titel}: ${r.test.text}`, !r.test.ok);
                  })
                : null,
              g.quelle === "dashboard" || g.defekt
                ? knopf("Entfernen", async (ev) => {
                    if (await bestaetigen("Schlüssel entfernen?", "Der im Dashboard gespeicherte Schlüssel wird gelöscht.", "Entfernen"))
                      aktion(ev.currentTarget as HTMLButtonElement, () => api("einstellungen", { aktion: "geheim-loeschen", name: g.name }), neu);
                  }, "a-rot")
                : null,
            ),
          );
        }),
      ),
    ),
    karte(
      "Einstellungen",
      h(
        "div",
        { style: "display:grid;gap:4px" },
        t.einstellungen.map((x: Daten) => {
          const e = eingabe({ value: x.wert || "", style: "flex:1;min-width:220px" });
          return feld(
            x.titel + (x.quelle === "umgebung" ? " (aus Umgebung)" : ""),
            h("div", { class: "a-werkzeuge" }, e, knopf("Speichern", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("einstellungen", { aktion: "einstellung", name: x.name, wert: e.value }), neu))),
            x.hilfe,
          );
        }),
      ),
      h("p", { class: "a-klein", style: "color:var(--a-faint);margin:6px 0 0" }, `Alpha-Plätze: ${d.plaetze} — änderbar im Bereich „Alpha“.`),
    ),
    karte(
      "Audit-Log",
      tabelle(
        [
          { titel: "Zeit", wert: (p) => zeit(p.zeit) },
          { titel: "Wer", wert: (p) => p.benutzer },
          { titel: "Aktion", wert: (p) => p.aktion },
          { titel: "Details", wert: (p) => h("span", { class: "a-klein" }, p.details) },
        ],
        d.protokoll,
        { leerText: "Noch keine Einträge." },
      ),
    ),
  );
};
