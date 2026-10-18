import assert from "node:assert/strict";
import { onRequestPost, onRequestGet } from "../functions/api/alpha.js";
import { pruefeTurnstile } from "../lib/turnstile.js";

const request = new Request("https://cockpit.mesco.cc/api/alpha", { method: "POST" });
const keys = { TURNSTILE_SITE_KEY: "public-site-key", TURNSTILE_SECRET_KEY: "private-secret-key" };
const basis = { name: "Test Person", mail: "captcha@example.invalid", os: "windows", grund: "Ich möchte meine Bewerbungen besser ordnen.", turnstileToken: "einmaliger-token" };
const valid = { success: true, hostname: "cockpit.mesco.cc", action: "alpha_signup" };
let anfragen = 0;
let reply = valid;
let modus = "ok";
const gesehen = [];
globalThis.fetch = async (url, options) => {
  assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify", "nur Siteverify vor Freigabe");
  anfragen++;
  gesehen.push(new URLSearchParams(options.body));
  if (modus === "netzfehler") throw new TypeError("offline");
  if (modus === "timeout") throw new DOMException("Timeout", "TimeoutError");
  if (modus === "http-fehler") return new Response("kaputt", { status: 503 });
  if (modus === "ungueltiges-json") return new Response("kein JSON");
  return Response.json(reply);
};

// Ohne Konfiguration und Token keine Prüfung, kein stilles Durchlassen.
assert.equal((await pruefeTurnstile(request, {}, "token")).status, 503);
for (const token of [undefined, null, {}, "", " ", "x".repeat(2049)]) {
  assert.equal((await pruefeTurnstile(request, keys, token)).status, 403);
}
assert.equal(anfragen, 0);
assert.deepEqual(await pruefeTurnstile(request, keys, "token"), { ok: true });
assert.equal(gesehen[0].get("secret"), keys.TURNSTILE_SECRET_KEY);
assert.equal(gesehen[0].get("response"), "token");
assert.deepEqual([...gesehen[0].keys()], ["secret", "response"], "keine Formulardaten oder zusätzliche IP im Prüfdienst");

// Success allein reicht nicht: Hostname und Aktion müssen passen.
for (const falsches of [
  { ...valid, success: false }, { ...valid, success: "true" },
  { ...valid, hostname: "evil.example" }, { ...valid, hostname: undefined },
  { ...valid, action: "login" }, { ...valid, action: undefined },
  { success: false, "error-codes": ["timeout-or-duplicate"] }, null,
]) {
  reply = falsches;
  assert.equal((await pruefeTurnstile(request, keys, "token")).status, 403);
}
for (const m of ["netzfehler", "timeout", "http-fehler", "ungueltiges-json"]) {
  modus = m;
  assert.equal((await pruefeTurnstile(request, keys, "token")).status, 503);
}
modus = "ok";
reply = { success: false, "error-codes": ["internal-error"] };
assert.equal((await pruefeTurnstile(request, keys, "token")).status, 503);
reply = { success: false, "error-codes": ["invalid-input-secret"] };
assert.equal((await pruefeTurnstile(request, keys, "token")).status, 503);

// Echte Registrierungsfunktion: vor erfolgreicher Prüfung keine KV-Schreibvorgänge,
// kein Resend-Aufruf und keine Offenlegung vorhandener Anmeldungen.
const daten = new Map([["alpha:captcha@example.invalid", JSON.stringify({ name: "Vorhanden" })]]);
let schreibvorgaenge = 0;
const env = { ...keys, ALPHA: {
  get: async (k) => daten.get(k) ?? null,
  put: async (k, v) => { schreibvorgaenge++; daten.set(k, v); },
} };
const post = (body = basis, umgebung = env) => onRequestPost({ request: new Request(request.url, { method: "POST", body: JSON.stringify(body) }), env: umgebung });
for (const falsches of [
  { ...valid, success: false }, { ...valid, hostname: "evil.example" },
  { ...valid, action: "other" }, { success: false, "error-codes": ["timeout-or-duplicate"] },
]) {
  reply = falsches;
  const r = await post();
  assert.equal(r.status, 403);
  assert.equal((await r.json()).doppelt, undefined);
}
assert.equal((await post({ ...basis, turnstileToken: undefined })).status, 403);
assert.equal((await post(basis, { ALPHA: env.ALPHA })).status, 503);
assert.equal(schreibvorgaenge, 0);

reply = valid;
let r = await post();
assert.equal((await r.json()).doppelt, true);
// Honeypot verarbeitet keine Anmeldung und verbraucht kein Challenge-Token.
const vorher = anfragen;
r = await post({ ...basis, mail: "bot@example.invalid", website: "spam" });
assert.equal(r.status, 200);
assert.equal(anfragen, vorher);
assert.equal(schreibvorgaenge, 0);

daten.delete("alpha:captcha@example.invalid");
r = await post();
assert.equal(r.status, 200);
assert.equal((await r.json()).ok, true);
assert.ok(schreibvorgaenge > 0);
const gespeichert = daten.get("alpha:captcha@example.invalid");
assert.ok(!gespeichert.includes(basis.turnstileToken));
assert.ok(!gespeichert.includes(keys.TURNSTILE_SECRET_KEY));
const status = await (await onRequestGet({ env })).json();
assert.equal(status.turnstileSiteKey, keys.TURNSTILE_SITE_KEY);
assert.ok(!JSON.stringify(status).includes(keys.TURNSTILE_SECRET_KEY));
console.log("Turnstile: Token, Hostname, Aktion, Ausfall, Wiederholung und Registrierung ohne Nebenwirkungen geprüft.");
