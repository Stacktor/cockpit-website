---
titel: Stellen suchen
beschreibung: "Quellen einrichten, aus dem Profil suchen, nach Entfernung filtern und Anzeigen in die Pipeline übernehmen."
reihenfolge: 10
kategorie: Stellen und Bewerbungen
stand: Oktober 2026
icon: search
---

Unter **Stellen** sammelt cockpit Anzeigen aus mehreren Quellen in einer Liste. Doppelte Anzeigen werden zusammengeführt, bereits verworfene tauchen nicht wieder auf.

## Quellen

| Quelle | Voraussetzung | Hinweis |
|---|---|---|
| **Bundesagentur für Arbeit** | keine | Größte Quelle für Deutschland, mit Umkreissuche |
| **Arbeitnow** | keine | Viele Stellen in Deutschland, oft englischsprachig |
| **Remotive** | keine | Remote-Stellen weltweit |
| **Adzuna** | kostenloser Entwickler-Schlüssel | Bündelt große Jobbörsen |
| **Jooble** | kostenloser Schlüssel | Bündelt viele Jobbörsen, auch StepStone und Indeed |
| **RSS-Feeds** | Feed-Adresse | Karriereseiten einzelner Firmen |
| **LinkedIn, StepStone, Indeed** | keine | Experimentell, siehe unten |

Schlüssel für Adzuna und Jooble liegen im Schlüsselbund deines Betriebssystems, nicht in der Datenbank.

### Jobportale ohne Schnittstelle

LinkedIn, StepStone und Indeed bieten keine offene Schnittstelle an. cockpit kann ihre öffentliche Suchseite lesen, eine Seite je Abruf, ohne Anmeldung. Das widerspricht den Nutzungsbedingungen der Portale, kann jederzeit aufhören zu funktionieren und zu einer vorübergehenden Sperre führen. Deshalb ist es als experimentell markiert und standardmäßig aus.

Verlässlicher sind zwei andere Wege: eine Anzeige beim Ansehen mit der [Browser-Erweiterung](/hilfe/browser-erweiterung/) übernehmen oder den Link unter **Stellen → Suchen & Quellen → Stelle per Link** einfügen.

### Zustand einer Quelle

Unter **Suchen & Quellen → Deine Quellen** steht je Quelle, wann sie zuletzt abgerufen wurde und wie viele Treffer sie dabei lieferte. Schlägt ein Abruf fehl, zeigt cockpit den Fehler und zählt mit. Nach fünf Fehlern in Folge pausiert cockpit die Quelle, meldet das in den Benachrichtigungen und bietet **Wieder aktivieren** an; der Zähler beginnt dann von vorn. Liefert eine Quelle keine Treffer, ist das kein Fehler: Sie antwortet, es passt nur gerade nichts.

## Suchen

- **Aus dem Profil:** cockpit bildet die Suchbegriffe aus deinen Skills, Wunschrollen und dem Werdegang.
- **Von Hand:** Beruf oder Stichwort und Ort eingeben, dazu einen Umkreis.
- **Im Hintergrund:** Mit dem Schalter *Automatisch im Hintergrund suchen* unter **Stellen** sucht cockpit regelmäßig und meldet sich nur bei Treffern über deinem Mindest-Score.

## Was in der Liste steht

Jeder Treffer zeigt Firma, Titel, Ort und Alter der Anzeige. Soweit die Anzeige es hergibt, liest cockpit außerdem aus:

- **Gehalt**, auch als Spanne und umgerechnet auf ein Jahresgehalt
- **Anstellung**: Vollzeit, Teilzeit, befristet, Werkstudent, Ausbildung
- **Ansprechpartner** mit Name, Mail und Telefon
- **Entfernung** zu deinem Wohnort in Kilometern Luftlinie

Die Entfernung rechnet cockpit offline aus einer Ortstabelle mit rund 11.000 Orten in Deutschland, Österreich und der Schweiz. Dein Wohnort wird dafür nirgendwohin geschickt. Den Wohnort trägst du unter **Profil** ein.

Mit [Suchkriterien](/hilfe/suchkriterien/) steht neben jedem Treffer zusätzlich der **Rahmen**: wie gut Gehalt, Entfernung und Anstellung zu deinen Vorgaben passen.

Unvollständige Treffer sind markiert: **Link führt zu einer Suchseite**, wenn der Link nicht auf eine einzelne Anzeige zeigt, und **Ohne Beschreibung**, wenn die Quelle keinen Text geliefert hat. **Aufräumen → Fehlende Beschreibungen nachladen** holt die ganze Anzeige für bis zu 25 Treffer. Treffer der Arbeitsagentur vervollständigt die Hintergrundsuche von selbst.

## Filtern und sortieren

Über der Liste filterst du nach Quelle, Score und **Umkreis** (10 bis 200 km). Sortieren kannst du nach Passung, Datum oder **Nähe**. Deine Filter bleiben auf diesem Gerät beim nächsten Öffnen erhalten.

## Übernehmen

Ein Klick auf **Übernehmen** legt eine Bewerbung im Status *Entwurf* an. Gehalt, Anstellung und Arbeitsort wandern mit. Ist ein Ansprechpartner genannt, legt cockpit ihn als [Kontakt](/hilfe/kontakte/) an und verknüpft ihn mit der Bewerbung.

Per Rechtsklick auf einen Treffer erreichst du dieselben Aktionen und zusätzlich *Anzeige öffnen*, *Passung bewerten* und *Löschen*.
