/**
 * Tests der Admin-API ohne Cloudflare (KV, Lemon Squeezy, Resend simuliert).
 * Aufruf: node tests/admin.test.mjs
 */
import assert from "node:assert/strict";

const imp = (p) => import(new URL(p, import.meta.url).href);

class KV {
  constructor() {
    this.m = new Map();
  }
  async get(k) {
    return this.m.has(k) ? this.m.get(k) : null;
  }
  async put(k, v) {
    this.m.set(k, v);
  }
  async delete(k) {
    this.m.delete(k);
  }
  async list({ prefix }) {
    return { keys: [...this.m.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })), list_complete: true };
  }
}

const aufrufe = [];
let lemonAntworten = {};
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  aufrufe.push({ u, init });
  if (u.includes("api.resend.com")) return new Response(JSON.stringify({ data: [], id: "m1" }), { status: 200 });
  if (u.includes("api.lemonsqueezy.com")) {
    for (const [muster, antwort] of Object.entries(lemonAntworten)) if (u.includes(muster)) return new Response(JSON.stringify(antwort.body), { status: antwort.status || 200 });
    return new Response(JSON.stringify({ errors: [{ detail: "nicht simuliert" }] }), { status: 404 });
  }
  if (u.includes("api.github.com")) return new Response("[]", { status: 200 });
  throw new Error("unerwartet: " + u);
};

const { onRequest: middleware } = await imp("../functions/api/admin/_middleware.js");
const tresor = await imp("../lib/admin/tresor.js");

const ORIGIN = "https://cockpit.mesco.cc";
const anfrage = (pfad, { methode = "GET", body, kopf = {} } = {}) =>
  new Request(ORIGIN + pfad, {
    method: methode,
    headers: { ...(body ? { "content-type": "application/json", Origin: ORIGIN } : {}), ...kopf },
    body: body ? JSON.stringify(body) : undefined,
  });

// ───────────── Middleware ─────────────
{
  const weiter = async () => new Response("weiter");
  const ctx = (request, env) => ({ request, env, data: {}, next: weiter });
  let r = await middleware(ctx(anfrage("/api/admin/uebersicht"), {}));
  assert.equal(r.status, 503, "ohne Schutz fail-closed");
  const env = { ADMIN_TOKEN: "geheimes-token-123", ALPHA: new KV() };
  r = await middleware(ctx(anfrage("/api/admin/uebersicht", { kopf: { "X-Admin-Token": "falsch" } }), env));
  assert.equal(r.status, 401);
  r = await middleware(ctx(anfrage("/api/admin/uebersicht", { kopf: { "X-Admin-Token": "geheimes-token-123" } }), env));
  assert.equal(await r.text(), "weiter");
  // Gefälschte Access-Kopfzeile ohne gültiges JWT hilft nicht.
  r = await middleware(ctx(anfrage("/api/admin/uebersicht", { kopf: { "Cf-Access-Authenticated-User-Email": "boss@x.de" } }), env));
  assert.equal(r.status, 401);
  // Schreiben: fremder Ursprung, kein JSON
  const post = (kopf) => new Request(ORIGIN + "/api/admin/alpha", { method: "POST", headers: { "X-Admin-Token": "geheimes-token-123", ...kopf }, body: "{}" });
  r = await middleware(ctx(post({ "content-type": "application/json", Origin: "https://boese.example" }), env));
  assert.equal(r.status, 403);
  r = await middleware(ctx(post({ "content-type": "application/json" }), env));
  assert.equal(r.status, 403, "ohne Origin/Referer kein Schreiben");
  r = await middleware(ctx(post({ "content-type": "text/plain", Origin: ORIGIN }), env));
  assert.equal(r.status, 415);
  r = await middleware(ctx(post({ "content-type": "application/json", Origin: ORIGIN }), env));
  assert.equal(await r.text(), "weiter");
  console.log("Middleware: ok");
}

// ───────────── Tresor ─────────────
{
  const env = { ALPHA: new KV(), RESEND_API_KEY: "re_umgebung_1111" };
  tresor._cacheLeeren();
  await assert.rejects(() => tresor.setzeGeheim(env, "RESEND_API_KEY", "re_neu_22223333", "t"), /ADMIN_MASTER_KEY fehlt/);
  env.ADMIN_MASTER_KEY = "zu-kurz";
  await assert.rejects(() => tresor.setzeGeheim(env, "RESEND_API_KEY", "re_neu_22223333", "t"), /ADMIN_MASTER_KEY ist zu kurz/);
  env.ADMIN_MASTER_KEY = "0123456789abcdef-sehr-geheim";
  // Lemon-Squeezy-Schlüssel sind JWTs mit rund 1000 Zeichen
  const jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9." + "a".repeat(900) + ".sig_ENDE";
  await tresor.setzeGeheim(env, "LEMONSQUEEZY_API_KEY", jwt, "test@x");
  assert.equal((await tresor.mitSchluesseln(env)).LEMONSQUEEZY_API_KEY, jwt);
  await tresor.loescheGeheim(env, "LEMONSQUEEZY_API_KEY");
  await assert.rejects(() => tresor.setzeGeheim(env, "RESEND_API_KEY", "kurz", "t"), /unvollständig/);
  await tresor.setzeGeheim(env, "RESEND_API_KEY", "re_dashboard_4444", "test@x");
  const roh = env.ALPHA.m.get("tresor:v1");
  assert.ok(!roh.includes("re_dashboard_4444"), "Klartext darf nicht im KV stehen");
  assert.equal((await tresor.mitSchluesseln(env)).RESEND_API_KEY, "re_dashboard_4444");
  let st = await tresor.status(env);
  const resendStatus = st.geheim.find((g) => g.name === "RESEND_API_KEY");
  assert.equal(resendStatus.anzeige, "••••4444");
  assert.equal(resendStatus.quelle, "dashboard");
  assert.ok(!JSON.stringify(st).includes("re_dashboard_4444"));
  // Falscher Master-Schlüssel → nicht lesbar, Umgebung gilt weiter
  tresor._cacheLeeren();
  const falsch = { ...env, ADMIN_MASTER_KEY: "ein-ganz-anderer-schluessel" };
  assert.equal((await tresor.mitSchluesseln(falsch)).RESEND_API_KEY, "re_umgebung_1111");
  st = await tresor.status(falsch);
  assert.equal(st.geheim.find((g) => g.name === "RESEND_API_KEY").defekt, true);
  tresor._cacheLeeren();
  // Einstellungen prüfen
  await assert.rejects(() => tresor.setzeEinstellung(env, "DISCORD_URL", "https://boese.example/x", "t"), /Discord/);
  await tresor.setzeEinstellung(env, "DISCORD_URL", "https://discord.gg/abc123", "t");
  assert.equal((await tresor.mitSchluesseln(env)).DISCORD_URL, "https://discord.gg/abc123");
  await assert.rejects(() => tresor.setzeGeheim(env, "UNBEKANNT", "xxxxxxxxxx", "t"), /Unbekannt/);
  console.log("Tresor: ok");
}

// ───────────── Alpha verwalten + Einladung ─────────────
{
  const { onRequestGet, onRequestPost } = await imp("../functions/api/admin/alpha.js");
  const env = { ALPHA: new KV() };
  const eintrag = (mail, status) => env.ALPHA.put(`alpha:${mail}`, JSON.stringify({ name: "Anna Muster", mail, os: "windows", grund: "x", status, zeit: new Date().toISOString() }));
  await eintrag("anna@example.org", "neu");
  await eintrag("ben@example.org", "warteliste");
  const data = { env: { ...env }, benutzer: "admin@x" };
  const post = (body) => onRequestPost({ request: anfrage("/api/admin/alpha", { methode: "POST", body }), data });

  let r = await onRequestGet({ data });
  let d = await r.json();
  assert.equal(d.eintraege.length, 2);
  assert.equal(d.einladenBereit, false);

  r = await post({ aktion: "status", mail: "ben@example.org", status: "angenommen" });
  assert.equal(r.status, 200);
  assert.equal(env.ALPHA.m.get("alpha:anzahl"), "2", "Zähler neu berechnet");
  r = await post({ aktion: "status", mail: "ben@example.org", status: "quatsch" });
  assert.equal(r.status, 422);
  r = await post({ aktion: "plaetze", plaetze: 60 });
  assert.equal(JSON.parse(env.ALPHA.m.get("config:alpha")).plaetze, 60);

  // Einladen ohne Einstellungen → verständlicher Fehler
  r = await post({ aktion: "einladen", mail: "anna@example.org" });
  assert.equal(r.status, 412);
  assert.match((await r.json()).fehler, /LS_ALPHA_CHECKOUT_URL/);

  // Mit Einstellungen: Rabattcode + Mail
  Object.assign(data.env, {
    LEMONSQUEEZY_API_KEY: "ls",
    LS_STORE_ID: "123",
    LS_ALPHA_VARIANT_ID: "456",
    LS_ALPHA_CHECKOUT_URL: "https://cockpit.lemonsqueezy.com/checkout/buy/abc-def",
    RESEND_API_KEY: "re",
  });
  lemonAntworten = { "/v1/discounts": { body: { data: { id: "9" } }, status: 201 } };
  aufrufe.length = 0;
  r = await post({ aktion: "einladen", mail: "anna@example.org" });
  d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d));
  const rabatt = JSON.parse(aufrufe.find((a) => a.u.includes("/v1/discounts")).init.body);
  assert.equal(rabatt.data.attributes.amount, 100);
  assert.equal(rabatt.data.attributes.max_redemptions, 1);
  assert.equal(rabatt.data.relationships.variants.data[0].id, "456");
  const mailBody = JSON.parse(aufrufe.find((a) => a.u.endsWith("/emails")).init.body);
  assert.deepEqual(mailBody.to, ["anna@example.org"]);
  assert.ok(mailBody.html.includes(rabatt.data.attributes.code));
  assert.ok(mailBody.html.includes("checkout%5Bemail%5D=anna%40example.org"));
  const gespeichert = JSON.parse(env.ALPHA.m.get("alpha:anna@example.org"));
  assert.equal(gespeichert.status, "eingeladen");
  assert.equal(gespeichert.eingeladen.code, rabatt.data.attributes.code);
  assert.ok([...env.ALPHA.m.keys()].some((k) => k.startsWith("audit:")), "Audit-Log geschrieben");

  // Name mit HTML wird in der Mail maskiert
  await env.ALPHA.put("alpha:x@example.org", JSON.stringify({ name: "<script>alert(1)</script>", mail: "x@example.org", status: "neu" }));
  aufrufe.length = 0;
  await post({ aktion: "einladen", mail: "x@example.org", ohneCode: true });
  const m2 = JSON.parse(aufrufe.find((a) => a.u.endsWith("/emails")).init.body);
  assert.ok(!m2.html.includes("<script>"));
  assert.ok(!aufrufe.some((a) => a.u.includes("/v1/discounts")), "ohne Code kein Rabatt");

  r = await post({ aktion: "loeschen", mail: "x@example.org" });
  assert.equal(r.status, 200);
  assert.equal(env.ALPHA.m.get("alpha:x@example.org"), undefined);
  console.log("Alpha-Verwaltung: ok");
}

// ───────────── Umfragen: Editor + Auswertung ─────────────
{
  const { onRequestGet, onRequestPost } = await imp("../functions/api/admin/umfragen.js");
  const { STANDARD_UMFRAGEN } = await imp("../lib/umfragen.js");
  const env = { ALPHA: new KV() };
  const data = { env, benutzer: "admin" };
  const post = (body) => onRequestPost({ request: anfrage("/api/admin/umfragen", { methode: "POST", body }), data });

  // Antworten für die große Umfrage (Van Westendorp + NPS)
  const preise = [
    [10, 20, 40, 60],
    [15, 25, 45, 70],
    [5, 30, 50, 80],
    [20, 30, 60, 90],
    [30, 20, 10, 5], // unstimmig
  ];
  preise.forEach(([zuBillig, guenstig, teuer, zuTeuer], i) =>
    env.ALPHA.put(`survey:resp:alpha-gross:${i}`, JSON.stringify({ umfrage: "alpha-gross", lizenzId: String(i), email: `t${i}@x.de`, zeit: new Date().toISOString(), antworten: { zuBillig, guenstig, teuer, zuTeuer, nps: [10, 9, 7, 3, 10][i], hilfreich: { Pipeline: 5, Inbox: "nicht genutzt" }, fehlt: i === 0 ? "Kalender;\"Export\"" : undefined } })),
  );

  let d = await (await onRequestGet({ request: anfrage("/api/admin/umfragen"), data })).json();
  assert.equal(d.standard, true);
  const gross = d.umfragen.find((u) => u.definition.id === "alpha-gross").auswertung;
  assert.equal(gross.antworten, 5);
  assert.equal(gross.preispunkte.n, 4, "unstimmige Antwort ausgeschlossen");
  assert.ok(gross.preispunkte.optimal > 0);
  const nps = gross.fragen.find((f) => f.id === "nps").nps;
  assert.deepEqual([nps.promotoren, nps.passive, nps.kritiker, nps.wert], [3, 1, 1, 40]);
  const matrix = gross.fragen.find((f) => f.id === "hilfreich");
  assert.equal(matrix.zeilen.find((z) => z.name === "Pipeline").schnitt, 5);
  assert.equal(matrix.zeilen.find((z) => z.name === "Inbox").nichtGenutzt, 5);

  // CSV-Export mit Maskierung
  const bytes = new Uint8Array(await (await onRequestGet({ request: anfrage("/api/admin/umfragen?export=alpha-gross"), data })).arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "BOM für Excel");
  const csvText = new TextDecoder().decode(bytes);
  assert.ok(csvText.startsWith("zeit;email"));
  assert.ok(csvText.includes('"Kalender;""Export"""'));

  // Ungültige Definition
  let r = await post({ aktion: "speichern", umfrage: { id: "X!", titel: "t", fragen: [] } });
  assert.equal(r.status, 422);
  r = await post({ aktion: "speichern", umfrage: { id: "neu", titel: "Neue Umfrage", ausloeser: { art: "tage", wert: 30 }, fragen: [{ id: "a", typ: "einfach", text: "Frage?", optionen: ["Nur eine"] }] } });
  assert.match((await r.json()).fehler, /zwei Antwortmöglichkeiten/);

  // Speichern übernimmt die Standards
  r = await post({ aktion: "speichern", umfrage: { id: "woche4", titel: "Woche vier", aktiv: true, ausloeser: { art: "meilenstein", zaehler: "bewerbungen", wert: 10 }, fragen: [{ id: "gut", typ: "skala", text: "Wie gut?", pflicht: true, labels: ["schlecht", "super"] }, { id: "was", typ: "mehrfach", text: "Was?", optionen: "A\nB\nB\nC" }] } });
  assert.equal(r.status, 200);
  const ids = [...env.ALPHA.m.keys()].filter((k) => k.startsWith("survey:def:")).sort();
  assert.deepEqual(ids, ["survey:def:alpha-gross", "survey:def:puls-tag3", "survey:def:woche4"]);
  assert.deepEqual(JSON.parse(env.ALPHA.m.get("survey:def:woche4")).fragen[1].optionen, ["A", "B", "C"]);

  r = await post({ aktion: "aktiv", id: "puls-tag3", aktiv: false });
  assert.equal(JSON.parse(env.ALPHA.m.get("survey:def:puls-tag3")).aktiv, false);
  // Die App bekommt nur aktive Umfragen
  const { ladeUmfragen } = await imp("../lib/umfragen.js");
  assert.deepEqual((await ladeUmfragen(env)).map((u) => u.id).sort(), ["alpha-gross", "woche4"]);
  r = await post({ aktion: "loeschen", id: "woche4" });
  assert.equal(r.status, 200);
  assert.equal(STANDARD_UMFRAGEN.length, 2);
  console.log("Umfragen-Verwaltung: ok");
}

// ───────────── Fehlerberichte, Mail, Einstellungen, Lizenzen, Übersicht ─────────────
{
  const env = { ALPHA: new KV(), ADMIN_MASTER_KEY: "0123456789abcdef-sehr-geheim" };
  tresor._cacheLeeren();
  const data = { env: { ...env }, benutzer: "admin" };

  const F = await imp("../functions/api/admin/fehler.js");
  await env.ALPHA.put("bug:2026-10-01T10:00:00Z:1", JSON.stringify({ beschreibung: "Absturz", zeit: "2026-10-01T10:00:00Z" }));
  let d = await (await F.onRequestGet({ data })).json();
  assert.equal(d.berichte[0].status, "neu");
  let r = await F.onRequestPost({ request: anfrage("/api/admin/fehler", { methode: "POST", body: { schluessel: "bug:2026-10-01T10:00:00Z:1", status: "erledigt", notiz: "0.1.1" } }), data });
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(env.ALPHA.m.get("bug:2026-10-01T10:00:00Z:1")).status, "erledigt");
  r = await F.onRequestPost({ request: anfrage("/api/admin/fehler", { methode: "POST", body: { schluessel: "alpha:x", status: "erledigt" } }), data });
  assert.equal(r.status, 400, "nur bug:-Schlüssel");

  const M = await imp("../functions/api/admin/mail.js");
  for (const [mail, status] of [["a@x.de", "eingeladen"], ["b@x.de", "eingeladen"], ["c@x.de", "warteliste"]])
    await env.ALPHA.put(`alpha:${mail}`, JSON.stringify({ name: "Test Person", mail, status }));
  d = await (await M.onRequestGet({ data })).json();
  assert.equal(d.gruppen.find((g) => g.id === "eingeladen").anzahl, 2);
  const mpost = (body) => M.onRequestPost({ request: anfrage("/api/admin/mail", { methode: "POST", body }), data: { ...data, env: { ...data.env, RESEND_API_KEY: "re" } } });
  d = await (await mpost({ aktion: "vorschau", gruppe: "eingeladen" })).json();
  assert.equal(d.anzahl, 2);
  aufrufe.length = 0;
  r = await mpost({ aktion: "senden", gruppe: "eingeladen", betreff: "Neue Version", text: "Hallo zusammen,\n\n0.1.1 ist da: https://cockpit.mesco.cc/changelog/ <b>fett</b>" });
  assert.equal(r.status, 200);
  const batch = JSON.parse(aufrufe.find((a) => a.u.endsWith("/emails/batch")).init.body);
  assert.equal(batch.length, 2);
  assert.ok(batch[0].html.includes('href="https://cockpit.mesco.cc/changelog/"'));
  assert.ok(!batch[0].html.includes("<b>fett</b>"), "HTML im Text wird maskiert");

  const E = await imp("../functions/api/admin/einstellungen.js");
  r = await E.onRequestPost({ request: anfrage("/api/admin/einstellungen", { methode: "POST", body: { aktion: "geheim", name: "GITHUB_TOKEN", wert: "ghp_abcdefgh12345678" } }), env, data });
  d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(d.test.ok, true);
  d = await (await E.onRequestGet({ env, data })).json();
  assert.equal(d.schutz.master, true);
  assert.equal(d.tresor.geheim.find((g) => g.name === "GITHUB_TOKEN").anzeige, "••••5678");
  assert.ok(!JSON.stringify(d).includes("ghp_abcdefgh12345678"));
  assert.ok(d.protokoll.some((p) => p.aktion === "Schlüssel gesetzt"));

  const L = await imp("../functions/api/admin/lizenzen.js");
  const ldata = { env: { ...data.env, LEMONSQUEEZY_API_KEY: "ls" }, benutzer: "admin" };
  lemonAntworten = {
    "license-keys?": { body: { data: [{ id: "7", attributes: { key: "SECRET-KEY-FULL-1234", key_short: "XXXX-1234", status: "active", activation_usage: 1, activation_limit: 3, user_email: "k@x.de" } }], meta: { page: { lastPage: 1 } } } },
    "license-keys/7": { body: { data: { id: "7", attributes: { key: "SECRET-KEY-FULL-1234", status: "active", disabled: true } } } },
    "licenses/deactivate": { body: { deactivated: true } },
  };
  d = await (await L.onRequestGet({ request: anfrage("/api/admin/lizenzen"), data: ldata })).json();
  assert.equal(d.lizenzen[0].schluessel, "XXXX-1234");
  assert.ok(!JSON.stringify(d).includes("SECRET-KEY-FULL"), "voller Schlüssel verlässt den Server nie");
  r = await L.onRequestPost({ request: anfrage("/api/admin/lizenzen", { methode: "POST", body: { id: "7", aktion: "sperren" } }), data: ldata });
  assert.equal(r.status, 200);
  const patch = aufrufe.findLast((a) => a.u.endsWith("license-keys/7") && a.init.method === "PATCH");
  assert.deepEqual(JSON.parse(patch.init.body).data.attributes, { disabled: true });
  r = await L.onRequestPost({ request: anfrage("/api/admin/lizenzen", { methode: "POST", body: { id: "7", aktion: "geraet-abmelden", instanz: "inst-1" } }), data: ldata });
  assert.equal(r.status, 200);

  const U = await imp("../functions/api/admin/uebersicht.js");
  d = await (await U.onRequestGet({ data })).json();
  assert.equal(d.alpha.ok, true);
  assert.equal(d.lizenzen.ok, false, "ohne Lemon-Schlüssel Hinweis statt Absturz");
  assert.equal(d.fehler.gesamt, 1);
  console.log("Fehler, Mail, Einstellungen, Lizenzen, Übersicht: ok");
}

// ───────────── Doku (privates Repo, nur lesend) ─────────────
{
  const { onRequestGet: doku } = await imp("../functions/api/admin/doku.js");
  const gh = [];
  let baum = { status: 200, body: { tree: [{ path: "zz/b.md", type: "blob", size: 1 }, { path: "a.md", type: "blob", size: 1 }, { path: "README.md", type: "blob", size: 1 }, { path: "logo.png", type: "blob", size: 1 }, { path: "ordner", type: "tree" }] } };
  const vorher = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    gh.push({ u, init });
    if (u.includes("/git/trees/")) return new Response(JSON.stringify(baum.body), { status: baum.status });
    if (u.includes("/contents/")) return u.endsWith("/contents/fehlt.md") ? new Response("{}", { status: 404 }) : new Response("<h1>Hallo</h1>", { status: 200 });
    return vorher(url, init);
  };
  const lauf = async (pfad, env) => (await doku({ request: new Request(ORIGIN + "/api/admin/doku" + pfad), data: { env } })).json();

  let d = await lauf("", {});
  assert.equal(d.ok, false, "ohne Token kein Zugriff");
  assert.match(d.text, /GitHub-Token/);
  assert.equal(gh.length, 0, "ohne Token kein Aufruf");

  const env = { GITHUB_TOKEN: "ghp_test" };
  d = await lauf("", env);
  assert.equal(d.ok, true);
  assert.equal(d.repo, "Stacktor/cockpit-docs", "Standard-Repo");
  assert.deepEqual(d.dateien.map((x) => x.pfad), ["README.md", "a.md", "zz/b.md"], "nur Markdown, README zuerst");
  assert.equal(gh[0].init.headers.Authorization, "Bearer ghp_test");

  d = await lauf("", { ...env, DOCS_REPO: "Stacktor/andere-doku" });
  assert.ok(gh.at(-1).u.includes("repos/Stacktor/andere-doku/"), "eigenes Repo aus der Einstellung");
  d = await lauf("", { ...env, DOCS_REPO: "kaputt" });
  assert.equal(d.ok, false, "ungültiges Repo abgelehnt");

  baum = { status: 404, body: {} };
  d = await lauf("", env);
  assert.equal(d.ok, false);
  assert.match(d.text, /nicht erreichbar/);
  baum = { status: 409, body: {} };
  d = await lauf("", env);
  assert.deepEqual(d.dateien, [], "leeres Repo");

  const zahl = gh.length;
  for (const boese of ["../geheim.md", "a/../../x.md", "/etc/passwd.md", "README.txt", "a.md?x=1", "%2e%2e/x.md"]) {
    d = await lauf("?pfad=" + encodeURIComponent(boese), env);
    assert.equal(d.ok, false, `abgelehnt: ${boese}`);
  }
  assert.equal(gh.length, zahl, "abgelehnte Pfade erreichen GitHub nicht");

  d = await lauf("?pfad=" + encodeURIComponent("betrieb/Über uns.md"), env);
  assert.equal(d.ok, true);
  assert.equal(d.html, "<h1>Hallo</h1>");
  assert.ok(gh.at(-1).u.endsWith("/contents/betrieb/%C3%9Cber%20uns.md"), "Pfad kodiert");
  assert.equal(gh.at(-1).init.headers.Accept, "application/vnd.github.html+json", "GitHub rendert HTML");
  d = await lauf("?pfad=fehlt.md", env);
  assert.equal(d.ok, false);

  const { setzeEinstellung } = tresor;
  const kv = { ALPHA: new KV(), ADMIN_MASTER_KEY: "test-master-schluessel-1234" };
  await assert.rejects(() => setzeEinstellung(kv, "DOCS_REPO", "nur-name", "t"), /besitzer\/name/);
  await setzeEinstellung(kv, "DOCS_REPO", "Stacktor/cockpit-docs", "t");

  globalThis.fetch = vorher;
  console.log("Doku: ok");
}

// ───────────── Dashboard-Layout ─────────────
{
  const { onRequestGet, onRequestPost, pruefeLayout } = await imp("../functions/api/admin/layout.js");
  const env = { ALPHA: new KV() };
  const data = { env, benutzer: "Thomas@Example.org" };
  const lies = async () => (await onRequestGet({ data })).json();
  const schreibe = (body) => onRequestPost({ request: new Request(ORIGIN + "/api/admin/layout", { method: "POST", body: JSON.stringify(body) }), data });

  assert.deepEqual(await lies(), { layout: null }, "ohne gespeichertes Layout");
  let r = await schreibe({ layout: [{ id: "fehler", groesse: "s" }, { id: "verlauf", groesse: "voll" }], tage: 30, auto: 5 });
  assert.equal(r.status, 200);
  const d = await lies();
  assert.deepEqual(d.layout, [{ id: "fehler", groesse: "s" }, { id: "verlauf", groesse: "voll" }]);
  assert.equal(d.tage, 30);
  assert.equal(d.auto, 5);
  assert.ok(env.ALPHA.m.has("admin:layout:thomas@example.org"), "je Person, klein geschrieben");

  // Unsinn wird bereinigt bzw. abgelehnt.
  const sauber = pruefeLayout({ layout: [{ id: "a" }, { id: "a" }, { id: "<script>" }, { id: "b", groesse: "riesig" }, null], tage: 99, auto: 7 });
  assert.deepEqual(sauber, { layout: [{ id: "a", groesse: "m" }, { id: "b", groesse: "m" }], tage: 7, auto: 0 });
  assert.equal((await schreibe({ layout: "kaputt" })).status, 400);
  assert.equal((await schreibe({ layout: Array.from({ length: 61 }, (_, i) => ({ id: `k${i}` })) })).status, 400);
  console.log("Dashboard-Layout: ok");
}
