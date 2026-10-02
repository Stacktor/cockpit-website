/**
 * Tests der Cloudflare-Functions ohne Cloudflare: KV, Lemon Squeezy, Resend und
 * GitHub werden simuliert. Aufruf: npm run test:api
 */
import assert from "node:assert/strict";

class KV {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; }
  async put(k, v) { this.m.set(k, v); }
  async list({ prefix }) { return { keys: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }; }
}

// ───────────── App-API (Umfragen, Antworten, Fehlerberichte) ─────────────
{
const W = new URL("../functions/api/app/", import.meta.url).href;
const { onRequestPost: umfragen } = await import(W + "umfragen.js");
const { onRequestPost: antwort } = await import(W + "antwort.js");
const { onRequestPost: fehler } = await import(W + "fehler.js");
const { STANDARD_UMFRAGEN } = await import(new URL("../lib/umfragen.js", import.meta.url).href);


let lsAufrufe = 0; const mails = [];
const LIZENZEN = {
  "ALPHA-1": { valid: true, license_key: { id: 111 }, meta: { variant_id: 9, variant_name: "Bewerbungs-Cockpit Alpha", customer_email: "anna@example.org", customer_name: "Anna" } },
  "PRO-1": { valid: true, license_key: { id: 222 }, meta: { variant_id: 7, variant_name: "Pro", customer_email: "bob@example.org" } },
};
globalThis.fetch = async (u, o) => {
  if (String(u).includes("lemonsqueezy")) { lsAufrufe++; const k = new URLSearchParams(o.body).get("license_key"); return new Response(JSON.stringify(LIZENZEN[k] ?? { valid: false, error: "license_key not found" })); }
  if (String(u).includes("resend")) { mails.push(JSON.parse(o.body)); return new Response("{}"); }
  throw new Error("unerwartet " + u);
};
const env = { ALPHA: new KV(), RESEND_API_KEY: "re_x" };
const req = (b) => ({ request: new Request("https://x", { method: "POST", body: JSON.stringify(b) }), env });
const call = async (fn, b) => { const r = await fn(req(b)); return [r.status, await r.json()]; };
const alpha = { schluessel: "ALPHA-1", instanz: "inst-1" };

// Umfragen: Standard-Fragebögen, noch nichts beantwortet
let [st, d] = await call(umfragen, alpha);
assert.equal(st, 200); assert.deepEqual(d.umfragen.map(u => [u.id, u.beantwortet]), [["puls-tag3", false], ["alpha-gross", false]]);
// Cache: zweiter Abruf ohne neuen LS-Aufruf
await call(umfragen, alpha); assert.equal(lsAufrufe, 1);
// Nicht-Alpha und ungültig
[st, d] = await call(umfragen, { schluessel: "PRO-1", instanz: "i" }); assert.equal(st, 403); assert.match(d.fehler, /nur in der Alpha/);
[st, d] = await call(umfragen, { schluessel: "FALSCH", instanz: "i" }); assert.equal(st, 403);
[st, d] = await call(umfragen, { instanz: "i" }); assert.equal(st, 400);

// Antwort: Pflichtfelder fehlen
[st, d] = await call(antwort, { ...alpha, umfrage: "puls-tag3", antworten: { einstieg: 4 } });
assert.equal(st, 422); assert.ok(d.felder.includes("nps"));
// ungültige Werte
[st, d] = await call(antwort, { ...alpha, umfrage: "puls-tag3", antworten: { einstieg: 9, bewerbung: "Ja", funktioniert: "Ja", nps: 8 } });
assert.equal(st, 422); assert.deepEqual(d.felder, ["einstieg"]);
// gültig
const puls = { einstieg: 4, bewerbung: "Ja", funktioniert: "Kleinere Probleme", nps: 8, ueberrascht: "  Schnell!  " };
[st, d] = await call(antwort, { ...alpha, umfrage: "puls-tag3", antworten: puls, version: "0.1.0", system: "windows" });
assert.equal(st, 200); assert.equal(d.aktualisiert, false);
const gespeichert = JSON.parse(await env.ALPHA.get("survey:resp:puls-tag3:111"));
assert.equal(gespeichert.email, "anna@example.org"); assert.equal(gespeichert.antworten.ueberrascht, "Schnell!");
assert.ok(!("schluessel" in gespeichert)); assert.ok(!JSON.stringify(gespeichert).includes("ALPHA-1"));
[st, d] = await call(umfragen, alpha); assert.equal(d.umfragen[0].beantwortet, true);
[st, d] = await call(antwort, { ...alpha, umfrage: "puls-tag3", antworten: puls }); assert.equal(d.aktualisiert, true);
[st, d] = await call(antwort, { ...alpha, umfrage: "gibtsnicht", antworten: {} }); assert.equal(st, 404);

// Großer Fragebogen inkl. Matrix
const gross = Object.fromEntries(STANDARD_UMFRAGEN[1].fragen.filter(f => f.pflicht).map(f => [f.id,
  f.typ === "einfach" ? f.optionen[0] : f.typ === "mehrfach" ? [f.optionen[0]] : f.typ === "skala" ? 3 : f.typ === "nps" ? 9 : f.typ === "euro" ? 30 : "x"]));
gross.hilfreich = { Pipeline: 5, "Auto-Modus": "nicht genutzt", Unbekannt: 3, Inbox: 9 };
[st, d] = await call(antwort, { ...alpha, umfrage: "alpha-gross", antworten: gross });
assert.equal(st, 200, JSON.stringify(d));
const g = JSON.parse(await env.ALPHA.get("survey:resp:alpha-gross:111"));
assert.deepEqual(g.antworten.hilfreich, { Pipeline: 5, "Auto-Modus": "nicht genutzt" });

// Fehler melden
[st, d] = await call(fehler, { ...alpha, beschreibung: "x" }); assert.equal(st, 422);
[st, d] = await call(fehler, { ...alpha, beschreibung: "Absturz beim Export", protokoll: "v0.1.0 windows\nfehler", version: "0.1.0", system: "windows" });
assert.equal(st, 200);
const bugs = [...env.ALPHA.m.keys()].filter(k => k.startsWith("bug:")); assert.equal(bugs.length, 1);
assert.equal(mails.at(-1).reply_to, "anna@example.org");
// Kontingent Fehlerberichte: 10/h
for (let i = 0; i < 9; i++) await call(fehler, { ...alpha, beschreibung: "Noch ein Fehler " + i });
[st, d] = await call(fehler, { ...alpha, beschreibung: "Elfter Fehler" }); assert.equal(st, 429);

// Ohne Lizenz: anonym angenommen, freiwillige E-Mail übernommen, IP nie gespeichert
{
  const r = await fehler({ request: new Request("https://x", { method: "POST", headers: { "cf-connecting-ip": "203.0.113.7" }, body: JSON.stringify({ beschreibung: "Suche hängt", kontakt: "gast@example.org", version: "0.1.0" }) }), env });
  assert.equal(r.status, 200);
  const anon = [...env.ALPHA.m.entries()].filter(([k]) => k.startsWith("bug:") && k.includes(":anonym-"));
  assert.equal(anon.length, 1);
  const b = JSON.parse(anon[0][1]);
  assert.equal(b.quelle, "anonym"); assert.equal(b.email, "gast@example.org"); assert.equal(b.lizenzId, null);
  assert.ok(![...env.ALPHA.m.keys(), ...env.ALPHA.m.values()].some((x) => String(x).includes("203.0.113.7")), "IP darf nicht gespeichert werden");
  assert.equal(mails.at(-1).reply_to, "gast@example.org");
  // Ungültige E-Mail wird verworfen, ungültige Lizenz → anonym statt Fehler
  const r2 = await fehler({ request: new Request("https://x", { method: "POST", headers: { "cf-connecting-ip": "203.0.113.7" }, body: JSON.stringify({ schluessel: "GIBTSNICHT", instanz: "i", beschreibung: "Noch was kaputt", kontakt: "kein-mail" }) }), env });
  assert.equal(r2.status, 200);
  // Pro-Lizenz wird zugeordnet (Fehlerberichte gibt es für alle)
  const r3 = await fehler({ request: new Request("https://x", { method: "POST", body: JSON.stringify({ schluessel: "PRO-1", instanz: "i", beschreibung: "Pro-Fehler" }) }), env });
  assert.equal(r3.status, 200);
  assert.ok([...env.ALPHA.m.keys()].some((k) => k.startsWith("bug:") && k.endsWith(":222")));
  // Kontingent anonym: 5/h je Absender
  for (let i = 0; i < 3; i++) await fehler({ request: new Request("https://x", { method: "POST", headers: { "cf-connecting-ip": "203.0.113.7" }, body: JSON.stringify({ beschreibung: "Spam " + i }) }), env });
  const r4 = await fehler({ request: new Request("https://x", { method: "POST", headers: { "cf-connecting-ip": "203.0.113.7" }, body: JSON.stringify({ beschreibung: "Spam zu viel" }) }), env });
  assert.equal(r4.status, 429);
}

// Admin-definierte Umfrage ersetzt die Standards
env.ALPHA.m.set("survey:def:eigene", JSON.stringify({ id: "eigene", titel: "Test", aktiv: true, ausloeser: { art: "sofort" }, fragen: [{ id: "a", typ: "text", text: "?", pflicht: false }] }));
[st, d] = await call(umfragen, alpha); assert.deepEqual(d.umfragen.map(u => u.id), ["eigene"]);
console.log("App-API: alle Prüfungen ok · LS-Aufrufe:", lsAufrufe);

}

// ───────────── Alpha-Anmeldung ─────────────
{
  const { onRequestPost: anmelden, onRequestGet: status } = await import(new URL("../functions/api/alpha.js", import.meta.url).href);
  const mails2 = [];
  globalThis.fetch = async (u, o) => {
    if (String(u).includes("resend.com/audiences")) return new Response(JSON.stringify({ data: [{ id: "aud" }] }));
    if (String(u).includes("resend")) { if (o?.body) mails2.push(JSON.parse(o.body)); return new Response("{}"); }
    throw new Error("unerwartet " + u);
  };
  const env2 = { ALPHA: new KV(), RESEND_API_KEY: "re_x", ALPHA_PLAETZE: "2" };
  const post = async (b) => { const r = await anmelden({ request: new Request("https://x/api/alpha", { method: "POST", body: JSON.stringify(b) }), env: env2 }); return [r.status, await r.json()]; };
  const basis = { name: "Anna Muster", mail: "anna@example.org", os: "windows", grund: "Ich verliere den Überblick bei vielen Bewerbungen.",
    situation: "Arbeitsuchend", bewerbungenMonat: "6–15", werkzeuge: ["Excel / Tabelle", "Hack", "Excel / Tabelle"], ki: "Ich nutze lokale Modelle",
    technik: "Klappt mit Anleitung", quelle: "Reddit", feedback: ["Umfragen in der App"], utm: { utm_source: "reddit", evil: "x" }, referrer: "https://reddit.com/r/x" };

  let [st, d] = await post(basis);
  assert.equal(st, 200); assert.equal(d.warteliste, false); assert.equal(d.platz, 1);
  const e = JSON.parse(await env2.ALPHA.get("alpha:anna@example.org"));
  assert.equal(e.status, "neu"); assert.deepEqual(e.werkzeuge, ["Excel / Tabelle"]); assert.equal(e.herkunft, "Reddit");
  assert.deepEqual(e.utm, { utm_source: "reddit" }); assert.equal(e.ki, "Ich nutze lokale Modelle");
  assert.ok(mails2.some((m) => m.subject.startsWith("Deine Anmeldung")));
  assert.ok(!mails2.some((m) => /umfrage\.html/.test(m.html || "")), "kein Link auf die alte Web-Umfrage");

  // Doppelt
  [st, d] = await post(basis); assert.equal(d.doppelt, true);
  // Ungültig
  [st, d] = await post({ ...basis, mail: "kaputt" }); assert.equal(st, 422);
  [st, d] = await post({ ...basis, mail: "b@example.org", os: "amiga" }); assert.equal(st, 422);
  // Honigtopf: freundlich, aber nichts gespeichert
  [st, d] = await post({ ...basis, mail: "bot@example.org", website: "spam" }); assert.equal(st, 200);
  assert.equal(await env2.ALPHA.get("alpha:bot@example.org"), null);
  // macOS → Warteliste, belegt keinen Platz
  [st, d] = await post({ ...basis, mail: "mac@example.org", os: "macos" });
  assert.equal(d.warteliste, true);
  assert.equal(JSON.parse(await env2.ALPHA.get("alpha:mac@example.org")).status, "warteliste");
  assert.ok(mails2.some((m) => m.subject.includes("Warteliste") && /macOS/.test(m.html)));
  // Zweiter Platz, dann voll → Warteliste
  [st, d] = await post({ ...basis, mail: "zwei@example.org" }); assert.equal(d.warteliste, false);
  [st, d] = await post({ ...basis, mail: "drei@example.org" }); assert.equal(d.warteliste, true);
  // Status: Plätze aus Env, Admin-Einstellung hat Vorrang
  let r = await status({ env: env2 }); let s = await r.json();
  assert.deepEqual(s, { plaetze: 2, belegt: 2, frei: 0 });
  await env2.ALPHA.put("config:alpha", JSON.stringify({ plaetze: 50 }));
  s = await (await status({ env: env2 })).json(); assert.equal(s.frei, 48);
  s = await (await status({ env: {} })).json(); assert.equal(s.plaetze, 50);
  console.log("Alpha-Anmeldung: alle Prüfungen ok");
}

// ───────────── Web-Umfrage beendet, Versionsabfrage ─────────────
{
  const { onRequestPost: webUmfrage } = await import(new URL("../functions/api/umfrage.js", import.meta.url).href);
  const r = await webUmfrage();
  assert.equal(r.status, 410);

  const { onRequestGet: version } = await import(new URL("../functions/api/version.js", import.meta.url).href);
  const req = { request: new Request("https://cockpit.mesco.cc/api/version"), waitUntil() {} };
  globalThis.fetch = async () => new Response("Not Found", { status: 404 });
  let v = await (await version(req)).json(); assert.equal(v.version, null);
  globalThis.fetch = async () => new Response(JSON.stringify({ tag_name: "v0.1.0", published_at: "2026-10-01T10:00:00Z", assets: [{ name: "cockpit-windows-setup.exe" }] }));
  v = await (await version(req)).json(); assert.equal(v.version, "v0.1.0"); assert.deepEqual(v.dateien, ["cockpit-windows-setup.exe"]);
  globalThis.fetch = async () => { throw new Error("offline"); };
  v = await (await version(req)).json(); assert.equal(v.version, null);
  console.log("Umfrage-Ende und Versionsabfrage: ok");
}
