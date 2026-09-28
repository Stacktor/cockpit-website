---
titel: Probleme lösen
beschreibung: Die häufigsten Stolpersteine — SmartScreen-Warnung, AppImage startet nicht, KI oder Postfach verbinden sich nicht — und was hilft.
reihenfolge: 5
icon: life-buoy
---

## Windows warnt vor dem Installer

*„Der Computer wurde durch Windows geschützt"* erscheint, weil der Installer noch nicht code-signiert ist. **Weitere Informationen → Trotzdem ausführen.** Lade cockpit nur von dieser Website oder aus dem offiziellen [Release-Repo](https://github.com/Stacktor/cockpit-releases/releases).

## Das AppImage startet nicht

- Ausführbar gemacht? `chmod +x cockpit-linux-x86_64.AppImage`
- Fehlt FUSE? Unter Ubuntu/Debian: `sudo apt install libfuse2`
- Alternativ das `.deb`-Paket nehmen.

## cockpit fragt ständig nach dem Schlüsselbund

cockpit legt alle Geheimnisse in **einem** Eintrag im Schlüsselbund ab. Unter Linux braucht es dafür einen laufenden Secret-Service (GNOME-Schlüsselbund oder KWallet). Bestätige die Abfrage einmal mit „Immer erlauben", dann ist Ruhe.

## Die KI antwortet nicht

- Unter **Einstellungen → KI** auf *Verbindung testen* klicken.
- Beim Anbieter nachsehen, ob Guthaben bzw. ein Zahlungsmittel hinterlegt ist.
- Lokales Modell: Läuft Ollama bzw. LM Studio, und stimmt die Adresse?

## Das Postfach verbindet sich nicht

- Viele Anbieter verlangen für Programme ein **App-Passwort** statt deines normalen Passworts.
- Bei manchen (z. B. GMX, Web.de) musst du den **IMAP-Zugriff** erst in den Einstellungen des Postfachs erlauben.
- Server und Port stehen in der Hilfe deines Mail-Anbieters (IMAP meist Port 993, SMTP 465 oder 587).

## Das Update klappt nicht

Lade die neue Version einfach von der [Download-Seite](/download/) und installiere sie über die alte — deine Daten bleiben erhalten. Vorher sicherheitshalber eine [Sicherung](/hilfe/daten-sichern/) anlegen.

## Nichts davon hilft

Als Alpha-Tester: **Feedback geben → Fehler melden** in der App. Ansonsten eine Mail an [Kontakt@mesco.cc](mailto:Kontakt@mesco.cc) — mit Version (steht unter *Einstellungen → System*), Betriebssystem und dem, was passiert ist.
