---
titel: Probleme lösen
beschreibung: "Die häufigsten Stolpersteine und was hilft: SmartScreen-Warnung, AppImage startet nicht, KI, Postfach, Lizenz oder Erweiterung."
reihenfolge: 50
kategorie: Fehlerbehebung
stand: Oktober 2026
icon: life-buoy
---

## Windows warnt vor dem Installer

*„Der Computer wurde durch Windows geschützt“* erscheint, weil der Installer noch nicht signiert ist. **Weitere Informationen → Trotzdem ausführen.** Lade cockpit nur von dieser Website oder aus dem offiziellen [Release-Repo](https://github.com/Stacktor/cockpit-releases/releases).

## Das AppImage startet nicht

- Ausführbar gemacht? `chmod +x cockpit-linux-x86_64.AppImage`
- Fehlt FUSE? Unter Ubuntu/Debian: `sudo apt install libfuse2`
- Alternativ das `.deb`-Paket nehmen.

## cockpit fragt ständig nach dem Schlüsselbund

cockpit legt alle Geheimnisse in einem einzigen Eintrag im Schlüsselbund ab. Unter Linux braucht es dafür einen laufenden Secret-Service (GNOME-Schlüsselbund oder KWallet). Bestätige die Abfrage einmal mit „Immer erlauben“, dann fragt das System nicht mehr.

## Die KI antwortet nicht

- Unter **Einstellungen → KI** auf **Speichern und testen** klicken.
- Beim Anbieter nachsehen, ob Guthaben bzw. ein Zahlungsmittel hinterlegt ist.
- Lokales Modell: Läuft Ollama bzw. LM Studio, und stimmt die Adresse?

## Das Postfach verbindet sich nicht

Meist liegt es am Passwort: Viele Anbieter verlangen für Programme ein App-Passwort oder ein eigenes E-Mail-Passwort. Die Lösungen je Anbieter stehen unter [Postfach verbindet sich nicht](/hilfe/mail-probleme/).

## Der Lebenslauf wird nicht richtig eingelesen

- Eingescannte PDFs enthalten keinen Text, nur ein Bild. Exportiere den Lebenslauf aus Word oder Canva als PDF mit Text oder lies gleich die `.docx` ein.
- Liefert die KI leere Felder, versuch ein anderes Modell. Kleine lokale Modelle tun sich mit langen Lebensläufen schwer.
- Unter *Profil* liest das Symbol *Text neu einlesen* neben dem Dokument die Datei noch einmal aus.

## Die Lizenz zeigt „gesperrt“ oder „abgelaufen“

cockpit läuft dann als Kostenlos weiter, deine Daten bleiben unangetastet. Unter **Einstellungen → Lizenz** steht der Grund.

- **Gerät abgemeldet:** *Neu aktivieren* klicken.
- **Abgelaufen oder gesperrt:** Schreib an [Kontakt@mesco.cc](mailto:Kontakt@mesco.cc). Wenn die Lizenz wieder gilt, reicht *Erneut prüfen*.
- **Offline:** Bis zu 30 Tage ohne Verbindung bleibt Pro aktiv.

## Die Browser-Erweiterung findet cockpit nicht

- cockpit muss laufen. Die Erweiterung spricht nur mit der App auf deinem Rechner.
- In cockpit unter **Einstellungen → Verbindungen** einen neuen Kopplungscode erzeugen und im Popup der Erweiterung eingeben.
- Nach einem Update der Erweiterung unter `chrome://extensions` bzw. `edge://extensions` auf *Neu laden* klicken.

## Der Sync gleicht nicht ab

- Auf allen Geräten muss dieselbe Passphrase eingetragen sein.
- Beim Ordner-Sync: Lädt dein Cloud-Speicher die Dateien wirklich herunter? Manche Programme legen sie nur als Platzhalter an. Stell den Ordner auf „immer auf diesem Gerät behalten“.
- Unter **Einstellungen → Sync & Geräte** zeigt der Verlauf, was beim letzten Lauf passiert ist.

## Das Update klappt nicht

Lade die neue Version von der [Download-Seite](/download/) und installiere sie über die alte. Deine Daten bleiben erhalten. Vor jedem Update legt cockpit außerdem selbst eine [Sicherung](/hilfe/daten-sichern/) an.

## Nichts davon hilft

Als Alpha-Tester: **Feedback geben → Fehler melden** in der App. Sonst eine Mail an [Kontakt@mesco.cc](mailto:Kontakt@mesco.cc) mit der Version (steht unter *Einstellungen → System*), deinem Betriebssystem und dem, was passiert ist.
