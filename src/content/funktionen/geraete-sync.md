---
titel: Geräte-Sync
kurz: Laptop und PC gleich halten, verschlüsselt
beschreibung: cockpit gleicht deine Geräte über einen eigenen Cloud-Ordner (kostenlos) oder den cockpit-Server (Pro) ab. Alles wird vorher auf dem Gerät mit deiner Passphrase verschlüsselt.
icon: refresh-cw
reihenfolge: 10
screen: start
punkte:
  - Über einen Ordner in OneDrive, Dropbox, Nextcloud oder iCloud Drive, kostenlos
  - Oder über den cockpit-Server, ohne eigenen Speicher (Pro)
  - Ende-zu-Ende verschlüsselt mit einer Passphrase, die dein Gerät nie verlässt
  - Löschungen, Dokumente und Konflikte werden richtig behandelt
---

cockpit arbeitet lokal. Wer auf Laptop und PC bewirbt, kann beide abgleichen. Der Sync ist aus, bis du ihn einschaltest.

## Zwei Wege

- **Ordner (kostenlos):** Du wählst einen Ordner, den ohnehin dein Cloud-Dienst abgleicht, oder einen USB-Stick. cockpit legt darin verschlüsselte Pakete ab und liest die der anderen Geräte.
- **cockpit-Server (Pro):** Ohne eigenen Cloud-Speicher, angemeldet über deine Lizenz. Bis 200 MB.

## Verschlüsselt, bevor es das Gerät verlässt

Jedes Paket wird mit AES-256-GCM verschlüsselt. Den Schlüssel bildet cockpit aus deiner Passphrase, und die Passphrase liegt nur im Schlüsselbund deiner Geräte. Weder dein Cloud-Dienst noch der cockpit-Server können die Daten lesen.

## Was abgeglichen wird

Bewerbungen mit Verlauf, Notizen, Kontakten und Aufgaben, Erinnerungen und Termine, Profil, Dokumente bis 10 MB, Stellenquellen und Treffer, Mail-Konten, Antwortregeln und Mails sowie die Einstellungen samt Erscheinungsbild. Passwörter und API-Schlüssel bleiben im Schlüsselbund des jeweiligen Geräts.

Haben zwei Geräte dieselbe Bewerbung geändert, gilt die jüngere Änderung, und cockpit zeigt dir, was passiert ist.
