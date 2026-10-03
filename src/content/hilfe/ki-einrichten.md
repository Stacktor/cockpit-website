---
titel: KI einrichten
beschreibung: Eigenen API-Schlüssel hinterlegen oder ein lokales Modell über Ollama bzw. LM Studio verbinden. Und welche Variante zu dir passt.
reihenfolge: 2
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

## Eigenen Schlüssel hinterlegen

1. Beim Anbieter ein Konto anlegen und einen API-Schlüssel erzeugen. cockpit unterstützt **Anthropic (Claude)**, **OpenAI**, **Google Gemini**, **Perplexity** und **xAI (Grok)**.
2. In cockpit: **Einstellungen → KI**, Anbieter wählen, Schlüssel einfügen, speichern.
3. Mit *Verbindung testen* prüfen, ob alles klappt.

Der Schlüssel liegt im **Schlüsselbund deines Betriebssystems** (Windows-Anmeldeinformationen, unter Linux GNOME-Schlüsselbund oder KWallet). Nicht in einer Datei und nie in der Oberfläche.

Tipp: Setz beim Anbieter ein monatliches Ausgabenlimit, dann gibt es keine bösen Überraschungen.

## Lokales Modell

1. [Ollama](https://ollama.com) oder [LM Studio](https://lmstudio.ai) installieren.
2. Ein Modell laden. Für deutsche Anschreiben taugen aktuelle mittelgroße Modelle gut.
3. In cockpit: **Einstellungen → KI**, beim lokalen Modell die Adresse eintragen und das Modell auswählen. Die Knöpfe *Ollama* (`http://localhost:11434/v1`) und *LM Studio* (`http://localhost:1234/v1`) füllen die Adresse für dich aus.

## Verschiedene Modelle je Aufgabe

Unter **Einstellungen → KI** kannst du für einzelne Aufgaben ein eigenes Modell wählen: Anschreiben, Zusammenfassungen, Antworten, Auswertungen. Zum Beispiel ein starkes Modell für Anschreiben und ein günstiges oder lokales für Mail-Zusammenfassungen.
