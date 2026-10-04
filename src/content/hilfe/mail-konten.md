---
titel: Mail-Konten verbinden
beschreibung: "Postfächer von Gmail, GMX, WEB.DE, T-Online, Outlook, Proton und anderen Anbietern mit cockpit verbinden."
reihenfolge: 20
kategorie: Kommunikation und Termine
stand: Oktober 2026
icon: mail
---

Die [Inbox](/hilfe/inbox/) und der [Auto-Modus](/hilfe/auto-modus/) brauchen ein verbundenes Postfach. cockpit liest über IMAP und sendet über SMTP. Am besten nutzt du eine eigene Adresse nur für Bewerbungen. Dann bleiben private Mails außen vor.

## Konto anlegen

1. **Einstellungen → Mail-Konten**.
2. Mail-Adresse eingeben. cockpit erkennt den Anbieter an der Domain und füllt Server und Ports aus.
3. Das Passwort eintragen, das der Anbieter für Programme verlangt. Welches das ist, steht direkt unter dem Feld.
4. **Konto hinzufügen**, dann neben dem Konto auf das Symbol zum Abrufen klicken. cockpit meldet sich an und holt die neuesten Mails. Klappt etwas nicht, sagt die Meldung, woran es liegt.

Passwörter liegen im Schlüsselbund deines Betriebssystems. Die Datenbank kennt nur einen Verweis darauf.

## Anbieter im Überblick

| Anbieter | Passwort | Vorher erledigen |
|---|---|---|
| **Gmail** | App-Passwort (16 Zeichen) | Bestätigung in zwei Schritten aktivieren, dann im Google-Konto unter *Sicherheit → App-Passwörter* ein Passwort erzeugen |
| **GMX** | normales Passwort | In den GMX-Einstellungen unter *E-Mail → POP3/IMAP Abruf* den Zugriff über externe Programme erlauben |
| **WEB.DE** | normales Passwort | wie bei GMX unter *E-Mail → POP3/IMAP Abruf* freischalten |
| **T-Online** | eigenes E-Mail-Passwort | Im Telekom-Kundencenter unter *E-Mail → E-Mail-Passwort* anlegen; das Kundencenter-Passwort gilt nicht |
| **IONOS** | Postfach-Passwort | nichts |
| **freenet** | normales Passwort | Zugriff über externe Programme in den Mail-Einstellungen freischalten |
| **Vodafone** | Postfach-Passwort | nichts |
| **Posteo** | normales Passwort | nichts |
| **mailbox.org** | Passwort oder App-Passwort | mit Zwei-Faktor-Anmeldung ein App-Passwort unter *Einstellungen → Sicherheit* |
| **iCloud** | App-spezifisches Passwort | unter account.apple.com → *Anmelden und Sicherheit* erzeugen |
| **Yahoo** | App-Passwort | in den Kontoeinstellungen unter *Kontosicherheit* erzeugen |
| **Proton Mail** | Bridge-Passwort | siehe unten |
| **Outlook.com, Hotmail, Microsoft 365** | Microsoft-Anmeldung | siehe unten |

Ist dein Anbieter nicht dabei, wähl **Anderer Anbieter** und trag Server und Ports von Hand ein. Üblich sind IMAP auf Port 993 mit SSL/TLS und SMTP auf Port 587 mit STARTTLS oder 465 mit SSL/TLS. Die Werte stehen in der Hilfe deines Anbieters.

## Proton Mail

Proton verschlüsselt Postfächer Ende-zu-Ende. Programme wie cockpit greifen deshalb nicht direkt zu, sondern über die **Proton Mail Bridge**. Die Bridge gibt es nur in bezahlten Proton-Tarifen.

1. [Proton Mail Bridge](https://proton.me/mail/bridge) installieren und mit deinem Proton-Konto anmelden.
2. In der Bridge bei deinem Konto die Zugangsdaten aufklappen und das **Bridge-Passwort** kopieren. Es unterscheidet sich von deinem Proton-Passwort.
3. In cockpit die Proton-Adresse eingeben. Server (`127.0.0.1`) und Ports (IMAP 1143 mit STARTTLS, SMTP 1025) sind bereits eingetragen.
4. Bridge-Passwort einfügen, Konto hinzufügen und einmal abrufen.

Die Bridge muss laufen, solange cockpit Mails abruft oder sendet. Sie nutzt ein eigenes Zertifikat. cockpit akzeptiert es nur für Verbindungen zum eigenen Rechner, nie für Server im Internet.

## Outlook.com und Microsoft 365

Microsoft lässt für Outlook.com und Microsoft 365 keine App-Passwörter und keine einfache Anmeldung per IMAP mehr zu. cockpit meldet sich deshalb über Microsoft im Browser an (OAuth) und liest und sendet über die Microsoft-Graph-Schnittstelle. Dafür braucht cockpit die Client-ID einer App-Registrierung im Azure-Portal. Die Registrierung ist kostenlos.

1. Im [Azure-Portal](https://portal.azure.com) unter *App-Registrierungen* eine neue Registrierung anlegen. Kontotyp: *Konten in einem beliebigen Organisationsverzeichnis und persönliche Microsoft-Konten*.
2. Unter *Authentifizierung* die Plattform *Mobile- und Desktopanwendungen* hinzufügen und als Umleitungs-URI `http://127.0.0.1` eintragen. Den Port wählt cockpit bei jeder Anmeldung neu, Microsoft ignoriert ihn bei dieser Adresse.
3. Unter *API-Berechtigungen* die delegierten Microsoft-Graph-Rechte `Mail.Read`, `Mail.Send` und `offline_access` hinzufügen.
4. Die **Anwendungs-ID (Client-ID)** kopieren und in cockpit eintragen. Bei einem Firmenkonto zusätzlich die Mandanten-ID, sonst bleibt `common`.
5. Konto hinzufügen. Der Browser öffnet sich mit der Microsoft-Anmeldung. Danach ist das Konto verbunden.

Das Refresh-Token liegt danach im Schlüsselbund. Ein Passwort speichert cockpit für Microsoft-Konten nicht.

## Gmail ohne App-Passwort

Statt App-Passwort geht Gmail auch über die Google-Anmeldung. Das braucht ein eigenes Google-Cloud-Projekt mit OAuth-Client und ist deshalb unter **Einstellungen → Experimentell → Gmail/Outlook per OAuth** versteckt. Für die meisten reicht das App-Passwort.

## Konten auf mehreren Geräten

Mit eingeschaltetem [Sync](/hilfe/sync/) wandern Konten, Antwortregeln und abgerufene Mails auf das andere Gerät, Passwörter aber nicht. Soll das andere Gerät selbst abrufen, trag das Passwort dort einmal ein.

Nutzt du automatische Antworten (Stufe *Regel-basiert* oder *Vollautomatik*), trag das Passwort nur auf einem Gerät ein. Sonst können zwei Geräte dieselbe Mail beantworten, bevor der Sync den Versand meldet.
