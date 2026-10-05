---
titel: Datenschutz und Sicherheit
beschreibung: "Wo deine Daten liegen, was cockpit an wen schickt, wie Passwörter geschützt sind und was verschlüsselt wird."
reihenfolge: 42
kategorie: Daten und Sicherheit
stand: Oktober 2026
icon: shield-check
---

cockpit arbeitet lokal. Es gibt kein Konto und keinen cockpit-Server, auf dem deine Bewerbungen lesbar liegen. Dieser Artikel beschreibt, was trotzdem das Gerät verlässt und wie es geschützt ist. Die rechtlichen Details stehen in der [Datenschutzerklärung](/datenschutz/).

## Wo die Daten liegen

Alles liegt in einer SQLite-Datenbank im Datenordner der App: Bewerbungen, Profil, Kontakte, Treffer, Mails und Einstellungen. Dokumente liegen daneben als Dateien. **Einstellungen → System → Datenordner öffnen** zeigt den Ordner.

Die Datenbank ist auf der Festplatte nicht eigens verschlüsselt. Schütze dein Benutzerkonto mit einem Passwort und nutz die Festplattenverschlüsselung deines Systems (BitLocker unter Windows, LUKS unter Linux).

## Passwörter und Schlüssel

API-Schlüssel, Mail-Passwörter, Anmelde-Tokens von Microsoft und Google, die Sync-Passphrase und der Lizenzschlüssel liegen im **Schlüsselbund des Betriebssystems**. Unter Windows ist das die Anmeldeinformationsverwaltung, gebunden an deine Windows-Anmeldung. Unter Linux ist es der GNOME-Schlüsselbund oder KWallet.

Die Oberfläche der App bekommt diese Werte nie zu sehen. Nur der Kern der App liest sie, in dem Moment, in dem er eine Verbindung aufbaut. Auch Sicherungen und Exporte enthalten sie nicht.

## Was das Gerät verlässt

| Wohin | Was | Wann |
|---|---|---|
| **KI-Anbieter deiner Wahl** | der Text, den eine Aufgabe braucht, etwa Anzeige und Profil für ein Anschreiben | nur bei einer KI-Aufgabe; bei einem lokalen Modell gar nicht |
| **Stellenquellen** | Suchbegriffe und Ort | bei einer Suche |
| **Dein Mail-Anbieter** | Anmeldung, Abruf und Versand | beim Abrufen und Senden |
| **Sync-Ordner oder cockpit-Server** | verschlüsselte Pakete | nur mit eingeschaltetem Sync |
| **Lizenzserver** | Lizenzschlüssel und eine zufällige Geräte-ID | gelegentlich zur Prüfung, nur mit Lizenz |
| **Update-Server** | Versionsnummer | beim Suchen nach Updates |
| **cockpit-Server** | Nutzungsstatistik: Funktionsnamen mit Anzahl je Tag, App-Version, Betriebssystem | einmal am Tag, solange die Statistik eingeschaltet ist |

Die anonyme Nutzungsstatistik zählt, welche Bereiche wie oft geöffnet werden. Inhalte, Lizenz oder Geräte-ID gehen nicht mit. Du schaltest sie unter **Einstellungen → System** ab, dort siehst du auch, was gerade gesammelt ist.

## Verschlüsselung beim Sync

Jedes Sync-Paket wird vor dem Hochladen mit AES-256-GCM verschlüsselt. Den Schlüssel leitet cockpit aus deiner Passphrase ab. Weder dein Cloud-Dienst noch der cockpit-Server können die Pakete lesen. Dasselbe gilt für Cloud-Sicherungen.

## Verbindungen

Alle Verbindungen ins Internet laufen über TLS mit geprüftem Zertifikat. Die einzige Ausnahme sind Verbindungen zum eigenen Rechner, etwa zur Proton Mail Bridge oder zu einem lokalen KI-Modell. Dort akzeptiert cockpit auch das selbst ausgestellte Zertifikat der Bridge.

Die Browser-Erweiterung spricht nur mit cockpit auf `127.0.0.1` und erst nach Kopplung mit einem einmaligen Code.

## Automatische Abläufe

cockpit sendet keine Bewerbung ohne deine Freigabe. Automatische Antworten auf Mails gibt es nur, wenn du sie ausdrücklich einschaltest, und auch dann nie an unbekannte Absender. Der Not-Aus stoppt jeden Versand sofort. Siehe [Auto-Modus](/hilfe/auto-modus/).
