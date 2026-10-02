# cockpit-website

Quellcode der Website von **Bewerbungs-Cockpit**: **[cockpit.mesco.cc](https://cockpit.mesco.cc)**

cockpit ist ein Bewerbungsmanager für Windows und Linux, der deine Daten auf deinem Gerät lässt:
Pipeline, Stellensuche, KI-Anschreiben mit eigenem Schlüssel oder lokalem Modell, Inbox und
Interview-Training. Er ist gerade in der geschlossenen **0.1 Alpha**.
→ [Alpha-Zugang anfragen](https://cockpit.mesco.cc/alpha/) · [Downloads](https://github.com/Stacktor/cockpit-releases)

---

## Aufbau

Statische Seiten mit [Astro](https://astro.build); die wenigen Server-Funktionen laufen als
Cloudflare Pages Functions. Die Website kommt ohne Tracking-Cookies und ohne externe Schriften
oder Skripte aus. Schriften (Geist, JetBrains Mono) und Symbole werden selbst ausgeliefert.

```
src/            Seiten, Komponenten, Inhalte (Astro)
  content/      Funktionen, Blog, Hilfe-Center als Markdown
  legal/        Rechtstexte
  assets/       App-Screenshots (hell/dunkel), Astro erzeugt WebP daraus
  styles/       Design-Tokens und Grundbausteine (global.css)
public/         Dateien 1:1 (Favicon, og.png, _headers, _redirects)
functions/      Cloudflare Pages Functions (/api/…)
lib/            Gemeinsamer Code der Functions
tests/          Tests der Functions ohne Cloudflare
scripts/        Sichtprüfung aller Seiten
```

Gestaltung: weiße Flächen, Indigo `#4F46E5` mit Cyan `#06B6D4`, Geist als Schrift, 8-px-Radien
und Pillen-Knöpfe. Hinter dem Hero liegt ein WebGL-Verlauf, der nur läuft, solange er sichtbar
ist, und bei „Bewegung reduzieren“ stillsteht. Hell und Dunkel folgen der Systemeinstellung.

## Lokal starten

Voraussetzung: Node.js 22.

```bash
npm install
npm run dev          # Vorschau unter http://localhost:4321 (ohne Functions)
npm run build        # statische Seiten nach dist/
npm run check        # Typprüfung
npm run test:api     # Tests der Functions (KV und externe Dienste simuliert)
npm run audit        # nach build: jede Seite auf Desktop/Handy, hell/dunkel
```

## Inhalte pflegen

| Was | Wo |
|---|---|
| Blogbeitrag | neue Markdown-Datei in `src/content/blog/` |
| Hilfe-Artikel | `src/content/hilfe/` |
| Funktionsseite | `src/content/funktionen/` (`screen` verweist auf ein Bild in `src/assets/screens/`) |
| Changelog | `src/pages/changelog.astro`, neueste Version oben |
| Screenshots | `light-<id>.png` / `dark-<id>.png` (1440 × 900) in `src/assets/screens/` ersetzen |

## Sync-Server

`/api/sync/*` speichert die Ende-zu-Ende verschlüsselten Sync-Pakete der App (Pro und Alpha).
Dafür braucht das Pages-Projekt einen R2-Bucket mit dem Binding `SYNC`
(Einstellungen → Functions → R2-Bucket-Bindungen). Ohne Binding antwortet die API mit 503 und
die App meldet „Sync-Server noch nicht eingerichtet“. Grenzen: 11 MB je Datei, 200 MB je Lizenz.
Im Admin zeigt `/api/admin/sync` den Speicher je Lizenz und kann ihn leeren.

## Datenschutz

Die Anmeldung zur Alpha und Fehlerberichte aus der App landen in Cloudflare KV. Fehlerberichte
gehen auch ohne Lizenz, dann anonym. IP-Adressen werden nicht gespeichert; für das Rate-Limit
zählt nur ein täglich wechselnder Hash. Alles Weitere steht in der
[Datenschutzerklärung](https://cockpit.mesco.cc/datenschutz/).

## Kontakt

Fragen, Hinweise oder ein Fehler auf der Seite: über die Website oder als
[Issue](https://github.com/Stacktor/cockpit-website/issues) in diesem Repo.
