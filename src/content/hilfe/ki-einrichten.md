---
titel: KI einrichten
beschreibung: Lokales Modell, dein Claude-, ChatGPT- oder Gemini-Konto oder ein eigener API-Schlüssel. Und welche Variante zu dir passt.
reihenfolge: 30
kategorie: KI und Unterlagen
stand: Oktober 2026
icon: sparkles
---

cockpit hat keinen eigenen KI-Server. Das Modell bringst du selbst mit. So bleibt die App günstig und deine Texte bleiben privat. cockpit läuft auch ohne KI, nur eben ohne Entwürfe und Zusammenfassungen. Brauchst du für eine Aktion eine KI, sagt dir die App das und bringt dich mit einem Klick zur Einrichtung.

## Welche Variante?

| | Eigener Schlüssel | Lokales Modell |
|---|---|---|
| **Kosten** | pro Nutzung, meist wenige Cent je Anschreiben | kostenlos |
| **Qualität** | sehr gut | gut, je nach Modell und Rechner |
| **Datenschutz** | Texte gehen an den Anbieter deiner Wahl | nichts verlässt deinen Rechner |
| **Voraussetzung** | Konto beim Anbieter | ein halbwegs aktueller Rechner, am besten mit 16 GB RAM |

## Mit deinem Konto (ohne Schlüssel)

Hast du ein Abo bei Claude, ChatGPT oder Gemini, brauchst du keinen Schlüssel. cockpit nutzt das Programm, bei dem du schon angemeldet bist: **Claude Code**, **Codex** (von OpenAI) oder die **Gemini CLI**. Unter **Einstellungen → KI → Mit deinem Konto** siehst du, welche cockpit gefunden hat; ein Klick auf *Für alles nutzen* stellt alle Funktionen darauf um. cockpit sieht und speichert deine Zugangsdaten nie. Der Weg ist etwas langsamer als ein Schlüssel, und es gelten die Bedingungen deines Abos. Wie bei jeder Cloud-KI gehen die Texte an den Anbieter.

## cockpit in Claude Desktop, Gemini CLI oder Codex nutzen

Du chattest lieber dort? Unter **Einstellungen → KI → Mit Desktop-Apps verbinden** trägt cockpit sich mit einem Klick als Werkzeug ein (MCP). Danach fragst du in Claude Desktop zum Beispiel „Welche neuen Stellen passen am besten?“ oder „Erinnere mich Freitag ans Nachfassen“, und die Antworten kommen aus deinen Daten auf diesem Rechner. Die Konfigurationsdatei wird vorher gesichert, ein zweiter Klick entfernt den Eintrag wieder. Die KI-Funktionen von cockpit selbst (Anschreiben, Passung) laufen weiter über den Weg, den du oben gewählt hast.

## Eigenen Schlüssel hinterlegen

1. Beim Anbieter ein Konto anlegen und einen API-Schlüssel erzeugen. cockpit unterstützt **Anthropic (Claude)**, **OpenAI**, **Google Gemini**, **Perplexity** und **xAI (Grok)**.
2. In cockpit: **Einstellungen → KI**, Anbieter wählen, Schlüssel einfügen, speichern.
3. Mit **Speichern und testen** prüfen, ob alles klappt.

Der Schlüssel liegt im **Schlüsselbund deines Betriebssystems** (Windows-Anmeldeinformationen, unter Linux GNOME-Schlüsselbund oder KWallet). Nicht in einer Datei und nie in der Oberfläche.

Tipp: Setz beim Anbieter ein monatliches Ausgabenlimit, dann gibt es keine bösen Überraschungen.

## Lokales Modell

1. [Ollama](https://ollama.com) oder [LM Studio](https://lmstudio.ai) installieren.
2. Ein Modell laden. Für deutsche Anschreiben taugen aktuelle mittelgroße Modelle gut.
3. In cockpit: **Einstellungen → KI**, beim lokalen Modell die Adresse eintragen und das Modell auswählen. Die Knöpfe *Ollama* (`http://localhost:11434/v1`) und *LM Studio* (`http://localhost:1234/v1`) füllen die Adresse für dich aus.

## Ein Modell oder je Funktion

Oben unter **Einstellungen → KI** wählst du zwischen zwei Modi:

- **Ein Modell für alles:** Ein Anbieter und ein Modell erledigen jede Aufgabe. Für den Anfang reicht das.
- **Je Funktion:** Jede Aufgabe bekommt ihr eigenes Modell. Die Aufgaben sind nach Zweck gruppiert: *Schreiben* (Anschreiben, Antworten), *Lesen und auswerten* (Anzeigen, Mails, Lebenslauf, Analyse), *Bewerten* (Passung) und *Assistent und Standard*.

Sinnvoll ist zum Beispiel ein starkes Modell für Anschreiben und ein günstiges oder lokales Modell für Zusammenfassungen und die Passung. Die Passung läuft oft über hunderte Treffer, dort machen sich die Kosten am ehesten bemerkbar.

## Was die KI über dich erfährt

An die KI geht nur, was die jeweilige Aufgabe braucht. Für ein Anschreiben sind das die Anzeige, dein Profil und dein Stil. Für eine Mail-Zusammenfassung ist es die einzelne Mail. Bei einem lokalen Modell verlässt nichts deinen Rechner. Mehr dazu unter [Datenschutz und Sicherheit](/hilfe/datenschutz-und-sicherheit/).
