import { h, svg, ICONS, datum, zeit, relativ, zahl, euro, mb, type Daten } from "./dom";
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
  kopierKnopf,
  karteMitKopf,
  knopf,
  kpi,
  leer,
  liste,
  prozent,
  schublade,
  schubladeZu,
  stufen,
  tabelle,
  toast,
  trend,
  verlauf,
} from "./ui";

import { dashboard } from "./uebersicht";
import { dialogFenster, popupMenue } from "./menue";

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
  const plaetzeEingabe = eingabe({ class: "a-eingabe a-schmal", type: "number", min: 0, max: 10000, value: d.plaetze, "aria-label": "Plätze" });

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
          "Zum Einladen brauchst du unter Einstellungen den Lemon-Squeezy-Schlüssel, die Store-ID, die Variant-ID und den Checkout-Link der Alpha, dazu den Resend-Schlüssel. Ist die Alpha-Variante ohnehin kostenlos, reichen Checkout-Link und Resend.",
        )
      : null,
    karteMitKopf(
      "Anmeldungen",
      h(
        "div",
        { class: "a-werkzeuge" },
        h("span", { class: "a-klein a-leise" }, "Plätze:"),
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
      h("p", { class: "a-klein a-notiz" }, "Legt einen einmaligen 100-%-Code für die Alpha-Variante an und schickt eine Mail mit Checkout-Link. Danach steht der Status auf „eingeladen“."),
      h("label", { class: "a-werkzeuge a-mb" }, ohneCode, "Ohne Rabattcode (Alpha-Variante ist kostenlos)"),
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

const TAG = 864e5;
const statusVon = (x: Daten) => (x.deaktiviert ? "disabled" : x.status);
/** Merkmale für den Filter „Merkmal“. */
function merkmale(x: Daten): string[] {
  const m: string[] = [];
  const ab = x.laeuftAb ? new Date(x.laeuftAb).getTime() : 0;
  if (ab && ab > Date.now() && ab - Date.now() < 30 * TAG) m.push("läuft in 30 Tagen ab");
  if (ab && ab < Date.now()) m.push("abgelaufen");
  if (x.testmodus) m.push("Testmodus");
  if (!x.ping) m.push("nie in der App geprüft");
  else if (Date.now() - new Date(x.ping.zeit).getTime() > 30 * TAG) m.push("seit 30 Tagen nicht geprüft");
  if (x.notiz) m.push("mit Notiz");
  return m;
}
const MERKMALE = ["läuft in 30 Tagen ab", "abgelaufen", "Testmodus", "nie in der App geprüft", "seit 30 Tagen nicht geprüft", "mit Notiz"];

export const lizenzen: Bereich = async (ziel, neu) => {
  const d = await api("lizenzen");
  const l: Daten[] = d.lizenzen;
  const status = [...new Set(l.map(statusVon))];
  const produkte = [...new Set(l.map((x) => x.produkt).filter(Boolean))] as string[];
  const sammel = (aktionName: string, frage: string, extra: Daten = {}) => async (zeilen: Daten[]) => {
    if (!zeilen.length) return;
    if (!(await bestaetigen(`${zeilen.length} Lizenzen ${frage}?`, "Die Änderung geht direkt an Lemon Squeezy. Die App übernimmt sie bei der nächsten Prüfung.", "Ausführen"))) return;
    await aktion(null, () => api("lizenzen", { ids: zeilen.map((x) => x.id), aktion: aktionName, ...extra }), neu);
  };
  fuege(
    ziel,
    raster(
      "a-r4",
      kpi("Lizenzen", zahl(l.length)),
      kpi("Aktiv", zahl(l.filter((x) => x.status === "active" && !x.deaktiviert).length)),
      kpi("Läuft in 30 Tagen ab", zahl(l.filter((x) => merkmale(x).includes("läuft in 30 Tagen ab")).length)),
      kpi("Gesperrt / abgelaufen", zahl(l.filter((x) => x.deaktiviert || x.status === "expired").length)),
    ),
    karte(
      null,
      tabelle(
        [
          {
            titel: "Schlüssel",
            wert: (x) => h("span", { class: "a-schluessel" }, h("span", { class: "a-mono" }, x.schluessel), x.schluessel ? kopierKnopf(x.schluessel, "Schlüssel kopieren") : null),
            suche: (x) => x.schluessel,
          },
          { titel: "Kunde", wert: (x) => h("div", {}, x.kundenName || "—", h("div", { class: "a-klein" }, x.kunde)), suche: (x) => `${x.kundenName} ${x.kunde} ${x.notiz || ""}` },
          { titel: "Produkt", wert: (x) => x.produkt },
          { titel: "Status", wert: (x) => h("span", {}, badge(statusVon(x)), x.testmodus ? badge("Test", "") : null) },
          { titel: "Geräte", wert: (x) => `${x.genutzt ?? 0} / ${x.limit ?? "∞"}`, klasse: "a-zahl" },
          {
            titel: "App",
            wert: (x) => (x.ping ? h("div", {}, relativ(x.ping.zeit), h("div", { class: "a-klein" }, `${x.ping.version || "?"} · ${x.ping.system || "?"}`)) : "—"),
            suche: (x) => (x.ping ? `${x.ping.version} ${x.ping.system}` : ""),
          },
          { titel: "Läuft ab", wert: (x) => (x.laeuftAb ? datum(x.laeuftAb) : "unbefristet") },
          { titel: "Erstellt", wert: (x) => datum(x.erstellt) },
        ],
        l,
        {
          filter: [
            { name: "Status", werte: status, feld: statusVon },
            ...(produkte.length > 1 ? [{ name: "Produkt", werte: produkte, feld: (x: Daten) => x.produkt || "" }] : []),
            { name: "Merkmal", werte: MERKMALE, feld: merkmale },
          ],
          beiKlick: (x) => lizenzDetail(x.id, neu),
          leerText: "Noch keine Lizenzen.",
          auswahl: {
            schluessel: (x) => String(x.id),
            aktionen: [
              { titel: "Um 30 Tage verlängern", aus: sammel("verlaengern", "um 30 Tage verlängern", { tage: 30 }) },
              { titel: "Entsperren", aus: sammel("entsperren", "entsperren") },
              { titel: "Sperren", klasse: "a-rot", aus: sammel("sperren", "sperren") },
            ],
          },
        },
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
  const tageEingabe = eingabe({ class: "a-eingabe a-schmal", type: "number", value: 365, min: 1, max: 3650, "aria-label": "Tage" });
  const limitEingabe = eingabe({ class: "a-eingabe a-schmal", type: "number", value: x.limit || 3, min: 1, max: 100, "aria-label": "Geräte" });
  const tu = (daten: Daten) => (ev: Event) =>
    aktion(ev.currentTarget as HTMLButtonElement, () => api("lizenzen", { id: x.id, ...daten }), () => {
      lizenzDetail(id, neu);
      neu();
    });
  const notiz = text(x.notiz || "", { rows: 3, placeholder: "Nur für dich sichtbar, z. B. „Rabatt zugesagt“", "aria-label": "Notiz" });
  const betreff = eingabe({ class: "a-eingabe a-voll", placeholder: "Betreff", "aria-label": "Betreff" });
  const mailText = text("", { rows: 5, placeholder: "Text der Mail (Anrede mit Vorname kommt automatisch)", "aria-label": "Text" });
  const sync = d.sync as Daten | null;

  schublade(
    `Lizenz ${x.kurz || x.id}`,
    liste([
      ["Schlüssel", x.schluessel ? h("span", { class: "a-schluessel" }, h("span", { class: "a-mono" }, x.schluessel), kopierKnopf(x.schluessel, "Schlüssel kopieren")) : "—"],
      ["Kunde", x.kundenName],
      ["E-Mail", x.kunde ? h("a", { href: `mailto:${x.kunde}` }, x.kunde) : null],
      ["Produkt", x.produkt],
      ["Status", badge(statusVon(x))],
      ["Geräte", `${x.genutzt ?? 0} von ${x.limit ?? "∞"}`],
      ["Läuft ab", x.laeuftAb ? zeit(x.laeuftAb) : "unbefristet"],
      ["Letzte App-Prüfung", x.ping ? `${zeit(x.ping.zeit)} · ${x.ping.version || "?"} · ${x.ping.system || "?"} · ${x.ping.status || "?"}` : "noch keine"],
      ["Bestellung", x.bestellung],
      ["Erstellt", zeit(x.erstellt)],
    ]),
    karte(
      "Notiz",
      notiz,
      h("div", { class: "a-werkzeuge a-mt" }, knopf("Speichern", (ev) => tu({ aktion: "notiz", text: notiz.value })(ev))),
    ),
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
                h("span", { class: "a-luecke" }, g.name, h("div", { class: "a-klein a-blass" }, `seit ${datum(g.erstellt)}`)),
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
        { class: "a-werkzeuge a-mb" },
        x.deaktiviert
          ? knopf("Entsperren", tu({ aktion: "entsperren" }))
          : knopf("Sperren", async (ev) => (await bestaetigen("Lizenz sperren?", "Die App zeigt „Gesperrt“, behält den Schlüssel und läuft als kostenlose Version weiter.", "Sperren")) && tu({ aktion: "sperren" })(ev), "a-rot"),
        knopf("Unbefristet", tu({ aktion: "unbefristet" })),
      ),
      h("div", { class: "a-werkzeuge a-mb" }, "Verlängern um", tageEingabe, "Tage", knopf("Verlängern", (ev) => tu({ aktion: "verlaengern", tage: Number(tageEingabe.value), bisherAblauf: x.laeuftAb })(ev))),
      h("div", { class: "a-werkzeuge" }, "Geräte-Limit", limitEingabe, knopf("Setzen", (ev) => tu({ aktion: "geraete", limit: Number(limitEingabe.value) })(ev))),
    ),
    sync
      ? karte(
          "Sync-Speicher",
          liste([
            ["Sync", `${mb(sync.belegt)} von ${mb(sync.grenze)} · ${zahl(sync.dateien)} Dateien`],
            ["Cloud-Sicherungen", sync.sicherungen ? `${mb(sync.sicherungen.belegt)} von ${mb(sync.sicherungen.grenze)} · ${zahl(sync.sicherungen.dateien)} Dateien` : "—"],
          ]),
          h("p", { class: "a-fussnote" }, "Alles ist auf dem Gerät verschlüsselt. Hier lässt sich nichts davon lesen."),
          sync.dateien
            ? knopf("Sync-Speicher leeren", async (ev) => (await bestaetigen("Sync-Speicher leeren?", "Alle Sync-Pakete dieser Lizenz verschwinden vom Server. Die Cloud-Sicherungen bleiben, die Daten auf den Geräten auch. Beim nächsten Abgleich lädt ein Gerät seinen Stand neu hoch.", "Leeren")) && tu({ aktion: "sync-leeren" })(ev), "a-rot")
            : null,
        )
      : null,
    karte(
      "Mail an Kunden",
      x.kunde
        ? h(
            "div",
            { class: "a-stapel eng" },
            betreff,
            mailText,
            h(
              "div",
              { class: "a-werkzeuge a-mt" },
              knopf("Senden", async (ev) => {
                if (!betreff.value.trim() || !mailText.value.trim()) return toast("Betreff und Text ausfüllen.", true);
                if (await bestaetigen("Mail senden?", `An ${x.kunde}, mit cockpit-Logo und Fußzeile.`, "Senden")) tu({ aktion: "mail", betreff: betreff.value, text: mailText.value })(ev);
              }),
            ),
          )
        : leer("Zu dieser Lizenz gibt es keine E-Mail-Adresse."),
    ),
    karte(
      "Verlauf",
      d.verlauf?.length
        ? h(
            "ol",
            { class: "a-zeitleiste" },
            d.verlauf.map((e: Daten) => h("li", {}, h("b", {}, e.aktion), h("div", { class: "a-klein" }, `${zeit(e.zeit)} · ${e.benutzer || "?"}`))),
          )
        : leer("Noch keine Änderungen aus dem Admin."),
      h("p", { class: "a-klein a-fussnote" }, `Erstellt ${zeit(x.erstellt)} bei Lemon Squeezy.`),
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
  const code = eingabe({ class: "a-eingabe a-gross", placeholder: "CODE (leer = zufällig)" });
  const prozent = eingabe({ class: "a-eingabe a-schmal", type: "number", min: 1, max: 100, value: 20 });
  const anzahl = eingabe({ class: "a-eingabe a-schmal", type: "number", min: 0, value: 0 });
  return h(
    "div",
    { class: "a-stapel weit" },
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

/** ISO-Zeitpunkt ↔ Wert für <input type="datetime-local"> (Ortszeit). */
const alsLokal = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
};
const ausLokal = (wert: string) => (wert ? new Date(wert).toISOString() : null);

/** Badges zum Zeitplan einer Umfrage: Fenster, Verzögerung, erzwungen. */
function zeitplanBadges(def: Daten): HTMLElement[] {
  const jetzt = Date.now();
  const b: HTMLElement[] = [];
  if (def.start && new Date(def.start).getTime() > jetzt) b.push(badge(`startet ${datum(def.start)}`, "warn"));
  if (def.ende) b.push(new Date(def.ende).getTime() < jetzt ? badge("beendet", "") : badge(`bis ${datum(def.ende)}`, ""));
  if (def.verzoegerungStunden) b.push(badge(`+${def.verzoegerungStunden} Std.`, ""));
  if (def.erzwingen) b.push(badge("kommt wieder", "violett"));
  return b;
}

export const umfragen: Bereich = async (ziel, neu) => {
  const d = await api("umfragen");
  fuege(ziel, 
    d.standard
      ? h("div", { class: "a-hinweis" }, "Es gelten die Standard-Fragebögen. Sobald du einen bearbeitest oder eine neue Umfrage anlegst, landen beide im KV. Danach kannst du sie hier ändern.")
      : null,
    h("div", { class: "a-werkzeuge" }, knopf("Neue Umfrage", () => editor(null, neu), "a-p")),
    ...d.umfragen.map((u: Daten) => umfrageKarte(u.definition, u.auswertung, neu)),
    d.web && d.web.ok && d.web.gesamt ? webUmfrageKarte(d.web) : null,
  );
};

function umfrageKarte(def: Daten, aus: Daten, neu: () => void) {
  const inhalt = h("div", { class: "a-stapel" });
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
      ...zeitplanBadges(def),
      badge(`${aus.antworten} Antworten`, ""),
    ),
    h("p", { class: "a-klein a-notiz" }, `${def.id} · ${def.fragen.length} Fragen${aus.letzte ? ` · letzte Antwort ${relativ(aus.letzte)}` : ""}`),
    h(
      "div",
      { class: "a-werkzeuge a-mb" },
      umschalten,
      knopf("Bearbeiten", () => editor(def, neu)),
      knopf(def.aktiv ? "Pausieren" : "Aktivieren", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("umfragen", { aktion: "aktiv", id: def.id, aktiv: !def.aktiv }), neu)),
      h("a", { class: "a-knopf", href: exportUrl(`umfragen?export=${encodeURIComponent(def.id)}`), download: `umfrage-${def.id}.csv` }, "CSV"),
      knopf("Löschen", async (ev) => {
        if (await bestaetigen("Umfrage löschen?", "Die Umfrage verschwindet aus der App. Antworten, die schon da sind, bleiben.", "Löschen"))
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
      teile.push(h("h3", { class: "a-zwischentitel" }, abschnitt));
    }
    const kopf = h("div", { class: "a-frage-kopf" }, badge(f.typ, ""), h("b", { class: "a-luecke" }, f.text), h("span", { class: "a-klein a-blass" }, `n = ${f.n}`));
    let koerper: Node;
    switch (f.typ) {
      case "einfach":
      case "mehrfach":
        koerper = balken(f.verteilung, 30);
        break;
      case "skala":
        koerper = h("div", {}, h("div", { class: "a-klein a-mb" }, `Durchschnitt ${f.schnitt ?? "—"} von 5`), balken(f.verteilung));
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
          h("div", { class: "a-klein a-mb" }, "Durchschnitt je Funktion von 1 bis 5. „Nicht genutzt“ zählt nicht mit."),
          balken(
            f.zeilen.filter((z: Daten) => z.schnitt !== null).map((z: Daten) => ({ name: `${z.name} (n = ${z.n})`, anzahl: z.schnitt })),
            30,
            5,
          ),
        );
        break;
      case "text":
        koerper = f.texte.length
          ? h("div", { class: "a-stapel a-scroll" }, f.texte.map((t: Daten) => h("div", { class: "a-zitat" }, t.text, h("small", {}, `${t.email || "?"} · ${relativ(t.zeit)}`))))
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
    h("div", { class: "a-mt" }, balken(Object.entries(w.modelle || {}).map(([name, anzahl]) => ({ name, anzahl: Number(anzahl) })))),
  );
}

function editor(def: Daten | null, neu: () => void) {
  const u: Daten = def ? structuredClone(def) : { id: "", titel: "", beschreibung: "", aktiv: false, ausloeser: { art: "tage", wert: 7 }, fragen: [] };
  const id = eingabe({ value: u.id, placeholder: "z. B. puls-woche4", readonly: Boolean(def) });
  const titel = eingabe({ value: u.titel, placeholder: "Titel im Popup" });
  const beschreibung = text(u.beschreibung || "", { placeholder: "Kurzer Einleitungstext" });
  const aktiv = h("input", { type: "checkbox", checked: Boolean(u.aktiv) }) as HTMLInputElement;
  const mitText = (paare: [string, string][], aktuell: string) =>
    h("select", { class: "a-eingabe" }, paare.map(([w, t]) => h("option", { value: w, selected: w === aktuell }, t))) as HTMLSelectElement;
  const art = mitText(
    [
      ["sofort", "Sofort, sobald aktiv"],
      ["tage", "Tage nach dem ersten Start"],
      ["meilenstein", "Ab einer Anzahl in der App"],
    ],
    u.ausloeser?.art || "tage",
  );
  const wert = eingabe({ class: "a-eingabe a-schmal", type: "number", min: 0, value: u.ausloeser?.wert ?? 7, "aria-label": "Wert" });
  const zaehler = mitText(
    [
      ["bewerbungen", "Bewerbungen"],
      ["anschreiben", "Anschreiben"],
    ],
    u.ausloeser?.zaehler || "bewerbungen",
  );
  const start = eingabe({ type: "datetime-local", value: alsLokal(u.start), "aria-label": "Start" });
  const ende = eingabe({ type: "datetime-local", value: alsLokal(u.ende), "aria-label": "Ende" });
  const verzoegerung = eingabe({ type: "number", min: 0, max: 720, value: u.verzoegerungStunden ?? 0 });
  const spaeter = eingabe({ type: "number", min: 1, max: 60, value: u.spaeterTage ?? 3 });
  const ruhe = eingabe({ type: "number", min: 0, max: 168, value: u.ruheStunden ?? 20 });
  const erzwingen = h("input", { type: "checkbox", checked: Boolean(u.erzwingen) }) as HTMLInputElement;
  const fragenListe = h("div", { class: "a-stapel" });

  const fragen: Daten[] = u.fragen.map((f: Daten) => ({ ...f }));
  const zeichneFragen = () => {
    fragenListe.replaceChildren(
      ...fragen.map((f, i) => {
        const fid = eingabe({ class: "a-eingabe a-mittel", value: f.id || "", placeholder: "id" });
        const typ = auswahl(TYPEN, f.typ || "einfach");
        const ftext = eingabe({ class: "a-eingabe a-wachsen", value: f.text || "", placeholder: "Fragetext" });
        const abschnitt = eingabe({ class: "a-eingabe a-mittel", value: f.abschnitt || "", placeholder: "Abschnitt (optional)" });
        const pflicht = h("input", { type: "checkbox", checked: Boolean(f.pflicht) }) as HTMLInputElement;
        const optionen = text((f.optionen || f.zeilen || []).join("\n"), { placeholder: "Eine Antwortmöglichkeit (bzw. Zeile) pro Zeile", rows: 3 });
        const links = eingabe({ class: "a-eingabe a-mittel", value: f.labels?.[0] || "", placeholder: "Beschriftung 1" });
        const rechts = eingabe({ class: "a-eingabe a-mittel", value: f.labels?.[1] || "", placeholder: "Beschriftung 5" });
        const max = eingabe({ class: "a-eingabe a-schmal", type: "number", value: f.max ?? 1000 });
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
            h("span", { class: "a-luecke" }),
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
    feld("ID", id, "Kleinbuchstaben, Ziffern und Bindestriche. Bleibt für immer gleich, weil die Antworten daran hängen."),
    feld("Titel", titel),
    feld("Beschreibung", beschreibung),
    h("div", { class: "a-feld" }, h("span", {}, "Auslöser"), h("div", { class: "a-werkzeuge" }, art, wert, zaehler), h("small", {}, "Die App zählt lokal: Tage seit dem ersten Start oder angelegte Bewerbungen bzw. Anschreiben. Die Zahlen verlassen das Gerät nicht.")),
    h(
      "fieldset",
      { class: "a-gruppe" },
      h("legend", {}, "Zeitplan"),
      h("div", { class: "a-reihe" }, feld("Läuft ab", start), feld("Läuft bis", ende)),
      h(
        "div",
        { class: "a-reihe drei" },
        feld("Verzögerung (Std.)", verzoegerung, "nach dem Auslöser"),
        feld("Pause nach „Später“ (Tage)", spaeter),
        feld("Abstand zur nächsten (Std.)", ruhe),
      ),
      h(
        "label",
        { class: "a-schalter" },
        erzwingen,
        h("span", {}, h("b", {}, "Erzwingen"), h("span", { class: "a-klein a-leise" }, " · Lässt sich wegklicken, kommt aber beim nächsten Start, Sync oder Update-Check wieder, bis die Person antwortet.")),
      ),
      h("p", { class: "a-fussnote" }, "Leer lassen heißt: ab sofort und ohne Ende. Ohne Angabe gelten 3 Tage Pause nach „Später“ und 20 Stunden Abstand."),
    ),
    h("label", { class: "a-schalter" }, aktiv, "Aktiv: Alpha-Tester bekommen die Umfrage angezeigt"),
    h("h3", { class: "a-zwischentitel" }, "Fragen"),
    fragenListe,
    h(
      "div",
      { class: "a-werkzeuge" },
      knopf("Frage hinzufügen", () => {
        fragen.push({ id: `frage${fragen.length + 1}`, typ: "einfach", text: "", pflicht: false, optionen: [] });
        zeichneFragen();
      }),
      h("span", { class: "a-luecke" }),
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
                  start: ausLokal(start.value),
                  ende: ausLokal(ende.value),
                  verzoegerungStunden: Number(verzoegerung.value) || 0,
                  spaeterTage: Number(spaeter.value) || null,
                  ruheStunden: ruhe.value === "" ? null : Number(ruhe.value),
                  erzwingen: erzwingen.checked,
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
          { titel: "Beschreibung", wert: (x) => h("div", { class: "a-lesbar" }, String(x.beschreibung || "").slice(0, 140)), suche: (x) => `${x.beschreibung} ${x.email}` },
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
        { class: "a-leiste" },
        knopf("Löschen", async (ev) => {
          const k = ev.currentTarget as HTMLButtonElement;
          if (await bestaetigen("Bericht löschen?", "Der Bericht verschwindet endgültig. Die Person, die ihn geschickt hat, merkt davon nichts.", "Löschen"))
            aktion(k, () => api("fehler", { aktion: "loeschen", schluessel: x.schluessel }), nachher);
        }, "a-rot", "muell"),
        h("span", { class: "a-luecke" }),
        knopf("Speichern", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("fehler", { schluessel: x.schluessel, status: s.value, notiz: notiz.value }), nachher), "a-p"),
      ),
    ),
  );
}

// ═════════════ Analytics ═════════════

export const analytics: Bereich = async (ziel) => {
  const d = await api("analytics");
  const b = d.besuche;
  const det = d.details;
  const e = d.eigene;
  const t = e.ok ? e.trichter : null;
  const anmeldungenNach = new Map<string, number>((e.ok ? e.anmeldungenProTag : []).map((x: Daten) => [x.tag, x.anzahl]));
  const zeitraum = b.ok ? (b.tage >= 2 ? `letzte ${b.tage} Tage` : "seit gestern") : "";

  fuege(
    ziel,
    h(
      "p",
      { class: "a-notiz" },
      "Zahlen nur für ",
      h("b", {}, "cockpit.mesco.cc"),
      ". Gezählt werden Seitenaufrufe echter Besucher, ohne Bots und ohne Dateien wie Bilder.",
      b.ok && b.tage < 14 ? ` Dein Cloudflare-Tarif liefert Tageswerte für die ${zeitraum}.` : "",
    ),
    raster(
      "a-r4",
      kpi("Besuche (7 Tage)", b.ok ? zahl(b.woche.besuche) : "—", b.ok ? (b.vorwoche ? "gegenüber der Woche davor" : "noch kein Vergleich") : "Cloudflare nicht verbunden", b.ok ? trend(b.woche.besuche, b.vorwoche?.besuche) : null),
      kpi("Seitenaufrufe (7 Tage)", b.ok ? zahl(b.woche.seiten) : "—", b.ok ? `${(b.woche.seiten / Math.max(1, b.woche.besuche)).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Seiten je Besuch` : "", b.ok ? trend(b.woche.seiten, b.vorwoche?.seiten) : null),
      kpi("Anmeldungen (7 Tage)", t ? zahl(t.anmeldungen7) : "—", b.ok && t ? `${prozent(t.anmeldungen7, b.woche.besuche)} der Besuche` : ""),
      kpi("Große Umfrage", t ? zahl(t.grosseUmfrage) : "—", t ? `${t.ersteUmfrage} haben die kurze Umfrage beantwortet` : ""),
    ),
    hinweisKachel(b),
    b.ok
      ? karte(
          `Besuche und Anmeldungen, ${zeitraum}`,
          verlauf(
            b.proTag.map((x: Daten) => ({ tag: x.tag, wert: x.besuche })),
            "#0f172a",
            e.ok ? { werte: b.proTag.map((x: Daten) => ({ tag: x.tag, wert: anmeldungenNach.get(x.tag) ?? 0 })), farbe: "#6366f1", name: "Anmeldungen", erste: "Besuche" } : undefined,
          ),
          h("p", { class: "a-fussnote" }, `Insgesamt ${zahl(b.besuche)} Besuche und ${zahl(b.seiten)} Seitenaufrufe. Beide Linien haben eine eigene Skala.`),
        )
      : null,
    raster(
      "a-r2",
      t
        ? karte(
            "Vom Besuch zur Antwort",
            stufen(
              [
                { name: "Besuche (30 Tage)", anzahl: b.ok ? b.besuche : 0, hilfe: b.ok ? `Besuche, ${zeitraum}` : "Cloudflare nicht verbunden" },
                { name: "Anmeldungen (30 Tage)", anzahl: t.anmeldungen30 },
                { name: "Eingeladen (gesamt)", anzahl: t.eingeladen },
                { name: "Kurze Umfrage beantwortet", anzahl: t.ersteUmfrage },
                { name: "Große Umfrage beantwortet", anzahl: t.grosseUmfrage },
              ].filter((x, i) => i || x.anzahl),
            ),
          )
        : hinweisKachel(e),
      det.ok
        ? h(
            "div",
            { class: "a-stapel weit" },
            karte(`Meistbesuchte Seiten (${det.zeitraum})`, balken(det.pfade, 8)),
            karte(`Woher die Besucher kommen (${det.zeitraum})`, balken(det.herkunft, 6)),
            karte(`Länder (${det.zeitraum})`, balken(det.laender, 6)),
          )
        : karte("Seiten, Herkunft und Länder", hinweisKachel(det)),
    ),
    e.ok
      ? karte(
          "Wer sich anmeldet",
          raster(
            "a-r4 a-innen",
            h("div", {}, h("h3", { class: "a-zwischentitel" }, "Wie gefunden"), balken(e.quellen, 6)),
            h("div", {}, h("h3", { class: "a-zwischentitel" }, "Kampagnen (utm)"), balken(e.kampagnen, 6)),
            h("div", {}, h("h3", { class: "a-zwischentitel" }, "System"), balken(e.systeme, 6)),
            h("div", {}, h("h3", { class: "a-zwischentitel" }, "Situation"), balken(e.situation, 6)),
          ),
        )
      : null,
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
          h("li", {}, "Unter Einstellungen den GitHub-Token eintragen. Heißt das Repo anders, auch „Doku-Repo (privat)“ setzen."),
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

const MAIL_STATUS: Record<string, [string, string]> = {
  delivered: ["zugestellt", "ok"],
  opened: ["geöffnet", "ok"],
  clicked: ["geklickt", "ok"],
  sent: ["gesendet", "info"],
  queued: ["wartet", "info"],
  scheduled: ["geplant", "info"],
  delivery_delayed: ["verzögert", "warn"],
  bounced: ["zurückgewiesen", "bad"],
  complained: ["als Spam markiert", "bad"],
  failed: ["fehlgeschlagen", "bad"],
};
const mailStatus = (s?: string) => {
  const [t, f] = MAIL_STATUS[s || ""] ?? [s || "unbekannt", ""];
  return badge(t, f);
};

/** Eine gesendete Mail im Seitenfach, das HTML in einem abgeschotteten Rahmen. */
async function mailDetail(id: string) {
  schublade("Mail wird geladen …", h("div", { class: "a-lade" }, h("div")));
  try {
    const m = await api(`mail?id=${encodeURIComponent(id)}`);
    const rahmen = h("iframe", { class: "a-mail-rahmen", sandbox: "", title: "Inhalt der Mail", referrerpolicy: "no-referrer" }) as HTMLIFrameElement;
    rahmen.srcdoc = m.html || `<pre style="font:14px/1.6 system-ui;white-space:pre-wrap;padding:16px">${String(m.text || "Kein Inhalt gespeichert.").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</pre>`;
    schublade(
      m.betreff || "Mail",
      liste([
        ["An", m.an],
        ["Von", m.von],
        ["Status", mailStatus(m.status)],
        ["Gesendet", zeit(m.zeit)],
      ]),
      karte("Inhalt", rahmen),
    );
  } catch (e) {
    schublade("Mail", h("div", { class: "a-hinweis a-fehler" }, (e as Error).message));
  }
}

export const mail: Bereich = async (ziel, neu) => {
  const d = await api("mail");
  const r = d.resend;
  const k = r.ok ? r.kennzahlen : null;

  // ── Neue Rundmail: Empfänger als Pillen, Text links, echte Vorschau rechts ──
  let gruppe = d.gruppen.find((g: Daten) => g.id === "eingeladen" && g.anzahl)?.id ?? d.gruppen.find((g: Daten) => g.anzahl)?.id ?? d.gruppen[0]?.id;
  const pillen = h("div", { class: "a-wahlen", role: "radiogroup", "aria-label": "Empfänger" });
  const zeichnePillen = () =>
    pillen.replaceChildren(
      ...d.gruppen.map((g: Daten) =>
        h(
          "button",
          {
            type: "button",
            class: "a-wahl",
            role: "radio",
            "aria-checked": String(g.id === gruppe),
            onclick: () => {
              gruppe = g.id;
              zeichnePillen();
            },
          },
          g.titel,
          h("span", { class: "a-wahl-zahl" }, zahl(g.anzahl)),
        ),
      ),
    );
  zeichnePillen();
  const betreff = eingabe({ class: "a-eingabe a-voll", placeholder: "Worum geht es?", maxlength: 150, "aria-label": "Betreff" });
  const inhalt = text("", { rows: 12, placeholder: "Dein Text. Eine Leerzeile beginnt einen neuen Absatz, Links werden klickbar. „Hallo <Vorname>,“ steht automatisch davor.", "aria-label": "Text" });
  const vorschau = h("iframe", { class: "a-mail-rahmen", sandbox: "", title: "Vorschau der Mail" }) as HTMLIFrameElement;
  const vorschauBetreff = h("b", {}, "Noch kein Betreff");
  let zeitgeber: number | undefined;
  const aktualisiere = () => {
    clearTimeout(zeitgeber);
    zeitgeber = window.setTimeout(async () => {
      vorschauBetreff.textContent = betreff.value.trim() || "Noch kein Betreff";
      const v = await api("mail", { aktion: "entwurf", betreff: betreff.value, text: inhalt.value }).catch(() => null);
      if (v?.html) vorschau.srcdoc = v.html;
    }, 400);
  };
  betreff.addEventListener("input", aktualisiere);
  inhalt.addEventListener("input", aktualisiere);
  aktualisiere();

  const senden = async (test: boolean, knopfEl: HTMLButtonElement) => {
    if (betreff.value.trim().length < 3 || inhalt.value.trim().length < 10) return toast("Betreff und Text ausfüllen.", true);
    if (!test) {
      const v = await api("mail", { aktion: "vorschau", gruppe }).catch((e) => (toast(e.message, true), null));
      if (!v) return;
      if (!(await bestaetigen("Rundmail senden?", `Geht an ${v.anzahl} ${v.anzahl === 1 ? "Person" : "Personen"}, z. B. ${v.beispiele.join(", ") || "—"}. Zurückholen lässt sie sich danach nicht.`, `An ${v.anzahl} senden`))) return;
    }
    aktion(knopfEl, () => api("mail", { aktion: "senden", gruppe, betreff: betreff.value, text: inhalt.value, test }), test ? undefined : neu);
  };

  fuege(
    ziel,
    k
      ? raster(
          "a-r4",
          kpi("Zugestellt", zahl(k.zugestellt), `${prozent(k.zugestellt, k.gesamt)} der letzten ${k.gesamt} Mails`),
          kpi("Geöffnet", zahl(k.geoeffnet), `${prozent(k.geoeffnet, k.zugestellt)} der zugestellten${k.geklickt ? `, ${k.geklickt} mit Klick` : ""}`),
          kpi("Probleme", zahl(k.probleme), k.probleme ? "zurückgewiesen, Spam oder verzögert" : "alles angekommen"),
          kpi(
            "Absender",
            r.domains.some((x: Daten) => x.status === "verified") ? "bereit" : "prüfen",
            r.domains.length ? r.domains.map((x: Daten) => `${x.name}: ${x.status === "verified" ? "bestätigt" : x.status}`).join(", ") : "keine eigene Domain, Versand über resend.dev",
          ),
        )
      : hinweisKachel(r),
    h(
      "div",
      { class: "a-mail-raster" },
      karte(
        "Neue Rundmail",
        h("div", { class: "a-feld" }, h("span", {}, "An"), pillen),
        feld("Betreff", betreff),
        feld("Text", inhalt, d.absender ? `Absender: ${d.absender}. Antworten gehen an ${d.testAn}.` : undefined),
        h(
          "div",
          { class: "a-leiste" },
          knopf("Test an mich", (ev) => senden(true, ev.currentTarget as HTMLButtonElement), "", "mail"),
          h("span", { class: "a-luecke" }),
          knopf("Senden …", (ev) => senden(false, ev.currentTarget as HTMLButtonElement), "a-p", "senden"),
        ),
      ),
      karte("So kommt sie an", h("div", { class: "a-mail-kopf" }, h("span", { class: "a-klein a-blass" }, "Beispiel: Anna"), vorschauBetreff), vorschau),
    ),
    r.ok
      ? karte(
          "Verlauf",
          tabelle(
            [
              { titel: "Betreff", wert: (m) => h("b", {}, m.betreff || "—"), suche: (m) => `${m.betreff} ${m.an}` },
              { titel: "An", wert: (m) => h("span", { class: "a-klein" }, m.an) },
              { titel: "Status", wert: (m) => mailStatus(m.status), suche: (m) => MAIL_STATUS[m.status]?.[0] ?? m.status },
              { titel: "Gesendet", wert: (m) => h("span", { class: "a-klein", title: zeit(m.zeit) }, relativ(m.zeit)) },
            ],
            r.letzte,
            {
              filter: { name: "Status", werte: [...new Set(r.letzte.map((m: Daten) => MAIL_STATUS[m.status]?.[0] ?? m.status))] as string[], feld: (m) => MAIL_STATUS[m.status]?.[0] ?? m.status },
              beiKlick: (m) => m.id && mailDetail(m.id),
              leerText: "Noch keine Mails verschickt.",
            },
          ),
        )
      : null,
    r.ok
      ? karte(
          "Einrichtung bei Resend",
          h(
            "div",
            { class: "a-wliste" },
            ...r.domains.map((x: Daten) => h("div", { class: "a-wzeile" }, h("span", { class: "a-wzeile-text" }, h("b", {}, x.name), x.region ? ` · ${x.region}` : ""), h("span", { class: "a-wzeile-meta" }, badge(x.status === "verified" ? "bestätigt" : x.status, x.status === "verified" ? "ok" : "warn")))),
            ...r.listen.map((x: Daten) => h("div", { class: "a-wzeile" }, h("span", { class: "a-wzeile-text" }, "Kontaktliste ", h("b", {}, x.name)), h("span", { class: "a-wzeile-meta" }))),
            !r.domains.length && !r.listen.length ? leer("Keine Domain und keine Kontaktliste angelegt.") : null,
          ),
        )
      : null,
  );
};

// ═════════════ Alarme ═════════════
// Eigene Regeln „Kennzahl Vergleich Schwelle“. Ausgelöste Alarme stehen in der
// Glocke; auf Wunsch kommt einmal je Auslösung eine Mail an MAIL_AN.

const VERGLEICH_TEXT: Record<string, string> = { ">": "größer als", ">=": "mindestens", "<": "kleiner als", "<=": "höchstens", "=": "genau" };

const alarmWert = (r: Daten) => (r.unbekannt ? "keine Daten" : `${zahl(r.wert)}${r.einheit ? ` ${r.einheit}` : ""}`);
const alarmStatus = (r: Daten) =>
  !r.aktiv ? badge("aus", "") : r.unbekannt ? badge("keine Daten", "warn") : r.ausgeloest ? badge("ausgelöst", r.stufe === "wichtig" ? "bad" : "warn") : badge("ok", "ok");

function alarmEditor(r: Daten | null, d: Daten, neu: () => void) {
  const name = eingabe({ class: "a-eingabe a-voll", value: r?.name ?? "", placeholder: "z. B. Viele offene Fehlerberichte", maxlength: 80 });
  const metrik = h("select", { class: "a-eingabe a-voll" }, d.metriken.map((m: Daten) => h("option", { value: m.id, selected: m.id === r?.metrik }, `${m.titel}${m.einheit ? ` (${m.einheit})` : ""}`))) as HTMLSelectElement;
  const vergleich = h("select", { class: "a-eingabe" }, d.vergleiche.map((v: string) => h("option", { value: v, selected: v === (r?.vergleich ?? ">=") }, VERGLEICH_TEXT[v] ?? v))) as HTMLSelectElement;
  const schwelle = eingabe({ class: "a-eingabe a-mittel", type: "number", step: "any", value: r ? String(r.schwelle) : "1" });
  const stufe = h(
    "select",
    { class: "a-eingabe" },
    h("option", { value: "wichtig", selected: r?.stufe !== "info" }, "Wichtig: roter Punkt an der Glocke"),
    h("option", { value: "info", selected: r?.stufe === "info" }, "Hinweis: nur in der Liste der Glocke"),
  ) as HTMLSelectElement;
  const mail = h("input", { type: "checkbox", checked: r ? Boolean(r.mail) : true }) as HTMLInputElement;
  const aktiv = h("input", { type: "checkbox", checked: r ? Boolean(r.aktiv) : true }) as HTMLInputElement;
  const vorschau = h("p", { class: "a-klein a-notiz" });
  const zeige = () => {
    const m = d.metriken.find((x: Daten) => x.id === metrik.value);
    vorschau.textContent = `Löst aus, wenn „${m?.titel ?? metrik.value}“ ${VERGLEICH_TEXT[vergleich.value]} ${schwelle.value || "?"}${m?.einheit ? ` ${m.einheit}` : ""} ist.`;
  };
  [metrik, vergleich, schwelle].forEach((e) => e.addEventListener("input", zeige));
  zeige();
  const speichern = knopf("Speichern", async (ev) => {
    const ok = await aktion(
      ev.currentTarget as HTMLButtonElement,
      () => api("alarme", { aktion: "speichern", regel: { id: r?.id, name: name.value, metrik: metrik.value, vergleich: vergleich.value, schwelle: schwelle.value, stufe: stufe.value, mail: mail.checked, aktiv: aktiv.checked } }),
      neu,
    );
    if (ok) zu();
  }, "a-p");
  const zu = dialogFenster(
    r ? "Alarm bearbeiten" : "Neuer Alarm",
    h(
      "div",
      { class: "a-stapel eng" },
      feld("Name", name),
      feld("Kennzahl", metrik),
      h("div", { class: "a-werkzeuge" }, feld("Bedingung", vergleich), feld("Schwelle", schwelle)),
      vorschau,
      feld("Stufe", stufe),
      h("label", { class: "a-werkzeuge" }, mail, h("span", {}, `Mail an ${d.empfaenger}, einmal je Auslösung`)),
      h("label", { class: "a-werkzeuge" }, aktiv, h("span", {}, "Regel ist eingeschaltet")),
      h("div", { class: "a-leiste" }, h("span", { class: "a-luecke" }), knopf("Abbrechen", () => zu()), speichern),
    ),
    { untertitel: "Geprüft wird beim Öffnen des Admins und im Hintergrund, wenn Anmeldungen, Fehlerberichte oder Lizenzprüfungen eingehen." },
  );
  name.focus();
}

export const alarme: Bereich = async (ziel, neu) => {
  const d = await api("alarme");
  const regeln: Daten[] = d.regeln;
  const aus = regeln.filter((r) => r.ausgeloest);
  const zeilenMenue = (r: Daten) =>
    h(
      "button",
      {
        class: "a-rund",
        type: "button",
        "aria-label": `${r.name}: Optionen`,
        onclick: (ev: Event) => {
          ev.stopPropagation();
          popupMenue(ev.currentTarget as HTMLElement, [
            { text: "Bearbeiten", icon: "einstellungen", aktion: () => alarmEditor(r, d, neu) },
            { text: r.aktiv ? "Ausschalten" : "Einschalten", icon: "glocke", aktion: () => void aktion(null, () => api("alarme", { aktion: "umschalten", id: r.id }), neu) },
            { text: "Test-Mail senden", icon: "mail", aus: !d.mailBereit, aktion: () => void aktion(null, () => api("alarme", { aktion: "test", id: r.id })) },
            "trenner",
            {
              text: "Löschen",
              icon: "x",
              gefahr: true,
              aktion: async () => {
                if (await bestaetigen("Alarm löschen?", `„${r.name}“ wird entfernt.`, "Löschen")) aktion(null, () => api("alarme", { aktion: "loeschen", id: r.id }), neu);
              },
            },
          ]);
        },
      },
      svg("M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z|M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z|M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", 16),
    );
  const vorhanden = new Set(regeln.map((r) => `${r.metrik}|${r.vergleich}|${r.schwelle}`));
  const vorlagen: Daten[] = d.vorlagen.filter((v: Daten) => !vorhanden.has(`${v.metrik}|${v.vergleich}|${v.schwelle}`));
  fuege(
    ziel,
    raster(
      "a-r3",
      kpi("Regeln", zahl(regeln.length), `${regeln.filter((r) => r.aktiv).length} eingeschaltet`),
      kpi("Ausgelöst", zahl(aus.length), aus.length ? aus.slice(0, 2).map((r) => r.name).join(", ") : "alles ruhig"),
      kpi("Mail an", d.empfaenger, d.mailBereit ? "über Resend, änderbar unter Einstellungen (MAIL_AN)" : "Resend-Schlüssel fehlt, Mails gehen noch nicht"),
    ),
    karteMitKopf(
      "Regeln",
      h(
        "div",
        { class: "a-werkzeuge" },
        knopf("Jetzt prüfen", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("alarme", { aktion: "pruefen" }), neu), "", "neu"),
        knopf("Neuer Alarm", () => alarmEditor(null, d, neu), "a-p", "plus"),
      ),
      tabelle(
        [
          { titel: "Status", wert: alarmStatus },
          { titel: "Name", wert: (r) => h("b", {}, r.name) },
          { titel: "Bedingung", wert: (r) => r.bedingung },
          { titel: "Jetzt", wert: alarmWert },
          { titel: "Mail", wert: (r) => (r.mail ? "ja" : "nein") },
          { titel: "Seit", wert: (r) => (r.ausgeloest && r.seit ? relativ(r.seit) : "") },
          { titel: "", wert: zeilenMenue },
        ],
        regeln,
        { beiKlick: (r) => alarmEditor(r, d, neu), leerText: "Noch keine Alarme. Leg einen an oder übernimm unten eine Vorlage." },
      ),
    ),
    vorlagen.length
      ? karte(
          "Vorlagen",
          h(
            "div",
            { class: "a-wliste" },
            vorlagen.map((v) =>
              h(
                "div",
                { class: "a-wzeile" },
                h("span", { class: "a-wzeile-text" }, h("b", {}, v.name), ` · ${v.bedingung}${v.mail ? " · mit Mail" : ""}`),
                h("span", { class: "a-wzeile-meta" }, knopf("Übernehmen", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("alarme", { aktion: "speichern", regel: v }), neu), "", "plus")),
              ),
            ),
          ),
        )
      : null,
    karte(
      "Verlauf",
      tabelle(
        [
          { titel: "Zeit", wert: (p) => zeit(p.zeit) },
          { titel: "Ereignis", wert: (p) => badge(p.aktion.replace(/^Alarm /, ""), /ausgelöst/.test(p.aktion) ? "bad" : /beendet/.test(p.aktion) ? "ok" : "") },
          { titel: "Details", wert: (p) => h("span", { class: "a-klein" }, p.details) },
          { titel: "Von", wert: (p) => (p.benutzer === "Alarm" ? "automatisch" : p.benutzer) },
        ],
        d.verlauf,
        { leerText: "Noch nichts passiert." },
      ),
    ),
  );
};

// ═════════════ Einstellungen ═════════════

/** Sync-Server: Status des R2-Bindings, Belegung oder Schritt-für-Schritt-Anleitung. */
function syncKarte(sync: Daten | null, d: Daten, neu: () => void) {
  const konto = (d.tresor?.einstellungen ?? []).find((x: Daten) => x.name === "CF_ACCOUNT_ID")?.wert;
  const cf = (pfad: string) => (konto ? `https://dash.cloudflare.com/${konto}/${pfad}` : "https://dash.cloudflare.com/");
  const kopf = h(
    "div",
    { class: "a-werkzeuge" },
    badge(sync?.eingerichtet ? "verbunden" : "nicht eingerichtet", sync?.eingerichtet ? "ok" : "warn"),
    knopf("Erneut prüfen", neu, "", "neu"),
  );
  if (sync?.eingerichtet) {
    const liste: Daten[] = sync.lizenzen ?? [];
    const belegt = liste.reduce((s2, x) => s2 + (x.belegt || 0), 0);
    return karteMitKopf(
      "Sync-Server (R2)",
      kopf,
      h("p", { class: "a-mb" }, `Der Bucket ist gebunden. ${mb(belegt)} belegt von ${liste.length} ${liste.length === 1 ? "Lizenz" : "Lizenzen"}, Grenze je Lizenz ${mb(sync.grenze)}.`),
      h("p", { class: "a-klein a-blass" }, "Die Daten sind Ende-zu-Ende verschlüsselt. Speicher je Lizenz siehst und leerst du im Detail unter „Lizenzen“. Einen Alarm für volle Speicher legst du unter „Alarme“ an."),
    );
  }
  const schritt = (titel: string, ...inhalt: (Node | string)[]) => h("li", {}, h("b", {}, titel), h("div", { class: "a-klein a-leise" }, ...inhalt));
  const code = (t: string) => h("code", {}, t);
  return karteMitKopf(
    "Sync-Server (R2)",
    kopf,
    h("p", { class: "a-mb" }, "Für den Sync über den cockpit-Server (Pro und Alpha) braucht die Website einen R2-Bucket mit dem Namen ", code("SYNC"), ". Bis dahin antwortet der Server mit 503, der Ordner-Sync in der App läuft trotzdem."),
    h(
      "ol",
      { class: "a-schritte" },
      schritt("Bucket anlegen", "Cloudflare → R2 Object Storage → „Create bucket“. Name ", code("cockpit-sync"), ", Standort „Automatic“, Klasse „Standard“. Öffentlichen Zugriff aus lassen. R2 will beim ersten Mal eine Zahlungsmethode, das Gratis-Kontingent reicht für die Alpha."),
      schritt("An die Website binden", "Workers & Pages → cockpit-website → Settings → Bindings → Add → R2 bucket. Variable name ", code("SYNC"), ", Bucket ", code("cockpit-sync"), ". Für Production und Preview."),
      schritt("Neu deployen", "Deployments → beim neuesten Eintrag „Retry deployment“. Bindings gelten erst ab dem nächsten Deploy."),
      schritt("Prüfen", "Hier auf „Erneut prüfen“ klicken. Steht oben „verbunden“, ist alles fertig."),
    ),
    h(
      "div",
      { class: "a-werkzeuge a-mt" },
      h("a", { class: "a-knopf a-p", href: cf("r2/overview"), target: "_blank", rel: "noopener" }, svg(ICONS.extern, 15), "R2 in Cloudflare öffnen"),
      h("a", { class: "a-knopf", href: cf("workers-and-pages"), target: "_blank", rel: "noopener" }, svg(ICONS.extern, 15), "Workers & Pages öffnen"),
    ),
  );
}

export const einstellungen: Bereich = async (ziel, neu) => {
  const [d, sync] = await Promise.all([api("einstellungen"), api("sync").catch(() => null)]);
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
      h("p", { class: "a-klein a-fussnote" }, `Angemeldet als ${d.benutzer}.`),
      !s.master
        ? h(
            "div",
            { class: "a-hinweis a-mt" },
            s.masterZuKurz
              ? "Das Secret ADMIN_MASTER_KEY ist gesetzt, aber kürzer als 16 Zeichen. Im Pages-Projekt einen längeren Wert eintragen (z. B. 32 zufällige Zeichen aus einem Passwortmanager) und die Bereitstellung neu starten. Bis dahin gelten die Umgebungsvariablen."
              : "Um Schlüssel hier zu speichern, im Pages-Projekt das Secret ADMIN_MASTER_KEY anlegen (mindestens 16 zufällige Zeichen, z. B. aus einem Passwortmanager) und die Bereitstellung neu starten. Bis dahin gelten die Umgebungsvariablen.",
          )
        : null,
    ),
    syncKarte(sync, d, neu),
    karte(
      "API-Schlüssel",
      h(
        "div",
        { class: "a-stapel" },
        t.geheim.map((g: Daten) => {
          const e = eingabe({ class: "a-eingabe a-wachsen", type: "password", placeholder: g.gesetzt ? "Neuen Schlüssel eingeben, um zu tauschen" : "Schlüssel eingeben", autocomplete: "off" });
          return h(
            "div",
            { class: "a-frage" },
            h(
              "div",
              { class: "a-frage-kopf" },
              h("b", { class: "a-luecke" }, g.titel),
              g.defekt ? badge("nicht lesbar", "bad") : g.gesetzt ? badge(`${g.anzeige} · ${g.quelle === "dashboard" ? "Dashboard" : "Umgebung"}`, "ok") : badge("fehlt", "warn"),
            ),
            h("div", { class: "a-klein a-blass" }, g.hilfe),
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
        { class: "a-stapel eng" },
        t.einstellungen.map((x: Daten) => {
          const e = eingabe({ class: "a-eingabe a-wachsen", value: x.wert || "" });
          return feld(
            x.titel + (x.quelle === "umgebung" ? " (aus Umgebung)" : ""),
            h("div", { class: "a-werkzeuge" }, e, knopf("Speichern", (ev) => aktion(ev.currentTarget as HTMLButtonElement, () => api("einstellungen", { aktion: "einstellung", name: x.name, wert: e.value }), neu))),
            x.hilfe,
          );
        }),
      ),
      h("p", { class: "a-klein a-fussnote" }, `Alpha-Plätze: ${d.plaetze}. Ändern kannst du sie im Bereich „Alpha“.`),
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
