---
titel: Geräte abgleichen
beschreibung: "Sync über einen eigenen Cloud-Ordner oder den cockpit-Server einrichten, ein zweites Gerät hinzufügen und Probleme beim Abgleich lösen."
reihenfolge: 41
kategorie: Daten und Sicherheit
stand: Oktober 2026
icon: refresh-cw
---

Der Sync hält Laptop, PC und weitere Rechner auf demselben Stand. Er ist aus, bis du ihn einschaltest. Ohne Sync arbeitet cockpit vollständig auf einem Gerät.

## Zwei Wege

| | Ordner | cockpit-Server |
|---|---|---|
| **Kosten** | kostenlos | Pro, in der Alpha frei |
| **Voraussetzung** | ein Ordner, den OneDrive, Dropbox, Nextcloud oder iCloud Drive abgleicht, oder ein USB-Stick | keine |
| **Speicher** | so viel wie dein Cloud-Dienst bietet | 200 MB für den Sync, dazu Platz für drei Cloud-Sicherungen |

In beiden Fällen sehen Cloud-Dienst und Server nur verschlüsselte Pakete.

## Einrichten

1. **Einstellungen → Sync & Geräte**.
2. Methode wählen. Beim Ordner legt cockpit darin einen Unterordner `cockpit-sync` an.
3. Eine **Passphrase** festlegen und speichern. Sie liegt nur im Schlüsselbund deiner Geräte. Schreib sie zusätzlich auf: Ohne sie lässt sich nichts entschlüsseln, auch nicht vom Betreiber des Servers.
4. Den Abstand für den automatischen Abgleich wählen. Abgleichen kannst du jederzeit auch von Hand.

## Ein weiteres Gerät

cockpit auf dem zweiten Gerät installieren, dieselbe Methode und dieselbe Passphrase einrichten. Beim ersten Abgleich holt das Gerät alles vom ersten. Einstellungen und Profil eines frisch installierten Geräts überschreiben dabei nicht die echten Werte des anderen Geräts.

## Was abgeglichen wird

| Mit | Ohne |
|---|---|
| Bewerbungen mit Verlauf, Notizen und Aufgaben | API-Schlüssel und Mail-Passwörter |
| Kontakte und Erinnerungen | Lizenzschlüssel |
| Profil und Dokumente bis 10 MB | Fenstergröße und Trefferfilter |
| Stellenquellen und Treffer | Ansicht der Pipeline (Board oder Liste) |
| Mail-Konten (ohne Passwort), Antwortregeln, abgerufene Mails | |
| Einstellungen, Erscheinungsbild, Wochenziel | |

Haben zwei Geräte denselben Eintrag geändert, gilt die jüngere Änderung. Der Verlauf unter **Letzte Abgleiche** zeigt, was passiert ist.

## Cloud-Sicherungen

Mit dem cockpit-Server legt cockpit zusätzlich die drei neuesten [Sicherungen](/hilfe/daten-sichern/#sicherungen-in-der-cloud) verschlüsselt dort ab. Damit holst du deine Daten auch dann zurück, wenn ein Rechner ausfällt.

## Wenn etwas fehlt

- **Auf allen Geräten dieselbe Passphrase?** Pakete mit einer anderen Passphrase lassen sich nicht lesen und werden übersprungen.
- **Ordner wirklich heruntergeladen?** Manche Cloud-Programme legen Dateien nur als Platzhalter an. Stell den Ordner auf „immer auf diesem Gerät behalten“.
- **Alles neu senden:** Fehlen auf einem Gerät Einträge, schickt **Alles neu senden** auf dem Gerät mit den vollständigen Daten einmal alle Daten neu, auch solche, die sich lange nicht geändert haben.
- **Methode oder Ordner gewechselt?** Dann sendet cockpit beim nächsten Abgleich automatisch alles neu.
- Eine einzelne fehlerhafte Zeile hält den Abgleich nicht mehr auf. cockpit überspringt sie und meldet es im Verlauf.
