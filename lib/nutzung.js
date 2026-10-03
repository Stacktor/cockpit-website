/**
 * Anonyme Nutzungsstatistik der App: Prüfung der Meldungen und Auswertung.
 *
 * Die App schickt einmal am Tag die Zähler abgeschlossener Tage, je Tag
 * `{ funktionsname: anzahl }`, dazu App-Version und Betriebssystem. Keine
 * Lizenz, keine Geräte-ID, keine Inhalte. Gespeichert werden nur Tagessummen
 * unter `nutzung:<tag>` in KV.
 */
export const NAME = /^[a-z0-9_]{1,40}$/;
const TAG = /^\d{4}-\d{2}-\d{2}$/;
export const TTL = 400 * 86400;

/** Prüft eine Meldung; liefert die sauberen Tage oder einen Fehlertext. */
export function pruefeMeldung(d, jetzt = new Date()) {
  if (!d || typeof d !== "object" || typeof d.tage !== "object" || !d.tage) return { fehler: "Keine Tage." };
  const heute = jetzt.toISOString().slice(0, 10);
  const frueheste = new Date(jetzt.getTime() - 31 * 864e5).toISOString().slice(0, 10);
  const morgen = new Date(jetzt.getTime() + 864e5).toISOString().slice(0, 10);
  const tage = [];
  for (const [tag, werte] of Object.entries(d.tage).slice(0, 14)) {
    if (!TAG.test(tag) || tag < frueheste || tag > morgen || !werte || typeof werte !== "object") continue;
    const sauber = {};
    for (const [name, anzahl] of Object.entries(werte).slice(0, 80)) {
      const n = Math.floor(Number(anzahl));
      if (NAME.test(name) && n > 0) sauber[name] = Math.min(n, 5000);
    }
    if (Object.keys(sauber).length) tage.push([tag, sauber]);
  }
  if (!tage.length) return { fehler: "Keine gültigen Tage." };
  return {
    tage,
    heute,
    version: String(d.version ?? "").replace(/[^0-9a-z.+-]/gi, "").slice(0, 20) || "unbekannt",
    system: ["windows", "linux", "macos", "ios", "android"].includes(String(d.system)) ? String(d.system) : "andere",
  };
}

/** Addiert eine Tagesmeldung auf den gespeicherten Tagesstand. */
export function addiere(stand, werte, version, system) {
  const s = stand && typeof stand === "object" ? stand : {};
  const aus = {
    berichte: (Number(s.berichte) || 0) + 1,
    funktionen: { ...(s.funktionen || {}) },
    versionen: { ...(s.versionen || {}) },
    systeme: { ...(s.systeme || {}) },
  };
  for (const [name, n] of Object.entries(werte)) aus.funktionen[name] = (aus.funktionen[name] || 0) + n;
  aus.versionen[version] = (aus.versionen[version] || 0) + 1;
  aus.systeme[system] = (aus.systeme[system] || 0) + 1;
  return aus;
}

/** Auswertung über mehrere Tage (für das Admin). `tage`: [[tag, stand|null], …] alt → neu. */
export function auswerten(tage) {
  const summe = (feld) => {
    const m = {};
    for (const [, s] of tage) for (const [k, v] of Object.entries(s?.[feld] || {})) m[k] = (m[k] || 0) + v;
    return Object.entries(m)
      .map(([name, anzahl]) => ({ name, anzahl }))
      .sort((a, b) => b.anzahl - a.anzahl);
  };
  const funktionen = summe("funktionen");
  const proTag = tage.map(([tag, s]) => ({
    tag,
    berichte: Number(s?.berichte) || 0,
    aufrufe: Object.values(s?.funktionen || {}).reduce((a, b) => a + b, 0),
  }));
  const berichte = proTag.reduce((a, t) => a + t.berichte, 0);
  const mitDaten = proTag.filter((t) => t.berichte > 0).length;
  return {
    proTag,
    berichte,
    schnittGeraete: mitDaten ? Math.round((berichte / mitDaten) * 10) / 10 : 0,
    ansichten: funktionen.filter((f) => f.name.startsWith("ansicht_")).map((f) => ({ ...f, name: f.name.slice(8) })),
    aktionen: funktionen.filter((f) => !f.name.startsWith("ansicht_")),
    versionen: summe("versionen"),
    systeme: summe("systeme"),
  };
}
