---
titel: Inbox und Mail-Ereignisse
beschreibung: "Wie cockpit Mails zusammenfasst, einsortiert, mit Bewerbungen verknüpft und Absagen, Einladungen und Termine erkennt."
reihenfolge: 21
kategorie: Kommunikation und Termine
stand: Oktober 2026
icon: inbox
---

Die Inbox zeigt die Mails deiner verbundenen Konten mit einer Kurzfassung und einer Kategorie. Sie ersetzt kein Mailprogramm. Sie holt aus dem Postfach, was für deine Bewerbungen zählt.

## Was mit einer neuen Mail passiert

Beim Abrufen geht jede neue Mail einmal an das KI-Modell, das du für *Zusammenfassung* gewählt hast. Es liefert:

- **Kurzfassung** in ein bis zwei Sätzen, mit Terminen und Fristen
- **Kategorie:** Recruiter, Firma, Jobbörse oder Sonstige
- **Ereignis**, falls die Mail eines enthält: Absage, Einladung, Angebot, Eingangsbestätigung oder Rückfrage
- **Termin**, falls ein Datum mit Uhrzeit genannt ist

Ohne KI, etwa offline oder ohne Schlüssel, erkennt cockpit Ereignisse und Termine mit festen Regeln aus Betreff und Text. Das trifft die üblichen Formulierungen deutscher und englischer Absagen und Einladungen, aber nicht jede.

## Mit Bewerbungen verknüpfen

Kommt eine Mail von einer Firma, bei der du dich beworben hast, hängt cockpit sie an die Bewerbung. Sie erscheint dann im Verlauf der Bewerbung. Passt die Zuordnung nicht, änderst du sie in der Mail.

## Vorschläge

Erkennt cockpit ein Ereignis, steht über der Mail ein Vorschlag. Nichts davon passiert automatisch:

| Ereignis | Vorschlag |
|---|---|
| **Absage** | Bewerbung abschließen, Ergebnis *Absage* |
| **Einladung** | Bewerbung auf *Gespräch* setzen, Termin anlegen |
| **Angebot** | Bewerbung abschließen, Ergebnis *Zusage* |
| **Eingangsbestätigung** | Bewerbung auf *Beworben* setzen |
| **Rückfrage** | kein Statuswechsel, die Mail bleibt markiert |

Ein angelegter Termin landet im [Kalender](/hilfe/kalender/) und ist mit der Bewerbung verknüpft. Ort oder Link zum Videoanruf trägst du dort nach. Passt ein Vorschlag nicht, blendest du ihn aus.

## Antworten

**Antwort entwerfen** schreibt mit deinem Profil und der Mail einen Entwurf in deinem Stil. Du änderst ihn und klickst **Senden**. Automatisch antwortet cockpit nur, wenn du unter **Einstellungen → Automatisierung** eine höhere Stufe gewählt hast, siehe [Auto-Modus](/hilfe/auto-modus/#autonomie-stufen).

## Filtern

Über der Liste filterst du nach Kategorie. Der Abruf läuft im Hintergrund in festen Abständen. Mit dem Knopf neben dem Konto unter **Einstellungen → Mail-Konten** rufst du sofort ab.
