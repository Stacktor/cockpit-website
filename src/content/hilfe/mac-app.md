---
titel: Die Mac-App
beschreibung: Installieren, die Warnung beim ersten Öffnen, Schlüsselbund-Abfragen, Updates, wo die Sicherungen liegen und was hilft, wenn etwas hängt.
reihenfolge: 4
kategorie: Einstieg
stand: Oktober 2026
icon: monitor
---

Die Mac-App ist eine eigene App für macOS 26 oder neuer auf einem Mac mit Apple Silicon (M1 oder neuer). Sie nutzt denselben Kern wie die Windows- und Linux-Fassung, dazu kommen Apple Intelligence (wo verfügbar), Termine im Apple Kalender und Systemmitteilungen.

## Installieren

1. Die ZIP-Datei von der [Download-Seite](/download/) laden und per Doppelklick entpacken.
2. **cockpit Alpha** in den Ordner *Programme* ziehen. Nur dort kann sich die App später selbst aktualisieren.
3. Öffnen und den Schlüssel aus der Einladung eintragen (siehe [Alpha-Schlüssel](/hilfe/alpha-schluessel/)).

## Warnung beim ersten Öffnen

Die Mac-App ist signiert, aber noch nicht von Apple beglaubigt („notarisiert“). Deshalb fragt macOS beim ersten Öffnen nach:

- **„… aus dem Internet geladen. Möchtest du sie öffnen?“** Mit **Öffnen** bestätigen.
- **Zeigt macOS nur „Fertig“ oder „In den Papierkorb legen“,** öffne die **Systemeinstellungen → Datenschutz & Sicherheit**, scrolle nach unten und wähle bei cockpit **Trotzdem öffnen**. Die genaue Beschriftung hängt von der macOS-Version ab.

Das passiert einmal pro installierter Version. Lade cockpit nur von dieser Website oder aus der Einladung.

## Schlüsselbund

Lizenzschlüssel, Mail-Passwörter und KI-Schlüssel liegen verschlüsselt im Schlüsselbund von macOS, nie in einer Datei neben der Datenbank. macOS fragt deshalb beim ersten Start und, weil die App bei jeder neuen Version neu signiert wird, eventuell nach einem Update erneut.

- Wähle **Immer erlauben** und gib dein **Mac-Passwort in dem Fenster von macOS** ein. cockpit selbst fragt nie nach deinem Passwort und sieht es nie.
- Wählst du **Ablehnen**, startet cockpit weiter, kann aber bis zum nächsten Start nicht auf die Schlüssel zugreifen. Dein Tresor wird dabei nicht überschrieben.

## Updates

*Einstellungen → System* zeigt, ob eine neue Version da ist, und fasst zusammen, was sich geändert hat: nach **Neu**, **Verbessert** und **Behoben** gegliedert, mit den Änderungen für den Mac zuerst. Auf **Jetzt installieren** lädt cockpit das Update, prüft die Signatur, sichert deine Daten, ersetzt die App und startet neu. Bei eingeschalteter automatischer Prüfung sucht cockpit beim Start und danach stündlich; installiert wird nie ohne deinen Klick.

**Wichtig bei Version 0.1.2:** Diese Version hat einen Fehler beim Neustart nach einem Update. cockpit zeigt „Installiert, cockpit startet neu“ und bleibt dann hängen. Das Update ist trotzdem installiert. **Beende cockpit** (⌘Q, bei Bedarf *Sofort beenden* über das Apfel-Menü) und **öffne es neu**; deine Daten sind nicht betroffen. Ab der nächsten Version ist das behoben.

## Wo liegen meine Daten und Sicherungen?

- **Datenbank und Dokumente:** `~/Library/Application Support/com.stacktor.cockpit` (*Einstellungen → System → Datenordner öffnen* führt hin).
- **Automatische Sicherungen:** In einen Ordner **Cockpit Backups** im App-Datenordner. Hattest du schon einen Ordner *Cockpit Backups* unter *Dokumente*, bleibt er in Gebrauch, ebenso ein selbst gewählter Ordner (*Einstellungen → Sicherungen*). Liegt dein Ordner *Dokumente* in iCloud, kann ein ausgelagerter Ordner das Sichern blockieren; wähle dann einen lokalen Ordner.

Mehr dazu: [Daten sichern und umziehen](/hilfe/daten-sichern/).

## Wenn etwas hängt oder nicht startet

- **cockpit startet nach dem Update nicht:** App beenden und erneut aus *Programme* öffnen.
- **Es kommt keine Schlüsselbund-Abfrage, aber die App wartet:** Schau im Dock und hinter anderen Fenstern nach dem Dialog; er kann verdeckt sein.
- **„Der Ordner von cockpit ist nicht beschreibbar“ beim Update:** Die App liegt nicht in *Programme* oder gehört einem anderen Benutzer. In *Programme* ziehen und das Update erneut starten.
- **Sicherung dauert ewig oder bricht ab:** In *Einstellungen → Sicherungen* einen lokalen Ordner wählen (nicht in iCloud oder auf einem Netzlaufwerk).

Hilft das nicht, melde den Fehler in der App unter *Feedback geben → Fehler melden* oder schreib an [Kontakt@mesco.cc](mailto:Kontakt@mesco.cc). Weitere Lösungen: [Probleme lösen](/hilfe/probleme/).
