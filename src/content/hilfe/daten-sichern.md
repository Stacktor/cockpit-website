---
titel: Daten sichern & umziehen
beschreibung: Wo cockpit deine Daten ablegt, wie du eine Sicherung machst, mehrere Geräte abgleichst und auf einen neuen Rechner umziehst.
reihenfolge: 4
icon: hard-drive
---

cockpit speichert alles lokal in einer SQLite-Datenbank. Gut für deine Privatsphäre, aber um Sicherungen kümmerst du dich selbst. Das sind zwei Klicks.

## Sicherung anlegen

**Einstellungen → Daten & Sicherung → Sicherung speichern.** cockpit schreibt Bewerbungen, Profil, Stellen, Erinnerungen und Einstellungen in eine Datei. Passwörter und API-Schlüssel kommen absichtlich **nicht** mit.

In der Alpha lohnt sich das vor jedem Update. Der Update-Hinweis in der App erinnert dich daran.

## Mehrere Geräte abgleichen

Unter **Einstellungen → Sync & Geräte** hältst du zwei oder mehr Rechner auf demselben Stand. Es gibt zwei Wege:

- **Ordner (kostenlos):** Du wählst einen Ordner, den dein Cloud-Speicher ohnehin abgleicht, etwa Nextcloud, OneDrive oder Dropbox. cockpit legt dort verschlüsselte Pakete ab.
- **cockpit-Server (Pro und Alpha):** Kein eigener Cloud-Speicher nötig. Der Server bekommt nur verschlüsselte Pakete zu sehen.

Für beide Wege legst du eine Sync-Passphrase fest. Ohne sie kann niemand die Daten lesen, auch ich nicht. Vergisst du sie, lässt sich nichts wiederherstellen. Schreib sie also irgendwo auf. Mehr dazu unter [Geräte-Sync](/funktionen/geraete-sync/).

## Auf einen neuen Rechner umziehen

1. Auf dem alten Rechner eine Sicherung speichern.
2. cockpit auf dem neuen Rechner installieren.
3. **Einstellungen → Daten & Sicherung → Sicherung einlesen** und die Datei wählen.
4. KI-Schlüssel und Mail-Passwörter neu eintragen und den Alpha-Schlüssel freischalten. Brauchst du alle drei Geräteplätze, melde den alten Rechner vorher unter *Lizenz* ab.

Nutzt du den Sync, geht es schneller: Auf dem neuen Rechner dieselbe Methode und Passphrase einrichten, dann holt cockpit alles beim ersten Abgleich.

## Wo liegen die Daten?

**Einstellungen → System → Datenordner öffnen** zeigt dir den Ordner. Unter Windows liegt er in `%APPDATA%`, unter Linux im Datenverzeichnis deines Benutzers.
