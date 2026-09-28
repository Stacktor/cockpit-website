---
titel: KI einrichten
beschreibung: Eigenen API-Schlüssel hinterlegen oder ein lokales Modell über Ollama bzw. LM Studio verbinden — und welche Variante zu dir passt.
reihenfolge: 2
icon: sparkles
---

cockpit hat keinen eigenen KI-Server. Du bringst dein Modell selbst mit — das hält die App günstig und deine Texte privat. Ohne KI funktioniert cockpit auch, dann eben ohne Entwürfe und Zusammenfassungen.

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

Der Schlüssel liegt im **Schlüsselbund deines Betriebssystems** (Windows-Anmeldeinformationen, unter Linux GNOME-Schlüsselbund bzw. KWallet) — nicht in einer Datei und nie in der Oberfläche.

Tipp: Setz beim Anbieter ein monatliches Ausgabenlimit. Dann kann nichts überraschend teuer werden.

## Lokales Modell

1. [Ollama](https://ollama.com) oder [LM Studio](https://lmstudio.ai) installieren.
2. Ein Modell laden — für Anschreiben auf Deutsch eignen sich aktuelle mittelgroße Modelle gut.
3. In cockpit: **Einstellungen → KI**, beim lokalen Modell die Adresse eintragen — die Knöpfe *Ollama* (`http://localhost:11434/v1`) und *LM Studio* (`http://localhost:1234/v1`) füllen sie für dich aus — und das Modell auswählen.

## Verschiedene Modelle je Aufgabe

Unter **Einstellungen → KI** kannst du für einzelne Aufgaben — Anschreiben, Zusammenfassungen, Antworten, Auswertungen — ein anderes Modell wählen. Zum Beispiel ein starkes Modell für Anschreiben und ein günstiges oder lokales für Mail-Zusammenfassungen.
