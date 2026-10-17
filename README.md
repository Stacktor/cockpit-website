# cockpit-website

Quellcode der Website von **Bewerbungs-Cockpit**: **[cockpit.mesco.cc](https://cockpit.mesco.cc)**

cockpit ist ein Bewerbungsmanager für Windows, Linux und macOS, der die Daten auf dem Gerät lässt:
Pipeline, Stellensuche, KI-Anschreiben mit eigenem Schlüssel oder lokalem Modell, Inbox, Kalender
und Interview-Training. Er ist in der geschlossenen **0.1 Alpha**.
[Alpha-Zugang anfragen](https://cockpit.mesco.cc/alpha/) · Installer: signierte Dateien über GitHub, persönliche Alpha-Lizenz erforderlich · [Hilfe-Center](https://cockpit.mesco.cc/hilfe/)

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
public/         Dateien 1:1 (Favicon, og.png, _headers, _redirects, film/ mit dem Produktfilm)
functions/      Cloudflare Pages Functions (/api/…, /api/admin/…)
lib/            Gemeinsamer Code der Functions
tests/          Tests der Functions ohne Cloudflare
scripts/        Sichtprüfung aller Seiten
```

Seitenaufrufe zählt `functions/_middleware.js` auf dem Server (`lib/seitenzaehler.js`): ohne Cookie, ohne Skript im Browser,
ohne IP-Adresse, nur Tagessummen je Seite, Herkunft, Land, Gerät und Kampagne in KV (`seiten:<tag>`). Das Admin zeigt sie unter
Analytics. `public/_routes.json` nimmt Dateien unter `/_astro` und die Bilder aus, damit nur Seiten die Function aufrufen.
Die Oberfläche der App auf der Startseite ist gebaut (`src/components/MockApp.astro`, Ansichten start, pipeline, stellen, inbox,
interview, lebenslauf), nicht als Screenshot; zurück auf Bilder mit `MOCK_AN = false` in `Screen.astro`.

Gestaltung wie der Produktfilm (Motion Design): warmes Papierweiß, drei sehr zarte Farbflächen
(Indigo, Cyan, Violett), die langsam hinter der ganzen Seite wandern (`.hintergrund` in `Base.astro`),
kräftige Geist-Überschriften mit Verlaufswort (`.grad`), Glas-Karten (`.glas`), App-Fenster in
leichter 3D-Neigung (`.fenster3d`) und Pillen-Knöpfe. Bei „Bewegung reduzieren“ steht alles still.
Hell und Dunkel folgen der Systemeinstellung. Der Film (`public/film/cockpit-film.mp4`, 1080p ohne Ton, 19 MB,
unter dem Limit von 25 MB je Datei bei Cloudflare Pages) liegt selbst gehostet im Abschnitt
`FilmSektion.astro`; neu erzeugen aus dem 4K-Film mit `ffmpeg … -crf 23 -maxrate 1900k`
(siehe Wiki „Produktfilm 4K“).

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
| Hilfe-Artikel | `src/content/hilfe/`, mit `kategorie` aus `src/lib/hilfe-kategorien.ts` |
| Funktionsseite | `src/content/funktionen/` (`screen` verweist auf ein Bild in `src/assets/screens/`) |
| Changelog | `src/pages/changelog.astro`, neueste Version oben |
| Screenshots | `light-<id>.png` / `dark-<id>.png` (1440 × 900) in `src/assets/screens/` ersetzen |

Blog, Hilfe, Funktionen und Roadmap lassen sich auch im Admin unter **Inhalte** bearbeiten. Der
Editor zeigt eine Live-Vorschau, prüft die Texte nach dem Leitfaden und speichert als Commit auf
`main`. Dafür braucht es im Admin-Tresor den Eintrag `GITHUB_INHALT_TOKEN` (Fine-grained Token,
„Contents: Read and write“ nur für dieses Repo).

Texte folgen dem Leitfaden im Doku-Repo (`leitfaeden/texte.md`): Stimme des Unternehmens, Anrede
„du“, keine Emojis, keine Gedankenstriche als Stilmittel.

## Admin

`/admin/` ist nur über Cloudflare Access erreichbar (Fallback: `ADMIN_TOKEN`). Schlüssel für
Keygen, Polar, Lemon Squeezy, Resend, Cloudflare und GitHub liegen verschlüsselt im Tresor (KV, Schlüssel
`ADMIN_MASTER_KEY`). Das Admin folgt dem System-Theme oder wird im Kopf auf Hell oder Dunkel gestellt.

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
[Issue](https://github.com/Stacktor/cockpit-website/issues) in diesem Repo. Sicherheitslücken
bitte nach [SECURITY.md](SECURITY.md) melden.

## Geschlossene Alpha mit Keygen

Neue Alpha-Schlüssel beginnen mit `COCKPIT-KG-`. Der kostenlose Zugang benötigt keinen Checkout und kein Kundenkonto bei Keygen. Das Admin stellt persönliche Lizenzen aus und sendet sie über Resend; bis zu drei Geräte pro Lizenz, erste Aktivierung online, danach bis zu 30 Tage Offline-Karenz. Pro- und ältere Polar-/Lemon-Squeezy-Wege bleiben bestehen.

Im Admin-Tresor: `KEYGEN_PRODUCT_TOKEN` (nur cockpit-Produkt, bisher zehn begrenzte Lizenz-/Geräterechte; für dauerhafte Löschung zusätzlich license.delete), `KEYGEN_ACCOUNT_ID`, `KEYGEN_PRODUCT_ID`, `KEYGEN_ALPHA_POLICY_ID`. `ALPHA_DOWNLOAD_URL` erst setzen, wenn ein signierter Installer mit verpflichtender Aktivierung veröffentlicht ist. Solange der Link fehlt, bleiben Einladungen gesperrt. Lizenz-ID wird beim ersten Versuch gespeichert; Schlüssel bleiben bei Keygen und werden bei einer Mail-Wiederholung geladen. Namen und E-Mail werden zur Lizenzzuordnung an Keygen übermittelt.

Downloads und automatische Updates liegen im öffentlichen Repo `Stacktor/cockpit-releases`. Alte Installer erhalten keine rückwirkende Sperre; neue Builds zuerst über dev prüfen, die normale Freigabe folgt nach dem Main-Merge des Nutzers.

## Arbeitszentrale und Betriebsindex (Ausbau Oktober 2026)

Die neue Navigation trennt Menschen und Zugang, Feedback, Betrieb und Inhalte. Lizenzen lassen sich suchen, nach Zustand/Anbieter/System/Version filtern, anlegen, ändern und archivieren. Die Detailansicht zeigt Person, Gerätelimit, tatsächliche Geräte, Kontakte/Prüfzeitpunkte und getrennte Speicherbereiche. Schlüssel bleiben standardmäßig verdeckt.

Dafür benötigt das Pages-Projekt ein **D1-Binding `BETRIEB`** zusätzlich zu KV/Tresor und R2. Schema: `migrations/0001_betrieb.sql`. Zuerst in einer Vorschau-Datenbank anwenden, dann im Zielkonto eine D1-Datenbank erstellen, die SQL-Migration anwenden, unter Pages → Settings → Bindings als `BETRIEB` verbinden und neu bereitstellen. Im Admin unter Betrieb den Bindungsstatus prüfen und die idempotente Bestandsübernahme starten (`POST /api/admin/betrieb`, Aktion `migrieren`). Sie übernimmt Keygen-Referenzen, vorhandene Kontaktmetadaten und R2-Zuordnungen. Sie verschiebt oder entschlüsselt keine Dateien. Am 17.10.2026 ist `cockpit-betrieb` in EU-Jurisdiktion erstellt und das Schema mit neun Anwendungstabellen bestätigt. Das produktive Pages-Binding `BETRIEB` ist vorbereitet/gespeichert und wird erst mit dem nächsten Deployment wirksam; Live-Migration und Abnahme folgen.

Keygen bleibt die Wahrheit für Lizenzgültigkeit und Geräte. D1 enthält keine Rohschlüssel oder Bewerbungsinhalte. Der verschlüsselte Speicher bleibt unter `l/<kanonische Lizenz-ID>/`; eine dauerhafte Zuordnungszeile erhält Person/Referenz auch nach einer Lizenzlöschung. Letzter Kontakt und letzte echte Anbieterprüfung sind unterschiedliche Zeitpunkte. Ein gecachtes Prüfergebnis bekommt keinen vorgetäuschten neuen Prüfzeitpunkt.

Archivieren sperrt eine Lizenz; Wiederherstellen hebt die Sperre auf. Dauerhaftes Löschen verlangt eine bereits archivierte Lizenz und ihre genaue ID. Der Produkttoken benötigt dafür zusätzlich `license.delete`; fehlt das Recht, meldet das Admin einen klaren Fehler. Cloud-Dateien werden separat und ausdrücklich gelöscht. Der korrekt begrenzte Ersatz des produktiven Tokens und der Widerruf alter/unbenutzter Tokens warten auf die gesonderte Freigabe. Der erste neue, falsch begrenzte Token wurde nicht verbunden.

Manuell versendete Umfragen sind unveränderliche D1-Aussendungen mit eigenem Cursor und optionaler Zielgruppe (Lizenz, System, Version). Aktive Apps fragen etwa alle zehn Sekunden nach Neuem; Fehler führen zu längeren Abständen. Zustellung, Öffnung und Antwort werden getrennt gezählt. Die Auswertung zeigt eine Frage oder Einzelantwort statt vieler paralleler Balken; kleine Stichproben werden kenntlich gemacht. Ohne D1 gibt es keine manuelle Sofortaussendung.

Prüfung: `npm run test:api` verwendet lokale SQLite-D1- und Anbieter-Fixtures, `npm run check` prüft die Oberfläche, `npm run build` erzeugt die Website. `node tests/admin-ui.mjs --serve` startet nach dem Build eine isolierte Admin-Vorschau auf Port 4330; hier angelegte Beispieldaten und Mails gelangen nicht zu echten Diensten. Browserbedienung über die Computersteuerung prüfen. Eine produktive Einrichtung und ein vollständiger eigener Einladungs-/Installationstest bleiben separate Abnahmen.


### App-Freigabeanschluss, 17.10.2026

Website32 produktiv. Separater GitHub-Token nach ausdrücklicher Nutzerentscheidung ohne Ablauf, ausschließlich App-Repo mit Actions RW, Contents/Pull requests/Metadata read; verschlüsselt im Admin-Tresor verbunden. Kein Rohwert in Dateien oder Protokollen. Der Verbindungstest prüft lesend den festen App-Workflow-Endpunkt; Schreibrecht erst durch bewusst gestarteten Testbuild, keine automatische Alpha-Freigabe. Der Alpha-Basisbau ist am Linux-Quellarchivdatum gescheitert; App-PR196 behebt das separat vom Onboarding-Hotfix193.
