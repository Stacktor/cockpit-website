---
titel: Suchkriterien und Einordnung
beschreibung: "Muss-, Plus- und Ausschluss-Begriffe, Firmen-Sperrliste und der Rahmen aus Gehalt, Entfernung und Anstellung."
reihenfolge: 12
kategorie: Stellen und Bewerbungen
stand: Oktober 2026
icon: list-checks
---

Suchkriterien beschreiben, was eine Stelle mitbringen muss und was nicht in Frage kommt. cockpit nutzt sie an drei Stellen: in der KI-Bewertung, im Rahmen jedes Treffers und beim Ausblenden. Du pflegst sie unter **Profil → Suchkriterien** und speicherst sie mit **Kriterien speichern**. Sie wandern mit dem [Sync](/hilfe/sync/) auf andere Geräte.

## Begriffe

| Feld | Wirkung |
|---|---|
| **Muss-Begriffe** | Gehen in die KI-Bewertung ein. Fehlt einer in der Anzeige, liegt die Passung höchstens bei 59. |
| **Plus-Begriffe** | Heben die Passung leicht, wenn sie vorkommen. |
| **Ausschluss-Begriffe** | Treffer mit einem dieser Begriffe werden ausgeblendet. |
| **Firmen-Sperrliste** | Anzeigen dieser Firmen werden ausgeblendet. |

Begriffe zählen als ganze Wörter, Groß- und Kleinschreibung spielt keine Rolle, Umlaute dürfen ausgeschrieben sein. Ein Stern am Ende erlaubt Fortsetzungen: „Entwickl*“ trifft auch „Entwicklerin“ und „Entwicklung“.

## Passung und Rahmen

Jeder Treffer hat zwei Werte, die getrennt bleiben:

- **Passung** bewertet die fachliche Eignung. Das KI-Modell liest Anzeige, Profil und deine Muss- und Plus-Begriffe (siehe [Treffer bewerten](/hilfe/treffer-bewerten/)).
- **Rahmen** misst die äußeren Bedingungen an deinen Kriterien. cockpit rechnet ihn ohne KI und ohne Internet.

In den Rahmen gehen nur die Punkte ein, für die es eine Angabe gibt:

| Punkt | Bewertung |
|---|---|
| **Gehalt** | Volle Punkte ab Wunschgehalt; darunter sinkt der Wert bis 30 % unter Wunsch auf null. Monatsangaben werden aufs Jahr gerechnet. |
| **Entfernung** | Volle Punkte bis zur Grenze; darüber sinkt der Wert bis 50 % über der Grenze auf null. Remote-Stellen zählen immer voll. |
| **Umfang** | Vollzeit oder Teilzeit passt oder passt nicht. |
| **Arbeitsmodell** | Vor Ort, hybrid oder remote passt oder passt nicht. |
| **Anstellungsform** | Eine abgewählte Form wie Zeitarbeit oder Befristet zählt null. |

In der Liste steht der Rahmen als „Rahmen 72 %“ neben der Quelle. Im Detail zeigen zwei Balken Passung und Rahmen, darunter in Klartext, was den Rahmen ausmacht, etwa „Gehalt 48.000 bis 54.000 €, unter Wunsch (60.000 €)“ oder „36 km, Grenze 30 km“, und welche Begriffe gefunden wurden oder fehlen.

## Ausblenden

Offene Treffer mit Ausschluss-Begriff oder gesperrter Firma verschwinden aus der Liste. Über der Liste steht, wie viele es sind; **Anzeigen** holt sie zurück, markiert als ausgeblendet. Gelöscht wird nichts. Gemerkte, übernommene und verworfene Treffer bleiben immer sichtbar.

Bewertung, **Finden & Entwürfe vorbereiten**, der [Auto-Modus](/hilfe/auto-modus/) und die Benachrichtigungen der Hintergrundsuche überspringen ausgeblendete Treffer.

## Verwerfen mit Grund

Beim Verwerfen fragt cockpit nach dem Grund: Gehalt, Ort oder Entfernung, Anstellungsart, Anforderungen, Branche, Firma oder Sonstiges. Der Grund ist freiwillig. Er geht als Hinweis in die KI-Bewertung ein, und der [Rückblick](/hilfe/lernen/) nennt den häufigsten Grund mit einem Vorschlag, welches Kriterium ihn künftig abfängt.
