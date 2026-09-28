# cockpit-website

Website von **Bewerbungs-Cockpit** — [cockpit.mesco.cc](https://cockpit.mesco.cc).
Statische Seiten mit [Astro](https://astro.build), Server-Funktionen als Cloudflare Pages Functions.

```
src/            Seiten, Komponenten, Inhalte (Astro)
  content/      Funktionen, Blog, Hilfe-Center als Markdown
  legal/        Rechtstexte (werden unverändert eingebunden)
  assets/       App-Screenshots (hell/dunkel) — Astro macht WebP daraus
public/         Dateien 1:1 (Favicon, og.png, _redirects, _headers, admin/)
functions/      Cloudflare Pages Functions (/api/…)
lib/            Gemeinsamer Code der Functions (und Formular-Optionen)
tests/          Tests der Functions ohne Cloudflare (npm run test:api)
scripts/        Sichtprüfung aller Seiten (npm run audit)
```

## Befehle

```bash
npm install
npm run dev        # lokale Vorschau (ohne Functions)
npm run build      # nach dist/
npm run check      # Typprüfung
npm run test:api   # Functions-Tests (KV, Lemon Squeezy, Resend simuliert)
npm run audit      # nach build: jede Seite Desktop/Handy, Hell/Dunkel
```

## Cloudflare Pages — Einstellungen

| Einstellung | Wert |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leer)* |
| Umgebungsvariable `NODE_VERSION` | `22` |

Die Functions in `functions/` erkennt Cloudflare weiterhin automatisch.

Variablen und Secrets der Functions: `ALPHA` (KV-Namespace), `RESEND_API_KEY`, `MAIL_VON`, `MAIL_AN`,
optional `ALPHA_PLAETZE` (Standard 50), `DISCORD_URL`, `ALPHA_VARIANT_IDS`, für das Admin-Portal
`ACCESS_TEAM_DOMAIN` und `ACCESS_AUD`.

## Inhalte pflegen

- **Blogbeitrag:** neue Datei in `src/content/blog/` (Vorlage: ein bestehender Beitrag).
- **Hilfe-Artikel:** `src/content/hilfe/`.
- **Funktionen:** `src/content/funktionen/` — `screen` verweist auf ein Bild in `src/assets/screens/`.
- **Changelog:** `src/pages/changelog.astro`, neueste Version oben.
- **Discord-Link, Plätze-Fallback:** `src/config.ts`.
- **Screenshots erneuern:** im App-Repo den Screenshot-Modus bauen und `light-<id>.png` /
  `dark-<id>.png` (1440 × 900) in `src/assets/screens/` ersetzen.
