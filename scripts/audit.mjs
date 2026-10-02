// Sichtprüfung der Website: jede Seite auf Desktop und Handy, Hell und Dunkel.
// Meldet Laufzeit-/Konsolenfehler und seitliches Scrollen; Screenshots in .tmp/audit.
// Aufruf: npm run build && node scripts/audit.mjs
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { globSync, mkdirSync, writeFileSync } from "node:fs";

const PORT = 4329;
const OUT = ".tmp/audit";
const SEITEN = ["/", "/funktionen/", "/funktionen/pipeline/", "/preise/", "/vergleich/", "/roadmap/", "/download/", "/alpha/", "/hilfe/", "/hilfe/erste-schritte/", "/blog/", "/blog/alpha-startet/", "/changelog/", "/ueber/", "/datenschutz/", "/impressum/", "/gibt-es-nicht/"];
const GERAETE = { desktop: { width: 1280, height: 860 }, handy: { width: 390, height: 844 } };

mkdirSync(OUT, { recursive: true });
const server = spawn("npx", ["astro", "preview", "--port", String(PORT)], { stdio: "ignore" });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
const browser = await chromium.launch({ executablePath: globSync("/opt/pw-browsers/chromium-*/chrome-linux/chrome").sort().reverse()[0] });
const funde = [];
try {
  for (const [geraet, viewport] of Object.entries(GERAETE)) {
    for (const theme of ["light", "dark"]) {
      const ctx = await browser.newContext({ viewport, colorScheme: theme === "dark" ? "dark" : "light", hasTouch: geraet === "handy", isMobile: geraet === "handy" });
      const page = await ctx.newPage();
      let ort = "";
      page.on("pageerror", (e) => funde.push({ geraet, theme, ort, art: "Laufzeitfehler", text: e.message }));
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const t = m.text();
        if (/api\/(alpha|version)|Failed to load resource/.test(t)) return; // ohne Functions im Preview erwartet
        funde.push({ geraet, theme, ort, art: "Konsole", text: t.slice(0, 200) });
      });
      for (const s of SEITEN) {
        ort = s;
        await page.goto(`http://localhost:${PORT}${s}`, { waitUntil: "networkidle" });
        await page.evaluate(async () => {
          // Alles einblenden lassen (Scroll-Animationen) und zurück nach oben.
          document.documentElement.style.scrollBehavior = "auto";
          for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
          scrollTo(0, 0);
        });
        await page.waitForTimeout(900);
        const unsichtbar = await page.evaluate(() => [...document.querySelectorAll(".rv:not(.an)")].length);
        if (unsichtbar) funde.push({ geraet, theme, ort, art: "Nicht eingeblendet", text: `${unsichtbar} Elemente` });
        const breite = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (breite > 1) funde.push({ geraet, theme, ort, art: "Seitliches Scrollen", text: `${breite}px` });
        const name = s === "/" ? "start" : s.replaceAll("/", "_").replace(/^_|_$/g, "");
        await page.screenshot({ path: `${OUT}/${geraet}-${theme}-${name}.png`, fullPage: s === "/" || s === "/alpha/" });
      }
      // Menüs
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
      if (geraet === "desktop") {
        await page.getByRole("button", { name: /Funktionen/ }).click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/${geraet}-${theme}-mega.png` });
        await page.keyboard.press("Escape");
      } else {
        await page.getByRole("button", { name: "Menü öffnen" }).click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/${geraet}-${theme}-burger.png` });
        await page.keyboard.press("Escape");
      }
      // Formular: leeres Weiter zeigt Fehler, gültiger Schritt 1 führt zu Schritt 2
      await page.goto(`http://localhost:${PORT}/alpha/`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Weiter/ }).click();
      if (!(await page.getByText("Bitte gib deinen Namen an.").isVisible())) funde.push({ geraet, theme, ort: "/alpha/", art: "Formular", text: "Fehlermeldung fehlt" });
      await page.fill("#f-name", "Test Person");
      await page.fill("#f-mail", "test@example.org");
      await page.locator('label:has(input[value="linux"])').click();
      await page.getByRole("button", { name: /Weiter/ }).click();
      await page.waitForTimeout(500);
      if (!(await page.getByText("In welcher Situation suchst du gerade?").isVisible())) funde.push({ geraet, theme, ort: "/alpha/", art: "Formular", text: "Schritt 2 nicht erreicht" });
      await page.screenshot({ path: `${OUT}/${geraet}-${theme}-formular2.png` });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
writeFileSync(`${OUT}/bericht.json`, JSON.stringify(funde, null, 2));
if (funde.length) {
  console.log(`${funde.length} Fund(e):`);
  for (const f of funde) console.log(`- [${f.geraet}/${f.theme}] ${f.ort} · ${f.art}: ${f.text}`);
  process.exit(1);
}
console.log(`Keine Funde. Screenshots: ${OUT}`);
