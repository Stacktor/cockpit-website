/**
 * cockpit-Sync-Server (Pro und Alpha): speichert die verschlüsselten Pakete
 * der App in R2 (Binding `SYNC`). Lesen kann sie hier niemand: Die App
 * verschlüsselt mit einer Passphrase, die das Gerät nie verlässt.
 *
 * - Anmeldung: Lizenzschlüssel + Instanz-ID als Header (`X-Cockpit-Lizenz`,
 *   `X-Cockpit-Instanz`), geprüft gegen Lemon Squeezy (gecacht, siehe
 *   app-lizenz.js). Kostenlos hat keinen Schlüssel, also gilt jede gültige
 *   Lizenz (Pro oder Alpha).
 * - Ablage: je Lizenz ein Namensraum `l/<license_key.id>/…`; die App nutzt
 *   relative Namen wie `geraete/<id>/0000000007.paket`.
 * - Grenzen: 11 MB je Datei, 200 MB je Lizenz, 1200 Anfragen je Stunde.
 */
import { imKontingent, json, pruefeLizenz } from "./app-lizenz.js";

export const DATEI_MAX = 11 * 1024 * 1024;
export const GESAMT_MAX = 200 * 1024 * 1024;
const ANFRAGEN_JE_STUNDE = 1200;
const NAME = /^[A-Za-z0-9._/-]{1,200}$/;

export function gueltigerName(name) {
  return (
    typeof name === "string" &&
    NAME.test(name) &&
    !name.startsWith("/") &&
    name.split("/").every((t) => t && t !== "." && t !== "..")
  );
}

export const praefixFuer = (lizenzId) => `l/${lizenzId}/`;

/**
 * Prüft Lizenz, Kontingent und Speicher-Binding.
 * @returns {Promise<{ok: true, ns: string, lizenz: object} | {ok: false, antwort: Response}>}
 */
export async function anmelden(request, env) {
  if (!env.SYNC)
    return { ok: false, antwort: json(503, { ok: false, fehler: "Der Sync-Server ist noch nicht eingerichtet." }) };
  const schluessel = request.headers.get("x-cockpit-lizenz");
  const instanz = request.headers.get("x-cockpit-instanz");
  const p = await pruefeLizenz(env, schluessel, instanz, { nurAlpha: false });
  if (!p.ok) {
    const fehler = p.status === 403 ? "Für den Sync-Server braucht es eine aktive Pro- oder Alpha-Lizenz." : p.fehler;
    return { ok: false, antwort: json(p.status, { ok: false, fehler }) };
  }
  if (!(await imKontingent(env, p.lizenz.id, "sync", ANFRAGEN_JE_STUNDE)))
    return { ok: false, antwort: json(429, { ok: false, fehler: "Zu viele Sync-Anfragen. In einer Stunde geht es weiter." }) };
  return { ok: true, ns: praefixFuer(p.lizenz.id), lizenz: p.lizenz };
}

/** Alle Objekte unter einem Präfix (R2 liefert seitenweise). */
export async function alleObjekte(bucket, prefix) {
  const aus = [];
  let cursor;
  do {
    const seite = await bucket.list({ prefix, cursor, limit: 1000 });
    aus.push(...seite.objects);
    cursor = seite.truncated ? seite.cursor : undefined;
  } while (cursor);
  return aus;
}

export async function belegt(bucket, ns) {
  const objekte = await alleObjekte(bucket, ns);
  return { belegt: objekte.reduce((s, o) => s + (o.size || 0), 0), dateien: objekte.length };
}

/** Name aus der Anfrage (`?name=`), geprüft. */
export function nameAus(request) {
  const name = new URL(request.url).searchParams.get("name");
  return gueltigerName(name) ? name : null;
}

export async function allesLoeschen(bucket, ns) {
  const objekte = await alleObjekte(bucket, ns);
  for (let i = 0; i < objekte.length; i += 1000) {
    await bucket.delete(objekte.slice(i, i + 1000).map((o) => o.key));
  }
  return objekte.length;
}
