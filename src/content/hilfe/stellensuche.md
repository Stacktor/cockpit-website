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
| **Bundesagentur für Arbeit** | keine | Größte Quelle für Deutschland, mit Umkreissuche und Filtern |
| **AMS Österreich / EURES** | keine | Stellen aus Österreich und weiteren Ländern (Schweiz, Südtirol, Luxemburg, Niederlande, Belgien, Frankreich, Spanien, Polen, Tschechien) über das EU-Portal EURES |
| **Karriereseiten** | Adresse der Stellenseite | Große Firmen; cockpit erkennt Greenhouse, Lever, Personio, Recruitee, SmartRecruiters, Workable und Workday |
| **RSS-Feeds** | Feed-Adresse | Eigene Job-Feeds |
| **Stelle per Link** | Link der Anzeige | Auch von LinkedIn, StepStone und Indeed, eine Anzeige nach der anderen |

Ältere Quellen (Arbeitnow, Adzuna, Jooble, Remotive und die Portal-Suche) lassen sich nicht mehr neu anlegen; bestehende laufen weiter, bis du sie entfernst.

### Jobportale ohne Schnittstelle

LinkedIn, StepStone und Indeed bieten keine offene Schnittstelle an. cockpit liest ihre Suchseiten nicht mehr. Verlässlich geht es so: den Link der Anzeige unter **Stellen → Suchen → Stelle per Link** einfügen oder die Anzeige beim Ansehen mit der [Browser-Erweiterung](/hilfe/browser-erweiterung/) übernehmen.

### Zustand einer Quelle

Unter **Stellen → Quellen → Deine Quellen** steht je Quelle, wann sie zuletzt abgerufen wurde und wie viele Treffer sie dabei lieferte. Schlägt ein Abruf fehl, zeigt cockpit den Fehler und zählt mit. Nach fünf Fehlern in Folge pausiert cockpit die Quelle, meldet das in den Benachrichtigungen und bietet **Wieder aktivieren** an; der Zähler beginnt dann von vorn. Liefert eine Quelle keine Treffer, ist das kein Fehler: Sie antwortet, es passt nur gerade nichts.

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

## Aufräumen

Über **Aufräumen** löschst du verworfene Treffer, entfernst Anzeigen, die älter als 14 oder 30 Tage sind, oder leerst die ganze Liste. Gemerkte und übernommene Treffer bleiben dabei stehen. Gelöschte Treffer kommen beim nächsten Abruf nicht wieder, auch wenn die Quelle sie noch liefert.

Brauchst du sie doch, holt **Aufräumen → Gelöschte Treffer zurückholen** alle gelöschten Treffer als offen zurück. Beschreibung und Kategorien füllt der nächste Abruf wieder auf. Nach 120 Tagen entfernt cockpit gelöschte Treffer endgültig.
