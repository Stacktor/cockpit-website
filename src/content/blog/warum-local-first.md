---
titel: "Warum cockpit deine Daten gar nicht haben will"
beschreibung: Bewerbungsdaten gehören zu den persönlichsten Daten, die du hast. Warum cockpit sie auf deinem Rechner lässt und was das für Preis, KI und Sync bedeutet.
datum: 2026-09-28
tags: [Datenschutz, Hintergrund]
---

Überleg mal, was in deinen Bewerbungsunterlagen steht. Dein aktueller Arbeitgeber, der von der Suche nichts wissen soll. Dein Wunschgehalt. Jede Absage. Lücken im Lebenslauf und warum es sie gibt. Viel persönlicher wird es kaum.

Die meisten Bewerbungs-Tools laden genau das in ihre Cloud. Für die Anbieter ist das der einfachste Weg, und bequem ist es auch. cockpit macht es absichtlich anders.

## Local-first: Deine Bewerbungen liegen bei dir

cockpit speichert alles in einer Datenbank-Datei auf deinem Rechner. Zugangsdaten wie Mail-Passwörter, KI-Schlüssel und deine Lizenz liegen im Schlüsselbund deines Betriebssystems. Ein Konto bei uns brauchst du nicht.

Das steckt im Aufbau der App, es gibt also keinen Schalter, den man vergessen kann. Kein cockpit-Server nimmt deine Bewerbungen lesbar entgegen. Daten, die wir nicht haben, können wir weder verlieren noch verkaufen oder aus Versehen herausgeben.

## Und die KI?

Damit ein Sprachmodell ein Anschreiben entwerfen kann, muss es deine Daten sehen. In cockpit entscheidest du, wer das ist:

- **Dein eigener API-Schlüssel** bei einem Anbieter deiner Wahl. Die Texte gehen direkt von deinem Rechner dorthin, nicht über uns.
- **Ein lokales Modell** über Ollama oder LM Studio. Dann verlässt nichts deinen Rechner.

Dadurch fallen bei uns keine KI-Kosten für Nutzer an. cockpit muss deshalb kein Abo sein, das jeden Monat eine Server-Rechnung deckt.

## Mehrere Geräte

Dafür gibt es den Geräte-Sync. Bevor irgendetwas dein Gerät verlässt, verschlüsselt cockpit es mit einer Passphrase, die nur du kennst. Die Pakete landen dann entweder in einem Ordner deines eigenen Cloud-Speichers oder, mit Pro, auf dem cockpit-Server. Beide sehen nur Datensalat. Ohne deine Passphrase können wir die Daten nicht lesen, auch wenn sie auf unserem Server liegen.

Der Sync ist aus, bis du ihn einschaltest. Nutzt du den cockpit-Server, landen dort auf Wunsch auch die drei neuesten Sicherungen, genauso verschlüsselt. Geht dein Laptop kaputt, holst du sie auf dem neuen Rechner mit deiner Passphrase zurück.

## Was cockpit doch ins Netz schickt

Diese Verbindungen baut cockpit auf, mehr nicht:

- **Stellensuche:** deine Suchbegriffe an die Quelle, die du nutzt, etwa die Arbeitsagentur.
- **KI:** deine Texte an den Anbieter, den du eingerichtet hast.
- **Postfach:** die Verbindung zu deinem eigenen Mail-Server.
- **Lizenz:** ab und zu eine Prüfung deines Schlüssels bei Lemon Squeezy. Ist sie gültig, meldet die App uns App-Version, Betriebssystem und Lizenzstatus. Daran sehen wir, welche Versionen im Umlauf sind.
- **Updates:** die Frage an GitHub, ob es eine neue Version gibt.
- **Nutzungsstatistik:** einmal am Tag, welche Funktionen wie oft genutzt wurden, mit App-Version und Betriebssystem. Ohne Inhalte und ohne Kennung, abschaltbar unter **Einstellungen → System**.
- **Sync, nur wenn du ihn einschaltest:** verschlüsselte Pakete an deinen Ordner oder den cockpit-Server. Mit Server-Sync auch verschlüsselte Sicherungen, abschaltbar.
- **Nur als Alpha-Tester und nur auf Klick:** Umfrage-Antworten und Fehlerberichte an uns. Vorher siehst du genau, was rausgeht. Bewerbungsdaten sind nie dabei.

Werbung und Tracking gibt es in cockpit nicht. Die Einzelheiten stehen in der [Datenschutzerklärung](/datenschutz/).

## Der Haken

Local-first hat eine Kehrseite: Es gibt keinen Server, der deine Daten für dich aufhebt. Geht der Rechner kaputt, ist alles weg, was nur dort lag. Deshalb sichert cockpit selbst, jeden Tag und vor jedem Update, in den Ordner *Dokumente/Cockpit Backups*. Liegt der in deinem Cloud-Speicher oder kopierst du ihn ab und zu auf einen USB-Stick, bist du auf der sicheren Seite. [Wie das genau funktioniert](/hilfe/daten-sichern/)
