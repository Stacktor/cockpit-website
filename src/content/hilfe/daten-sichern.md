---
titel: Daten sichern & umziehen
beschreibung: Wie cockpit deine Daten von selbst sichert, wie du einen alten Stand zurückholst, mehrere Geräte abgleichst und auf einen neuen Rechner umziehst.
reihenfolge: 40
kategorie: Daten und Sicherheit
stand: Oktober 2026
icon: hard-drive
---

cockpit speichert alles lokal in einer SQLite-Datenbank und sichert sie selbstständig, ähnlich wie Time Machine auf dem Mac. Du musst dafür nichts einrichten.

## Automatische Sicherungen

Standardmäßig legt cockpit **einmal am Tag** eine Sicherung an, dazu **vor jedem Update**. Schlägt die Sicherung vor einem Update fehl, wird das Update nicht installiert.

Die Sicherungen liegen in **Dokumente/Cockpit Backups**. Jeder Stand ist ein eigener Ordner mit Datum und Uhrzeit im Namen, etwa `2026-10-03_14-30-05_automatisch`. Darin stecken:

- `cockpit.db`: die komplette Datenbank mit Bewerbungen, Profil, Stellen, Kontakten, Erinnerungen, Mails und Einstellungen
- `dokumente/`: deine Dateien wie Lebenslauf und Zeugnisse
- `info.json`: wann und warum der Stand entstand

Passwörter und API-Schlüssel kommen absichtlich **nicht** mit. Sie bleiben im Schlüsselbund deines Betriebssystems.

Unter **Einstellungen → Sicherungen** stellst du den Rhythmus auf täglich, wöchentlich oder aus, wählst einen anderen Ordner oder sicherst mit **Jetzt sichern** sofort.

### Sicherungen in der Cloud

Gleichst du deine Geräte über den **cockpit-Server** ab (Pro und Alpha), legt cockpit die drei neuesten Sicherungen zusätzlich dort ab. Sie sind mit deiner Sync-Passphrase verschlüsselt, genau wie der Sync. Geht dein Rechner kaputt, richtest du auf dem neuen Gerät den Sync mit derselben Passphrase ein und holst unter **Einstellungen → Sicherungen → In der Cloud** einen Stand zurück. Abschalten kannst du das an derselben Stelle mit **Auch in der Cloud sichern**.

### Wie lange Sicherungen bleiben

Damit der Ordner nicht vollläuft, dünnt cockpit alte automatische Stände aus:

- Aus den letzten 48 Stunden bleiben alle.
- Danach bleibt einer pro Tag für zwei Wochen, einer pro Woche für drei Monate und einer pro Monat für ein Jahr.
- Von den Ständen vor einem Update bleiben die fünf neuesten.
- Was du selbst mit „Jetzt sichern“ anlegst, löscht cockpit nie.

Unveränderte Dokumente legt cockpit als Verweis auf den vorigen Stand an statt als zweite Kopie. Jeder Stand bleibt trotzdem vollständig und lässt sich einzeln löschen.

## Etwas zurückholen

Unter **Einstellungen → Sicherungen** siehst du alle Stände als Zeitleiste. Wählst du einen aus, zeigt cockpit, was seitdem dazugekommen, geändert oder gelöscht wurde.

- **Eine einzelne Bewerbung:** Neben jeder gelöschten oder geänderten Bewerbung steht **Zurückholen**. cockpit holt sie samt Notizen, Verlauf, Kontakten, Erinnerungen und Dokumenten zurück. Alles andere bleibt, wie es ist.
- **Den ganzen Stand:** **Diesen Stand wiederherstellen** ersetzt alle Daten durch den gewählten Stand. Vorher sichert cockpit deinen jetzigen Stand, du kannst also jederzeit zurück. Danach startet die App neu.

Nutzt du den Geräte-Sync, wandert ein wiederhergestellter Stand als neueste Änderung zu deinen anderen Geräten.

## Mehrere Geräte abgleichen

Unter **Einstellungen → Sync & Geräte** hältst du zwei oder mehr Rechner auf demselben Stand. Es gibt zwei Wege:

- **Ordner (kostenlos):** Du wählst einen Ordner, den dein Cloud-Speicher ohnehin abgleicht, etwa Nextcloud, OneDrive oder Dropbox. cockpit legt dort verschlüsselte Pakete ab.
- **cockpit-Server (Pro und Alpha):** Kein eigener Cloud-Speicher nötig. Der Server bekommt nur verschlüsselte Pakete zu sehen.

Für beide Wege legst du eine Sync-Passphrase fest. Ohne sie kann niemand die Daten lesen, auch der Betreiber des Servers nicht. Vergisst du sie, lässt sich nichts wiederherstellen. Schreib sie also irgendwo auf. Mehr dazu unter [Geräte-Sync](/funktionen/geraete-sync/).

## Auf einen neuen Rechner umziehen

1. Auf dem alten Rechner unter **Einstellungen → Sicherungen → Umzug per Datei** auf **Als Datei speichern** klicken.
2. cockpit auf dem neuen Rechner installieren.
3. Dort an derselben Stelle **Datei einlesen** und die Datei wählen.
4. KI-Schlüssel und Mail-Passwörter neu eintragen und den Alpha-Schlüssel freischalten. Brauchst du alle drei Geräteplätze, melde den alten Rechner vorher unter *Lizenz* ab.

Nutzt du den Sync, geht es schneller: Auf dem neuen Rechner dieselbe Methode und Passphrase einrichten, dann holt cockpit alles beim ersten Abgleich.

## Wo liegen die Daten?

**Einstellungen → System → Datenordner öffnen** zeigt dir den Ordner mit der laufenden Datenbank. Unter Windows liegt er in `%APPDATA%`, unter Linux im Datenverzeichnis deines Benutzers. Die Sicherungen liegen getrennt davon in **Dokumente/Cockpit Backups**. **Ordner öffnen** unter *Sicherungen* bringt dich direkt hin.
