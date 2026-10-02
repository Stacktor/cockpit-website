// Erzeugt public/og.png (1200 × 630) — Vorschaubild für Links in sozialen
// Netzen und Messengern: Logo, Claim, aktueller App-Screenshot.
//   node scripts/og.mjs
import { chromium } from "playwright-core";
import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const datei = (p) => readFileSync(join(root, p));
const logo = datei("public/favicon.svg").toString("base64");
const bild = datei("src/assets/screens/light-pipeline.png").toString("base64");
const exe =
  process.env.CHROMIUM ||
  globSync("/opt/pw-browsers/chromium-*/chrome-linux/chrome").sort().reverse()[0];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Geist; src: url(data:font/woff2;base64,${datei(
    "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  ).toString("base64")}) format("woff2"); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; font-family: Geist, sans-serif;
    background: radial-gradient(900px 500px at -10% -20%, #c7d2fe 0%, transparent 60%),
                radial-gradient(700px 500px at 110% 120%, #a5f3fc 0%, transparent 60%), #fff; color: #0f172a; }
  .marke { position: absolute; left: 72px; top: 76px; display: flex; align-items: center; gap: 16px;
    font-size: 30px; font-weight: 650; letter-spacing: -0.02em; }
  .marke img { width: 52px; height: 52px; }
  .marke b { background: linear-gradient(90deg, #4f46e5, #06b6d4); -webkit-background-clip: text; color: transparent; }
  h1 { position: absolute; left: 72px; top: 168px; width: 560px; font-size: 58px; line-height: 1.06;
    letter-spacing: -0.035em; font-weight: 700; }
  h1 span { background: linear-gradient(90deg, #4f46e5, #06b6d4); -webkit-background-clip: text; color: transparent; }
  p { position: absolute; left: 72px; top: 380px; width: 540px; font-size: 23px; line-height: 1.4; color: #475569; }
  .pille { position: absolute; left: 72px; top: 530px; padding: 10px 18px; border-radius: 999px;
    background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; font-size: 19px; font-weight: 600; }
  .schirm { position: absolute; left: 680px; top: 104px; width: 760px; border-radius: 14px; overflow: hidden;
    box-shadow: 0 30px 80px -20px rgba(15, 23, 42, .35), 0 0 0 1px rgba(15, 23, 42, .08);
    transform: perspective(1400px) rotateY(-12deg) rotateX(3deg); transform-origin: left center; }
  .schirm img { display: block; width: 100%; }
</style></head><body>
  <div class="marke"><img src="data:image/svg+xml;base64,${logo}"><span>Bewerbungs-<b>Cockpit</b></span></div>
  <h1>Bewerbungen organisieren. <span>Ohne Cloud, ohne Konto.</span></h1>
  <p>Pipeline, Stellensuche, KI-Anschreiben und Browser-Erweiterung. Deine Daten bleiben auf deinem Rechner.</p>
  <div class="pille">0.1 Alpha · Windows &amp; Linux</div>
  <div class="schirm"><img src="data:image/png;base64,${bild}"></div>
</body></html>`;

const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: join(root, "public", "og.png") });
await b.close();
console.log("public/og.png geschrieben");
