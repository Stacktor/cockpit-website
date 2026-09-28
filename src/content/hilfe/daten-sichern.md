---
titel: Daten sichern & umziehen
beschreibung: Wo cockpit deine Daten speichert, wie du eine Sicherung anlegst und wie du auf einen neuen Rechner umziehst.
reihenfolge: 4
icon: hard-drive
---

cockpit speichert alles lokal in einer SQLite-Datenbank. Das ist gut für deine Privatsphäre — heißt aber auch: Um Sicherungen kümmerst du dich selbst. Das geht mit zwei Klicks.

## Sicherung anlegen

**Einstellungen → Daten & Sicherung → Sicherung speichern.** cockpit schreibt alle Bewerbungen, Profil, Stellen, Erinnerungen und Einstellungen in eine Datei. Passwörter und API-Schlüssel sind bewusst **nicht** enthalten.

Gerade in der Alpha lohnt sich das vor jedem Update — die App erinnert dich im Update-Hinweis daran.

## Auf einen neuen Rechner umziehen

1. Auf dem alten Rechner exportieren.
2. cockpit auf dem neuen Rechner installieren.
3. **Einstellungen → Daten & Sicherung → Sicherung einlesen** und die Datei wählen.
4. KI-Schlüssel und Mail-Passwörter neu eintragen, Alpha-Schlüssel freischalten (vorher auf dem alten Rechner unter *Lizenz* abmelden, wenn du alle drei Geräteplätze brauchst).

## Wo liegen die Daten?

**Einstellungen → System → Datenordner öffnen** zeigt dir den Ordner. Unter Windows liegt er unter `%APPDATA%`, unter Linux im Datenverzeichnis deines Benutzers.
