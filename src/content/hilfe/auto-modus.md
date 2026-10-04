---
titel: Auto-Modus
beschreibung: "Bewerbungen im Hintergrund vorbereiten lassen: Schwellen, Obergrenzen, Freigabe und Not-Aus."
reihenfolge: 15
kategorie: Stellen und Bewerbungen
stand: Oktober 2026
icon: zap
---

Der Auto-Modus (Pro, in der Alpha frei) sucht passende Stellen und bereitet für jede ein Anschreiben und eine Bewerbungs-Mail mit Anhängen vor. Du prüfst und entscheidest, was rausgeht.

## Voraussetzungen

- ein KI-Modell, siehe [KI einrichten](/hilfe/ki-einrichten/)
- ein verbundenes Mail-Konto mit SMTP, siehe [Mail-Konten](/hilfe/mail-konten/)
- ein ausgefülltes Profil und ein Lebenslauf unter **Profil → Dokumente**
- mindestens eine aktive Quelle unter **Stellen**

## Einrichten

Unter **Einstellungen → Automatisierung**:

| Einstellung | Bedeutung |
|---|---|
| **Im Hintergrund vorbereiten** | cockpit läuft in festen Abständen, standardmäßig alle sechs Stunden |
| **Mindest-Match** | nur Stellen ab diesem Passungs-Score, Standard 75 |
| **Max. pro Lauf** | Obergrenze für neue Entwürfe pro Durchlauf |
| **Versand-Konto** | das Mail-Konto, über das Bewerbungen gehen |

## Prüfen und senden

Fertige Entwürfe liegen unter **Auto**. Der Start zeigt, wie viele bereitliegen. Je Entwurf siehst du Anzeige, Anschreiben, Mail-Text und Anhänge. Du änderst, was nicht passt, und klickst **Senden**, oder du verwirfst den Entwurf. Verworfene Stellen schlägt cockpit nicht noch einmal vor.

## Autonomie-Stufen

Ebenfalls unter **Einstellungen → Automatisierung** legst du fest, wie selbstständig cockpit auf eingehende Mails antworten darf:

| Stufe | Verhalten |
|---|---|
| **Entwurf** | Antworten werden nur entworfen, nie gesendet |
| **Freigabe** | Senden nur nach ausdrücklichem Klick (Standard) |
| **Regel-basiert** | automatisch nur, wenn eine deiner Antwortregeln passt |
| **Vollautomatik** | bekannte, unkritische Mails werden ohne Rückfrage beantwortet |

Auch in der Vollautomatik halten Schutzgitter: Mails von unbekannten Absendern und Mails, die eine Entscheidung verlangen, beantwortet cockpit nie selbst. Bewerbungen aus dem Auto-Modus gehen immer erst nach deiner Freigabe raus.

## Not-Aus

Der Schalter **Not-Aus** unter **Einstellungen → Automatisierung** stoppt jeden Versand sofort, auch den, den du schon bestätigt hast. Entwürfe bleiben erhalten.
