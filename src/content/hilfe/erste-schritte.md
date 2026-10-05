---
titel: Erste Schritte
beschreibung: cockpit unter Windows oder Linux installieren, beim ersten Start einrichten und die erste Bewerbung anlegen.
reihenfolge: 1
kategorie: Einstieg
stand: Oktober 2026
icon: rocket
---

## 1. Herunterladen

Auf der [Download-Seite](/download/) findest du die Datei für dein System:

| System | Datei |
|---|---|
| Windows 10/11 | `cockpit-windows-setup.exe` (oder `cockpit-windows.msi` für Firmenrechner) |
| Linux (fast alle Distributionen) | `cockpit-linux-x86_64.AppImage` |
| Debian, Ubuntu, Mint | `cockpit-linux-amd64.deb` |

macOS ist in Arbeit. Ungetestete Installer werden nicht veröffentlicht, deshalb folgt die Mac-Version erst nach einer Testphase auf echter Hardware.

## 2. Installieren

### Windows

Doppelklick auf die Datei. Die Installer sind noch nicht signiert, deshalb zeigt Windows einmal die Meldung *„Der Computer wurde durch Windows geschützt“*. Klick auf **Weitere Informationen → Trotzdem ausführen**. Bei neuen, kleinen Programmen ist das normal. Sobald cockpit signiert ist, fällt die Meldung weg.

### Linux (AppImage)

```
chmod +x cockpit-linux-x86_64.AppImage
./cockpit-linux-x86_64.AppImage
```

Startet das AppImage nicht, fehlt meist `libfuse2`. Unter Ubuntu hilft `sudo apt install libfuse2`.

### Linux (.deb)

```
sudo apt install ./cockpit-linux-amd64.deb
```

## 3. Erster Start

Beim ersten Start kommt eine kurze Einführung. Auf ihrer letzten Seite, **Schnell-Setup**, kannst du gleich:

- deinen **Alpha-Schlüssel** eintragen (siehe [Alpha-Schlüssel](/hilfe/alpha-schluessel/)),
- eine **KI** einrichten (siehe [KI einrichten](/hilfe/ki-einrichten/)).

Beides geht auch später unter **Einstellungen** (Zahnrad oben rechts).

## 4. Profil anlegen

Öffne **Profil** und lies deinen Lebenslauf ein (PDF oder Word). cockpit füllt Werdegang, Ausbildung und Skills aus, du prüfst und korrigierst. Unter *Schreibstil* beschreibst du, wie deine Anschreiben klingen sollen.

## 5. Erste Bewerbung

Drei Wege:

- **Stellen → Aggregation:** suchen, Treffer ansehen, *Übernehmen*. Die Stelle landet als Entwurf in der Pipeline.
- **Stellen → Erfassen:** Link oder Anzeigentext einfügen, cockpit legt die Bewerbung an.
- **Browser-Erweiterung:** auf der Anzeige im Browser **Diese Stelle speichern** klicken. Wie du sie installierst, steht auf der [Download-Seite](/download/).

In der **Pipeline** öffnest du die Karte, lässt ein Anschreiben entwerfen und schiebst sie nach dem Absenden auf *Beworben*. Unter *Übersicht* zeigt dir der Stichwort-Abgleich, welche Begriffe aus der Anzeige in deinen Unterlagen noch fehlen.

Tipp: <kbd>Strg</kbd>+<kbd>K</kbd> öffnet die Befehlspalette, damit kommst du zu jeder Ansicht und jeder Bewerbung.
