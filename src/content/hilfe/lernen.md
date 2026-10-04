---
titel: Lernen aus Entscheidungen
beschreibung: "Wie cockpit aus übernommenen und verworfenen Treffern lernt, was der Rückblick zeigt und wie du das abschaltest."
reihenfolge: 35
kategorie: KI und Unterlagen
stand: Oktober 2026
icon: lightbulb
---

Jedes Mal, wenn du einen bewerteten Treffer übernimmst oder verwirfst, merkt sich cockpit diese Entscheidung. Daraus entstehen zwei Dinge: eine Bewertung, die näher an deinen Vorlieben liegt, und ein Rückblick mit Zahlen zu deiner Suche. Beides läuft auf deinem Rechner.

## Bessere Bewertungen

Sobald mindestens drei Entscheidungen vorliegen, bekommt das Bewertungsmodell die letzten zwölf als Beispiele mit: Titel, Firma, damaliger Score und ob du übernommen oder verworfen hast. Das Modell erkennt so Vorlieben wie Branche, Rolle oder Arbeitsmodell.

Die Beispiele gelten als Vorlieben, nicht als Regeln. Fehlt einer Stelle eine zentrale Anforderung, bleibt der Score niedrig, auch wenn du ähnliche Stellen sonst übernimmst.

Abschalten kannst du das unter **Einstellungen → KI → Personalisierung** mit dem Schalter *Entscheidungen in die Bewertung einbeziehen*.

## Rückblick

Auf dem Start erscheint die Karte **Was cockpit gelernt hat**, sobald genug Daten vorliegen. Sie arbeitet ohne KI mit festen Auswertungen und nennt zu jeder Aussage die Zahlen, auf denen sie beruht. Beispiele:

- **Auffällige Quelle:** „Von Remotive verwirfst du 90 % der Treffer (36 von 40), von der Arbeitsagentur nur 30 %.“ Dazu der Vorschlag, die Suchbegriffe für diese Quelle enger zu fassen.
- **Score-Schwelle:** „Übernommene Treffer hatten im Schnitt 78 Punkte, verworfene 52.“ Mit **Filter „Match ab …“ setzen** übernimmst du die vorgeschlagene Schwelle in die Trefferliste.
- **Rückmeldungen:** auf wie viele Bewerbungen eine Antwort kam, insgesamt und je Quelle.
- **Aktivität:** ein Hinweis, wenn seit längerem keine neue Bewerbung rausging.

Bei wenigen Entscheidungen bleibt der Rückblick aus. Aussagen aus fünf Treffern wären Zufall.

Nichts davon ändert cockpit selbst. Vorschläge setzt du um, wenn du willst.

## Eigenes Training

Unter **Einstellungen → KI → Personalisierung** exportierst du alle Entscheidungen als JSONL-Datei. Damit lässt sich ein eigenes Modell feinabstimmen, etwa ein lokales Modell für die Bewertung.

## Profil aus Dokumenten

Neben Entscheidungen lernt cockpit aus deinen Unterlagen: Zeugnisse und Zertifikate ergänzen den Werdegang und die Skills, siehe [Profil und Dokumente](/hilfe/profil-und-dokumente/#zeugnisse-und-zertifikate).
