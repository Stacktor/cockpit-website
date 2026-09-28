---
titel: Erste Schritte
beschreibung: cockpit unter Windows oder Linux installieren, beim ersten Start einrichten und die erste Bewerbung anlegen.
reihenfolge: 1
icon: rocket
---

## 1. Herunterladen

Auf der [Download-Seite](/download/) findest du die Datei für dein System:

| System | Datei |
|---|---|
| Windows 10/11 | `cockpit-windows-setup.exe` |
| Linux (fast alle Distributionen) | `cockpit-linux-x86_64.AppImage` |
| Debian, Ubuntu, Mint | `cockpit-linux-amd64.deb` |

macOS ist noch in Arbeit — ich habe gerade keinen Mac zum Testen, und ungetestete Installer gebe ich nicht raus.

## 2. Installieren

### Windows

Doppelklick auf die Datei. Weil die Installer noch nicht code-signiert sind, zeigt Windows einmalig die Meldung *„Der Computer wurde durch Windows geschützt"*. Klick auf **Weitere Informationen → Trotzdem ausführen**. Das ist bei neuen, kleinen Programmen normal und verschwindet, sobald cockpit signiert ist.

### Linux (AppImage)

```
chmod +x cockpit-linux-x86_64.AppImage
./cockpit-linux-x86_64.AppImage
```

Startet das AppImage nicht, fehlt meist `libfuse2` — unter Ubuntu: `sudo apt install libfuse2`.

### Linux (.deb)

```
sudo apt install ./cockpit-linux-amd64.deb
```

## 3. Erster Start

Beim ersten Start begrüßt dich eine kurze Einführung. Auf der letzten Seite, **Schnell-Setup**, kannst du gleich:

- deinen **Alpha-Schlüssel** eintragen (siehe [Alpha-Schlüssel](/hilfe/alpha-schluessel/)),
- eine **KI** einrichten (siehe [KI einrichten](/hilfe/ki-einrichten/)).

Beides geht auch später unter **Einstellungen** (Zahnrad oben rechts).

## 4. Profil anlegen

Öffne **Profil** und lies deinen Lebenslauf ein. cockpit füllt Werdegang, Ausbildung und Skills — du prüfst und korrigierst. Unter *Stil* beschreibst du, wie deine Anschreiben klingen sollen.

## 5. Erste Bewerbung

Zwei Wege:

- **Stellen → Aggregation**: suchen, Treffer ansehen, *Übernehmen* — die Stelle landet als Entwurf in der Pipeline.
- **Stellen → Erfassen**: Link oder Anzeigentext einfügen, cockpit legt die Bewerbung an.

In der **Pipeline** öffnest du die Karte, lässt ein Anschreiben entwerfen und schiebst sie nach dem Absenden auf *Beworben*.

Fertig. Tipp: Mit <kbd>Strg</kbd>+<kbd>K</kbd> erreichst du jede Ansicht und jede Bewerbung über die Befehlspalette.
