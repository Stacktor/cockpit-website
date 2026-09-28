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
npm run test:api   # Functions-Tests inkl. Admin-API (KV, Lemon Squeezy, Resend simuliert)
npm run audit      # nach build: jede Seite Desktop/Handy, Hell/Dunkel
npm run audit:admin  # nach build: Admin-Dashboard mit echten Handlern und Beispieldaten
```

## Cloudflare Pages — Einstellungen

| Einstellung | Wert |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leer)* |
| Umgebungsvariable `NODE_VERSION` | `22` |

Die Functions in `functions/` erkennt Cloudflare weiterhin automatisch.

Pflicht für die Functions: KV-Namespace `ALPHA`. Für das Admin-Portal außerdem:

| Name | Art | Wozu |
|---|---|---|
| `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` | Variable | Prüfung des Cloudflare-Access-JWT (Anwendung für `/admin` **und** `/api/admin`) |
| `ADMIN_MASTER_KEY` | Secret | Verschlüsselt die im Dashboard eingetragenen API-Schlüssel (mind. 16 zufällige Zeichen) |
| `ADMIN_TOKEN` | Secret, optional | Notzugang `/admin/?token=…`, falls Access nicht geht |

Alle übrigen Schlüssel und Einstellungen (Lemon Squeezy, Resend, Cloudflare Analytics, GitHub,
Store-/Variant-ID, Checkout-Link, Discord, Absender) trägst du im Dashboard unter **Einstellungen**
ein. Umgebungsvariablen gleichen Namens (`RESEND_API_KEY`, `MAIL_VON`, …) gelten weiter als Rückfall.
Optional: `ALPHA_PLAETZE` (Standard 50; im Dashboard änderbar), `ALPHA_VARIANT_IDS`.

## Admin-Portal (`/admin/`)

Dunkles Dashboard mit Übersicht, Alpha-Anmeldungen (Status, Einladung mit 100-%-Code und Mail),
Umfragen (Editor + Auswertung mit NPS und Van Westendorp, CSV), Fehlerberichten, Lizenzen,
Kunden & Umsatz, Mail (Rundmail an Tester), Analytics, Downloads & Builds und Einstellungen
(Schlüssel-Tresor, Audit-Log). Code: `src/pages/admin/`, `src/scripts/admin/`, `functions/api/admin/`,
`lib/admin/`. Schreibzugriffe nur als JSON von der eigenen Seite; jede Änderung landet im Audit-Log.

## Inhalte pflegen

- **Blogbeitrag:** neue Datei in `src/content/blog/` (Vorlage: ein bestehender Beitrag).
- **Hilfe-Artikel:** `src/content/hilfe/`.
- **Funktionen:** `src/content/funktionen/` — `screen` verweist auf ein Bild in `src/assets/screens/`.
- **Changelog:** `src/pages/changelog.astro`, neueste Version oben.
- **Discord-Link, Plätze-Fallback:** `src/config.ts`.
- **Screenshots erneuern:** im App-Repo den Screenshot-Modus bauen und `light-<id>.png` /
  `dark-<id>.png` (1440 × 900) in `src/assets/screens/` ersetzen.
