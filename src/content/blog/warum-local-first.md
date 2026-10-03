---
titel: "Warum cockpit deine Daten gar nicht haben will"
beschreibung: Bewerbungsdaten gehören zu den persönlichsten Daten, die du hast. Warum cockpit sie auf deinem Rechner lässt und was das für Preis, KI und Sync bedeutet.
datum: 2026-09-28
tags: [Datenschutz, Hintergrund]
lesezeit: 5
---

Überleg mal, was in deinen Bewerbungsunterlagen steht. Dein aktueller Arbeitgeber, der von der Suche nichts wissen soll. Dein Wunschgehalt. Jede Absage. Lücken im Lebenslauf und warum es sie gibt. Viel persönlicher wird es kaum.

Die meisten Bewerbungs-Tools laden genau das in ihre Cloud. Für die Anbieter ist das der einfachste Weg, und bequem ist es auch. cockpit macht es absichtlich anders.

## Local-first: Deine Bewerbungen liegen bei dir

cockpit speichert alles in einer Datenbank-Datei auf deinem Rechner. Zugangsdaten wie Mail-Passwörter, KI-Schlüssel und deine Lizenz liegen im Schlüsselbund deines Betriebssystems. Ein Konto bei mir brauchst du nicht.

Das ist keine Einstellung, die man vergessen kann. Es steckt im Aufbau der App: Es gibt keinen cockpit-Server, der deine Bewerbungen lesbar entgegennimmt. Was ich nicht habe, kann ich nicht verlieren, nicht verkaufen und nicht aus Versehen herausgeben.

## Und die KI?

Damit ein Sprachmodell ein Anschreiben entwerfen kann, muss es deine Daten sehen. In cockpit entscheidest du, wer das ist:

- **Dein eigener API-Schlüssel** bei einem Anbieter deiner Wahl. Die Texte gehen direkt von deinem Rechner dorthin, nicht über mich.
- **Ein lokales Modell** über Ollama oder LM Studio. Dann verlässt nichts deinen Rechner.

Für mich hat das einen schönen Nebeneffekt: Ich zahle keine KI-Kosten für meine Nutzer. Deshalb muss cockpit kein Abo sein, das jeden Monat eine Server-Rechnung deckt.

## Und wenn ich mehrere Geräte habe?

Dafür gibt es den Geräte-Sync. Bevor irgendetwas dein Gerät verlässt, verschlüsselt cockpit es mit einer Passphrase, die nur du kennst. Die Pakete landen dann entweder in einem Ordner deines eigenen Cloud-Speichers oder, mit Pro, auf dem cockpit-Server. Beide sehen nur Datensalat. Ohne deine Passphrase kann ich die Daten nicht lesen, auch wenn sie auf meinem Server liegen.

Der Sync ist aus, bis du ihn einschaltest.

## Was cockpit doch ins Netz schickt

Damit nichts im Kleingedruckten steht, hier die ganze Liste:

- **Stellensuche:** deine Suchbegriffe an die Quelle, die du nutzt, etwa die Arbeitsagentur.
- **KI:** deine Texte an den Anbieter, den du eingerichtet hast.
- **Postfach:** die Verbindung zu deinem eigenen Mail-Server.
- **Lizenz:** ab und zu eine Prüfung deines Schlüssels bei Lemon Squeezy. Ist sie gültig, meldet die App mir App-Version, Betriebssystem und Lizenzstatus. So sehe ich, welche Versionen im Umlauf sind.
- **Updates:** die Frage an GitHub, ob es eine neue Version gibt.
- **Sync, nur wenn du ihn einschaltest:** verschlüsselte Pakete an deinen Ordner oder den cockpit-Server.
- **Nur als Alpha-Tester und nur auf Klick:** Umfrage-Antworten und Fehlerberichte an mich. Vorher siehst du genau, was rausgeht. Bewerbungsdaten sind nie dabei.

Keine Analyse-Tools, keine Werbung, kein Tracking. Die Einzelheiten stehen in der [Datenschutzerklärung](/datenschutz/).

## Der Haken

Local-first hat eine Kehrseite: Um Sicherungen kümmerst du dich selbst. cockpit macht es dir leicht, unter *Einstellungen → Daten & Sicherung* ist es ein Klick. Klicken musst du aber selbst. Ich finde, das ist ein fairer Tausch.
