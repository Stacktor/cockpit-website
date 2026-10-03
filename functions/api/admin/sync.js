/**
 * /api/admin/sync — R2-Bucket des Sync-Servers verwalten (nur Admin).
 *   GET               Überblick: Belegung gesamt, je Lizenz (Sync und Sicherungen
 *                     getrennt), Geräte, Sicherungsstände, letzte Aktivität.
 *   GET ?lizenz=<id>  Belegung einer Lizenz (wie bisher, für die Lizenz-Schublade).
 *   POST { lizenz, aktion }
 *        aktion "leeren"             alles dieser Lizenz löschen
 *               "sync-leeren"        nur Sync-Pakete (Sicherungen bleiben)
 *               "sicherungen-leeren" nur Cloud-Sicherungen
 *               "geraet-entfernen"   { geraet } Pakete eines Geräts löschen
 *        aktion "inaktive-leeren" { tage } (ohne lizenz) alles von Lizenzen
 *                                  löschen, die seit `tage` nichts mehr hochgeladen haben
 * Inhalte sind Ende-zu-Ende verschlüsselt; hier gibt es nur Namen, Größen und Zeiten.
 */
import { json } from "../../../lib/admin/zugang.js";
import { protokolliere } from "../../../lib/admin/protokoll.js";
import { alleObjekte, allesLoeschen, belegt, bereichVon, GESAMT_MAX, praefixFuer, SICHERUNG_MAX } from "../../../lib/sync.js";

const ID = /^[0-9A-Za-z_-]{1,40}$/;
const GERAET = /^[0-9A-Za-z_.-]{1,80}$/;
/** R2-Gratiskontingent für gespeicherte Daten (Cloudflare, Stand 2026). */
export const R2_FREI = 10 * 1024 * 1024 * 1024;

const neuer = (a, b) => (!a || (b && b > a) ? b : a);

/** Wertet die Objektliste des ganzen Buckets aus (rein, testbar). */
export function auswerten(objekte) {
  const je = new Map();
  const leer = () => ({ belegt: 0, dateien: 0 });
  for (const o of objekte) {
    const teile = o.key.split("/");
    if (teile[0] !== "l" || !teile[1]) continue;
    const lizenz = teile[1];
    const rest = teile.slice(2).join("/");
    const zeit = o.uploaded ? new Date(o.uploaded).toISOString() : null;
    const l =
      je.get(lizenz) ||
      { lizenz, belegt: 0, dateien: 0, zuletzt: null, sync: leer(), sicherungen: { ...leer(), staende: 0 }, geraete: new Map(), staende: new Set() };
    const groesse = o.size || 0;
    l.belegt += groesse;
    l.dateien += 1;
    l.zuletzt = neuer(l.zuletzt, zeit);
    if (bereichVon(rest) === "sicherungen") {
      l.sicherungen.belegt += groesse;
      l.sicherungen.dateien += 1;
      // sicherungen/<gerät>/<stand>/…
      const [, g, stand] = rest.split("/");
      if (g && stand) l.staende.add(`${g}/${stand}`);
    } else {
      l.sync.belegt += groesse;
      l.sync.dateien += 1;
      // geraete/<gerät>/<seq>.paket
      const [ordner, g] = rest.split("/");
      if (ordner === "geraete" && g) {
        const ge = l.geraete.get(g) || { id: g, belegt: 0, dateien: 0, zuletzt: null };
        ge.belegt += groesse;
        ge.dateien += 1;
        ge.zuletzt = neuer(ge.zuletzt, zeit);
        l.geraete.set(g, ge);
      }
    }
    je.set(lizenz, l);
  }
  const lizenzen = [...je.values()]
    .map(({ geraete, staende, ...l }) => ({
      ...l,
      sicherungen: { ...l.sicherungen, staende: staende.size },
      geraete: [...geraete.values()].sort((a, b) => String(b.zuletzt).localeCompare(String(a.zuletzt))),
    }))
    .sort((a, b) => b.belegt - a.belegt);
  const summe = (f) => lizenzen.reduce((s, l) => s + f(l), 0);
  return {
    gesamt: {
      belegt: summe((l) => l.belegt),
      dateien: summe((l) => l.dateien),
      sync: summe((l) => l.sync.belegt),
      sicherungen: summe((l) => l.sicherungen.belegt),
      geraete: summe((l) => l.geraete.length),
    },
    lizenzen,
  };
}

export async function onRequestGet({ request, data }) {
  const env = data.env;
  if (!env.SYNC) return json(200, { eingerichtet: false, lizenzen: [] });
  const id = new URL(request.url).searchParams.get("lizenz");
  if (id) {
    if (!ID.test(id)) return json(400, { fehler: "Ungültige Lizenz-ID." });
    return json(200, { eingerichtet: true, grenze: GESAMT_MAX, ...(await belegt(env.SYNC, praefixFuer(id))) });
  }
  const a = auswerten(await alleObjekte(env.SYNC, "l/"));
  return json(200, { eingerichtet: true, grenze: GESAMT_MAX, grenzeSicherungen: SICHERUNG_MAX, frei: R2_FREI, ...a });
}

export async function onRequestPost({ request, data }) {
  const env = data.env;
  const d = await request.json().catch(() => ({}));
  if (!env.SYNC) return json(503, { fehler: "Kein R2-Bucket `SYNC` gebunden." });

  if (d.aktion === "inaktive-leeren") {
    const tage = Math.round(Number(d.tage));
    if (!(tage >= 30 && tage <= 3650)) return json(400, { fehler: "Bitte 30 bis 3650 Tage angeben." });
    const grenze = new Date(Date.now() - tage * 864e5).toISOString();
    const { lizenzen } = auswerten(await alleObjekte(env.SYNC, "l/"));
    const alt = lizenzen.filter((l) => l.zuletzt && l.zuletzt < grenze);
    let geloescht = 0;
    for (const l of alt) geloescht += await allesLoeschen(env.SYNC, praefixFuer(l.lizenz));
    await protokolliere(env, data.benutzer, "Speicher: inaktive Lizenzen geleert", `${alt.length} Lizenzen, ${geloescht} Dateien (älter als ${tage} Tage)`);
    return json(200, { ok: true, lizenzen: alt.length, geloescht, meldung: `${alt.length} Lizenzen geleert, ${geloescht} Dateien gelöscht.` });
  }

  if (!ID.test(String(d.lizenz || ""))) return json(400, { fehler: "Ungültige Lizenz-ID." });
  const ns = praefixFuer(d.lizenz);
  let geloescht;
  let was;
  if (d.aktion === "leeren") {
    geloescht = await allesLoeschen(env.SYNC, ns);
    was = "alles";
  } else if (d.aktion === "sync-leeren") {
    geloescht = await allesLoeschen(env.SYNC, ns, "sync");
    was = "Sync-Pakete";
  } else if (d.aktion === "sicherungen-leeren") {
    geloescht = await allesLoeschen(env.SYNC, ns, "sicherungen");
    was = "Cloud-Sicherungen";
  } else if (d.aktion === "geraet-entfernen") {
    if (!GERAET.test(String(d.geraet || ""))) return json(400, { fehler: "Ungültige Geräte-ID." });
    geloescht = await allesLoeschen(env.SYNC, `${ns}geraete/${d.geraet}/`);
    was = `Gerät ${d.geraet}`;
  } else {
    return json(400, { fehler: "Unbekannte Aktion." });
  }
  await protokolliere(env, data.benutzer, "Speicher geleert", `Lizenz ${d.lizenz}: ${was}, ${geloescht} Dateien`);
  return json(200, { ok: true, geloescht, meldung: `${geloescht} ${geloescht === 1 ? "Datei" : "Dateien"} gelöscht.` });
}
