/**
 * Sichtprüfung des Admin-Dashboards mit echten Handlern und Beispieldaten.
 * Die Aufrufe an /api/admin/* beantwortet dieses Skript mit den echten
 * Functions (KV und externe Dienste simuliert). Screenshots in .tmp/admin.
 * Aufruf: npm run build && npm run audit:admin
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { globSync, mkdirSync } from "node:fs";

const OUT = ".tmp/admin";
mkdirSync(OUT, { recursive: true });
const imp = (p) => import(new URL(p, import.meta.url).href);

class KV {
  m = new Map();
  async get(k) { return this.m.get(k) ?? null; }
  async put(k, v) { this.m.set(k, v); }
  async delete(k) { this.m.delete(k); }
  async list({ prefix }) { return { keys: [...this.m.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })), list_complete: true }; }
}

// ── Beispieldaten ──
const kv = new KV();
const tag = (d) => new Date(Date.now() - d * 864e5).toISOString();
const namen = ["Anna Becker", "Jonas Wolf", "Lea Hoffmann", "Mehmet Yilmaz", "Sofia Wagner", "Paul Schulz", "Mia Richter", "Noah Klein", "Emma Braun", "Ben Krüger", "Lina Hartmann", "Finn Lange"];
const quellen = ["LinkedIn", "Reddit", "Freunde / Bekannte", "Xing", "Coach / Beratung", "TikTok"];
const status = ["neu", "neu", "eingeladen", "eingeladen", "angenommen", "warteliste", "eingeladen", "neu", "abgelehnt", "eingeladen", "neu", "warteliste"];
namen.forEach((name, i) => {
  const mail = name.toLowerCase().replace(/ /g, ".").replace("ü", "ue") + "@example.org";
  kv.m.set(`alpha:${mail}`, JSON.stringify({
    name, mail, os: i % 5 === 4 ? "macos" : i % 3 ? "windows" : "linux", status: status[i], zeit: tag(i * 2.3),
    situation: ["Arbeitsuchend", "Im Job, möchte wechseln", "Studium / Abschluss"][i % 3], bewerbungenMonat: ["6–15", "1–5", "16–30"][i % 3],
    werkzeuge: ["Excel / Tabelle", "ChatGPT o. ä."].slice(0, (i % 2) + 1), ki: ["Ich habe einen API-Schlüssel", "Ich nutze lokale Modelle", "Noch nichts — will es ausprobieren"][i % 3],
    technik: "Klappt mit Anleitung", herkunft: quellen[i % quellen.length], feedback: ["Umfragen in der App"], utm: i % 4 === 0 ? { utm_source: "reddit", utm_campaign: "alpha-start" } : null,
    grund: "Ich verliere bei vielen Bewerbungen den Überblick und brauche zu lange für Anschreiben.", land: "DE",
  }));
});
for (let i = 0; i < 9; i++)
  kv.m.set(`survey:resp:puls-tag3:${i}`, JSON.stringify({ umfrage: "puls-tag3", lizenzId: String(i), email: `t${i}@example.org`, zeit: tag(i), antworten: { einstieg: 3 + (i % 3), bewerbung: i % 4 ? "Ja" : "Nein, noch nicht", funktioniert: ["Ja", "Kleinere Probleme"][i % 2], nps: [9, 10, 8, 7, 9, 6, 10, 9, 8][i], ueberrascht: i % 3 ? "Wie schnell die Suche ist." : undefined } }));
for (let i = 0; i < 6; i++)
  kv.m.set(`survey:resp:alpha-gross:${i}`, JSON.stringify({ umfrage: "alpha-gross", lizenzId: String(i), email: `t${i}@example.org`, zeit: tag(i), antworten: { haeufigkeit: "Mehrmals pro Woche", genutzt: ["Pipeline", "Stellensuche", "KI-Anschreiben"], hilfreich: { Pipeline: 5, Stellensuche: 4, "KI-Anschreiben": 4 + (i % 2) }, zuBillig: 5 + i, guenstig: 15 + i * 2, teuer: 35 + i * 3, zuTeuer: 60 + i * 4, modell: "Einmal kaufen", nps: [9, 8, 10, 7, 9, 10][i], design: 4, tempo: 5, einstieg: 4, fehlerhaeufigkeit: "Selten", system: "Windows 11", ki: "Lokales Modell (Ollama/LM Studio)", status: "Arbeitsuchend", branche: "IT / Software", erfahrung: "3–7 Jahre", bewerbungenMonat: "6–15", gespraech: "Ja, gern", fehlt: "Kalender-Export" } }));
kv.m.set("bug:" + tag(0.3) + ":1", JSON.stringify({ beschreibung: "Beim Speichern einer Bewerbung mit sehr langem Anschreiben hängt die App kurz.", protokoll: "Ansicht: /pipeline\nZeit: …\nLetzte Fehlermeldungen (1):\n[10:12:03] abfrage: database is locked", version: "0.1.0", system: "Windows x86_64", email: "anna.becker@example.org", zeit: tag(0.3), status: "neu" }));
kv.m.set("bug:" + tag(2) + ":2", JSON.stringify({ beschreibung: "AppImage startet unter Fedora nicht ohne libfuse2.", version: "0.1.0", system: "Linux x86_64", email: "noah.klein@example.org", zeit: tag(2), status: "erledigt" }));
kv.m.set("audit:" + tag(0.1) + ":a", JSON.stringify({ zeit: tag(0.1), benutzer: "thomas@example.org", aktion: "Alpha-Einladung gesendet", details: "jonas.wolf@example.org (Code ALPHAK3F9Q)" }));

const env = { ALPHA: kv, ADMIN_MASTER_KEY: "vorschau-master-schluessel-123", CF_ACCOUNT_ID: "abc", CF_ZONE_ID: "zone1", LEMONSQUEEZY_API_KEY: "ls_test_1234", RESEND_API_KEY: "re_test_5678", CF_ANALYTICS_TOKEN: "cf_9999", LS_STORE_ID: "1", LS_ALPHA_VARIANT_ID: "2", LS_ALPHA_CHECKOUT_URL: "https://cockpit.lemonsqueezy.com/checkout/buy/x", GITHUB_TOKEN: "ghp_vorschau" };

// Doku-Repo: absichtlich mit gefährlichem HTML, um die Säuberung zu prüfen.
const DOKU_HTML = {
  "README.md": '<div id="file" class="md"><article class="markdown-body"><div class="markdown-heading"><h1 class="heading-element">cockpit — interne Doku</h1><a id="user-content-cockpit" class="anchor" href="#cockpit"><svg class="octicon"><path d="M0"></path></svg></a></div><p>Start hier. Weiter zu <a href="betrieb/cloudflare.md">Cloudflare</a> und <a href="https://example.org">extern</a>.</p><script>window.__xss = 1</script><img alt="bild" onerror="window.__xss = 2"><a href="javascript:window.__xss=3" id="boese">klick</a><img src="//tracker.example/p.png" id="pixel"><table><tr><th>Name</th><th>Wert</th></tr><tr><td>Plätze</td><td>50</td></tr></table><pre><code>npm run build</code></pre></article></div>',
  "betrieb/cloudflare.md": '<article class="markdown-body"><h1>Cloudflare Pages</h1><p>Zurück zur <a href="../README.md">Übersicht</a>.</p><ul><li><input type="checkbox" checked> erledigt</li><li><input type="text" value="x"> weg</li></ul></article>',
};

// ── Externe Dienste ──
const lizenz = (i) => ({ id: String(100 + i), attributes: { key_short: `XXXX-${1000 + i}`, status: i === 3 ? "expired" : "active", disabled: i === 4, activation_usage: i % 3, activation_limit: 3, user_email: `k${i}@example.org`, user_name: namen[i], product_name: "Bewerbungs-Cockpit", created_at: tag(i * 3), expires_at: null } });
const tage30 = [...Array(30)].map((_, i) => ({ dimensions: { date: tag(29 - i).slice(0, 10) }, sum: { requests: 400 + i * 20, pageViews: 120 + ((i * 37) % 90), countryMap: [{ clientCountryName: "DE", requests: 300 }, { clientCountryName: "AT", requests: 40 }, { clientCountryName: "CH", requests: 30 }] }, uniq: { uniques: 40 + ((i * 13) % 35) } }));
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s });
  if (u.includes("license-keys?")) return j({ data: [0, 1, 2, 3, 4, 5].map(lizenz), meta: { page: { lastPage: 1 } } });
  if (u.includes("license-keys/")) return j({ data: lizenz(0) });
  if (u.includes("license-key-instances")) return j({ data: [{ id: "i1", attributes: { name: "anna · Windows (a1b2c3)", created_at: tag(3) } }] });
  if (u.includes("/orders")) return j({ data: [0, 1, 2].map((i) => ({ id: String(i), attributes: { order_number: 1000 + i, user_email: `k${i}@example.org`, user_name: namen[i], status: "paid", total: 0, currency: "EUR", created_at: tag(i * 4), test_mode: false, first_order_item: { product_name: "Bewerbungs-Cockpit", variant_name: "Alpha" } } })) });
  if (u.includes("/customers")) return j({ data: [], meta: { page: { total: 3 } } });
  if (u.includes("/discounts")) return j({ data: [{ id: "9", attributes: { name: "Alpha anna", code: "ALPHAK3F9Q", amount: 100, amount_type: "percent", redemptions_count: 1, is_limited_redemptions: true, max_redemptions: 1, status: "published", created_at: tag(1) } }] });
  if (u.includes("api.resend.com/emails")) return j({ data: [0, 1, 2, 3, 4].map((i) => ({ to: [`t${i}@example.org`], subject: i % 2 ? "Deine Anmeldung zur Alpha" : "Du bist in der Alpha", last_event: i === 3 ? "bounced" : "delivered", created_at: tag(i) })) });
  if (u.includes("api.resend.com/audiences")) return j({ data: [{ id: "a", name: "Alpha-Anmeldungen" }] });
  if (u.includes("api.resend.com/domains")) return j({ data: [{ name: "mesco.cc", status: "verified", region: "eu-west-1" }] });
  if (u.includes("graphql")) {
    const body = JSON.parse(init.body);
    if (body.query.includes("httpRequests1dGroups")) return j({ data: { viewer: { zones: [{ tage: tage30 }] } } });
    return j({ data: { viewer: { zones: [{ pfade: [["/", 180], ["/alpha/", 90], ["/funktionen/", 44], ["/download/", 31]].map(([p, c]) => ({ count: c, dimensions: { clientRequestPath: p } })), herkunft: [["", 120], ["www.reddit.com", 60], ["www.linkedin.com", 33]].map(([p, c]) => ({ count: c, dimensions: { clientRefererHost: p } })) }] } } });
  }
  if (u.includes("cockpit-releases/releases")) return j([{ tag_name: "v0.1.0", name: "cockpit v0.1.0 (Alpha)", published_at: tag(5), html_url: "#", assets: [{ name: "cockpit-windows-setup.exe", download_count: 38 }, { name: "cockpit-linux-x86_64.AppImage", download_count: 12 }, { name: "latest.json", download_count: 410 }] }]);
  if (u.includes("actions/runs")) return j({ workflow_runs: [{ name: "CI", display_title: "0.1 Alpha · Etappe 1–3", status: "completed", conclusion: "success", head_branch: "main", event: "push", created_at: tag(0.5), html_url: "#" }, { name: "Release", display_title: "Testbuild", status: "completed", conclusion: "failure", head_branch: "main", event: "workflow_dispatch", created_at: tag(1), html_url: "#" }] });
  if (u.includes("cockpit-docs/git/trees")) return j({ tree: [{ path: "betrieb", type: "tree" }, { path: "betrieb/cloudflare.md", type: "blob", size: 900 }, { path: "entscheidungen.md", type: "blob", size: 400 }, { path: "README.md", type: "blob", size: 300 }, { path: "bild.png", type: "blob", size: 9 }], truncated: false });
  if (u.includes("cockpit-docs/contents/")) {
    const pfad = decodeURIComponent(u.split("/contents/")[1]);
    return DOKU_HTML[pfad] ? new Response(DOKU_HTML[pfad], { status: 200 }) : j({ message: "Not Found" }, 404);
  }
  if (u.includes("/issues")) return j([]);
  if (u.includes("api.github.com")) return j([]);
  return j({}, 404);
};

const tresor = await imp("../lib/admin/tresor.js");
await tresor.setzeEinstellung(env, "DISCORD_URL", "https://discord.gg/cockpit", "vorschau");

const handler = async (pfad, request) => {
  const name = pfad.replace(/^\/api\/admin\//, "").split("?")[0];
  const m = await imp(`../functions/api/admin/${name}.js`);
  const fn = request.method === "GET" ? m.onRequestGet : m.onRequestPost;
  return fn({ request, env, data: { env: await tresor.mitSchluesseln(env), benutzer: "thomas@example.org" } });
};

const server = spawn("npx", ["astro", "preview", "--port", "4329"], { stdio: "ignore" });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch("http://localhost:4329/")).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
// fetch ist gemockt — Server-Erreichbarkeit direkt über Playwright prüfen.
const browser = await chromium.launch({ executablePath: globSync("/opt/pw-browsers/chromium-*/chrome-linux/chrome").sort().reverse()[0] });
const funde = [];
try {
  for (const [geraet, viewport] of [["breit", { width: 1920, height: 1080 }], ["desktop", { width: 1440, height: 900 }], ["handy", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (e) => funde.push(`${geraet}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && funde.push(`${geraet}: ${m.text()}`));
    await page.route("**/api/admin/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const r = await handler(url.pathname + url.search, new Request(req.url(), { method: req.method(), headers: req.headers(), body: req.postData() || undefined }));
      await route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: Buffer.from(await r.arrayBuffer()) });
    });
    for (let v = 0; v < 40; v++) {
      try { await page.goto("http://localhost:4329/admin/", { waitUntil: "networkidle" }); break; } catch { await new Promise((r) => setTimeout(r, 500)); }
    }
    for (const bereich of ["uebersicht", "alpha", "umfragen", "fehler", "lizenzen", "umsatz", "mail", "analytics", "builds", "doku", "einstellungen"]) {
      await page.goto(`http://localhost:4329/admin/#/${bereich}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const text = await page.locator("#a-inhalt").innerText();
      if (/Konnte nicht geladen werden|Kein Zugang/.test(text)) funde.push(`${geraet} ${bereich}: ${text.slice(0, 200)}`);
      const breite = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (breite > 1) funde.push(`${geraet} ${bereich}: seitliches Scrollen ${breite}px`);
      await page.screenshot({ path: `${OUT}/${geraet}-${bereich}.png`, fullPage: geraet === "desktop" });
    }
    if (geraet === "desktop") {
      await page.goto("http://localhost:4329/admin/#/alpha", { waitUntil: "networkidle" });
      await page.locator("tbody tr").first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/desktop-alpha-detail.png` });
      await page.goto("http://localhost:4329/admin/#/umfragen", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Auswertung" }).nth(1).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/desktop-umfragen-auswertung.png`, fullPage: true });
      await page.getByRole("button", { name: "Bearbeiten" }).first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/desktop-umfragen-editor.png` });

      // Doku: Säuberung und Navigation zwischen Dateien.
      await page.goto("http://localhost:4329/admin/#/doku", { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const pruef = await page.evaluate(() => {
        const t = document.querySelector(".a-doku-inhalt");
        return {
          xss: window.__xss ?? 0,
          script: t?.querySelectorAll("script").length ?? -1,
          onAttr: t ? [...t.querySelectorAll("*")].some((e) => [...e.attributes].some((a) => a.name.startsWith("on"))) : true,
          boese: t?.querySelector("#boese")?.getAttribute("href") ?? null,
          pixel: t?.querySelector("#pixel")?.getAttribute("src") ?? null,
          svg: t?.querySelectorAll("svg").length ?? -1,
          tabelle: t?.querySelectorAll("td").length ?? 0,
          links: [...document.querySelectorAll(".a-doku-link")].map((b) => b.textContent),
        };
      });
      if (pruef.xss || pruef.script || pruef.onAttr || pruef.boese || pruef.pixel || pruef.svg) funde.push(`Doku-Säuberung: ${JSON.stringify(pruef)}`);
      if (pruef.tabelle !== 2) funde.push(`Doku: Tabelle fehlt (${pruef.tabelle})`);
      if (pruef.links.join(",") !== "README,entscheidungen,cloudflare") funde.push(`Doku: Liste ${pruef.links.join(",")}`);
      await page.locator(".a-doku-inhalt a", { hasText: "Cloudflare" }).click();
      await page.waitForTimeout(500);
      if (!(await page.locator(".a-doku-inhalt h1").innerText()).includes("Cloudflare Pages")) funde.push("Doku: interner Link öffnet nicht");
      if ((await page.locator('.a-doku-inhalt input[type="text"]').count()) !== 0) funde.push("Doku: Textfeld nicht entfernt");
      await page.screenshot({ path: `${OUT}/desktop-doku-unterseite.png` });
      await page.locator(".a-doku-inhalt a", { hasText: "Übersicht" }).click();
      await page.waitForTimeout(500);
      if (!(await page.locator(".a-doku-inhalt h1").innerText()).includes("interne Doku")) funde.push("Doku: ../README.md öffnet nicht");
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
if (funde.length) {
  console.log(funde.join("\n"));
  process.exit(1);
}
console.log(`Admin: keine Funde. Screenshots: ${OUT}`);
