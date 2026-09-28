---
titel: "Warum cockpit deine Daten gar nicht haben will"
beschreibung: Bewerbungsdaten gehören zu den sensibelsten Daten, die du hast. Warum cockpit sie konsequent auf deinem Rechner lässt — und was das für Preis und KI bedeutet.
datum: 2026-09-28
tags: [Datenschutz, Hintergrund]
lesezeit: 5
---

Überleg mal, was in deinen Bewerbungsunterlagen steht: dein aktueller Arbeitgeber, obwohl der nichts von deiner Suche wissen soll. Dein Wunschgehalt. Jede Absage. Lücken im Lebenslauf und die Erklärung dazu. Es gibt wenige Daten, die persönlicher sind.

Die meisten Bewerbungs-Tools laden genau das in ihre Cloud. Das ist bequem — und für die Anbieter der einfachste Weg. cockpit geht bewusst den anderen.

## Local-first heißt: Es gibt keinen Server, der deine Daten annimmt

cockpit speichert alles in einer Datenbank-Datei auf deinem Rechner. Zugangsdaten — Mail-Passwörter, KI-Schlüssel, deine Lizenz — liegen im Schlüsselbund deines Betriebssystems. Ein Konto bei mir brauchst du nicht.

Das ist keine Einstellung, die man vergessen kann, sondern die Architektur: Es gibt schlicht keinen cockpit-Server, der deine Bewerbungen entgegennehmen könnte. Was ich nicht habe, kann ich nicht verlieren, nicht verkaufen und nicht aus Versehen offenlegen.

## Und die KI?

Hier wird es spannend. Um Anschreiben zu entwerfen, muss ein Sprachmodell deine Daten sehen. cockpit lässt dich wählen:

- **Dein eigener API-Schlüssel** bei einem Anbieter deiner Wahl. Die Texte gehen direkt von deinem Rechner zum Anbieter — nicht über mich.
- **Ein lokales Modell** über Ollama oder LM Studio. Dann verlässt gar nichts deinen Rechner.

Für mich hat das einen angenehmen Nebeneffekt: Ich zahle keine KI-Kosten für meine Nutzer. Deshalb muss cockpit kein Abo sein, das jeden Monat die Server-Rechnung deckt.

## Was cockpit doch ins Netz schickt

Damit nichts im Kleingedruckten versteckt ist, hier die vollständige Liste:

- **Stellensuche**: deine Suchbegriffe an die Quelle, die du benutzt (z. B. Arbeitsagentur).
- **KI**: deine Texte an den Anbieter, den du eingerichtet hast.
- **Postfach**: die Verbindung zu deinem eigenen Mail-Server.
- **Lizenz**: gelegentlich eine Prüfung deines Schlüssels bei Lemon Squeezy.
- **Updates**: die Frage an GitHub, ob es eine neue Version gibt.
- **Nur als Alpha-Tester und nur auf Klick**: deine Umfrage-Antworten und Fehlerberichte an mich. Du siehst vorher genau, was gesendet wird — Bewerbungsdaten sind nie dabei.

Keine Analyse-Tools, keine Werbung, keine Telemetrie im Hintergrund.

## Der Preis dafür

Local-first hat eine Kehrseite: Um Sicherungen kümmerst du dich selbst. cockpit macht das so leicht wie möglich — *Einstellungen → Daten & Sicherung*, ein Klick —, aber drücken musst du ihn. Ich finde, das ist ein fairer Tausch.
