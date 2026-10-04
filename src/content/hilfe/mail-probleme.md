---
titel: Postfach verbindet sich nicht
beschreibung: "Fehlermeldungen beim Verbinden eines Mail-Kontos und was je Anbieter hilft: Gmail, GMX, WEB.DE, T-Online, Outlook, Proton."
reihenfolge: 51
kategorie: Fehlerbehebung
stand: Oktober 2026
icon: mail-warning
---

Unter **Einstellungen → Mail-Konten** ruft das Symbol neben einem Konto sofort ab. Klappt das nicht, steht in der Meldung, ob cockpit den Server nicht erreicht oder die Anmeldung scheitert. Hier die häufigsten Ursachen.

## Die Anmeldung wird abgelehnt

Der Server ist erreichbar, aber Benutzername oder Passwort passen nicht.

- **Gmail, iCloud, Yahoo:** Das normale Passwort funktioniert nicht. Du brauchst ein App-Passwort, siehe [Mail-Konten](/hilfe/mail-konten/#anbieter-im-überblick).
- **T-Online:** Das Passwort des Kundencenters gilt nicht. Leg im Kundencenter ein eigenes E-Mail-Passwort an.
- **GMX, WEB.DE, freenet:** Erst den Zugriff über externe Programme in den Postfach-Einstellungen erlauben. Danach gilt das normale Passwort.
- **Benutzername:** Bei fast allen Anbietern ist das die vollständige Mail-Adresse.
- **Leerzeichen:** App-Passwörter werden oft in Viererblöcken angezeigt. Kopier sie ohne Leerzeichen, wenn die Anmeldung mit Leerzeichen scheitert.

## „Keine Verbindung zu …“

cockpit erreicht den Server gar nicht. Die Meldung nennt Server und Port.

- Server-Adresse auf Tippfehler prüfen.
- Ports prüfen: IMAP 993, SMTP 587 oder 465. Bei Port 465 nutzt cockpit SSL/TLS, sonst STARTTLS.
- Firmennetz oder VPN: Manche Netze sperren Mail-Ports. Teste in einem anderen Netz.
- Virenscanner mit „Mail-Schutz“ greifen manchmal in verschlüsselte Verbindungen ein. Nimm cockpit dort aus.

## Zertifikatsfehler

Der Server zeigt ein Zertifikat, das nicht zur Adresse passt oder abgelaufen ist. cockpit verbindet sich dann nicht, um deine Zugangsdaten zu schützen. Prüfe die Server-Adresse. Bei eigenen Servern muss das Zertifikat auf genau diese Adresse ausgestellt sein.

## Proton Mail

- **Läuft die Bridge?** Die Proton Mail Bridge muss gestartet und angemeldet sein, solange cockpit abruft.
- **Bridge-Passwort statt Proton-Passwort:** Das Passwort steht in der Bridge bei deinem Konto unter den Zugangsdaten.
- **Ports:** Die Bridge zeigt ihre Ports an. Standard ist IMAP 1143 und SMTP 1025. Hast du sie in der Bridge geändert, ändere sie auch in cockpit.
- **Server:** `127.0.0.1`. Die Bridge nimmt nur Verbindungen vom eigenen Rechner an.

## Outlook.com und Microsoft 365

- **Passwort wird abgelehnt:** Microsoft lässt für diese Konten keine Anmeldung mit Passwort mehr zu. Nutze die Microsoft-Anmeldung, siehe [Mail-Konten](/hilfe/mail-konten/#outlookcom-und-microsoft-365).
- **„Umleitungs-URI stimmt nicht“:** In der App-Registrierung fehlt `http://127.0.0.1` unter *Mobile- und Desktopanwendungen*.
- **Firmenkonto wird abgelehnt:** Die IT muss der App-Registrierung zustimmen oder dir die Rechte geben. Trag außerdem die Mandanten-ID ein.

## Senden klappt, Abrufen nicht (oder umgekehrt)

IMAP und SMTP sind getrennte Server mit eigenen Ports. Prüfe beide Zeilen einzeln. Bei manchen Anbietern heißt der SMTP-Server anders als der IMAP-Server, etwa `imap.gmx.net` und `mail.gmx.net`.

## Mails fehlen in der Inbox

cockpit holt bei jedem Abruf die 25 neuesten Mails aus dem Posteingang, nicht das ganze Postfach. Ältere Mails und Mails in anderen Ordnern bleiben beim Anbieter, sie erscheinen nur nicht in cockpit. Sortiert dein Anbieter Mails automatisch in Ordner wie *Werbung* oder *Spam*, fehlen Bewerbungs-Mails aus diesen Ordnern in der Inbox.
