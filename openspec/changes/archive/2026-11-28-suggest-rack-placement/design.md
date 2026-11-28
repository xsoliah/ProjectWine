## Context

Ein Wein ist ein Eintrag mit Flaschenzahl (`Wine.Quantity`); eingelagert wird flaschenweise über `RackSlot` (ein belegtes Fach je Flasche, freie Fächer werden nicht gespeichert). Einlagern geht heute nur einzeln über `RackService.PlaceAsync` bzw. die Regalseite mit `?place=<wineId>` (Einlagern-Modus). Nach dem Speichern navigieren `wine-new` und `draft-review` direkt zur Weinseite. Region, Land, Erzeuger, Typ, Jahrgang und Trinkfenster liegen am Wein vor. Sprache der Oberfläche und Meldungen ist Deutsch.

## Goals / Non-Goals

**Goals:**
- Direkt nach dem Hinzufügen einlagern, mit einem Tipp, auf Basis eines nachvollziehbaren Vorschlags.
- Der Vorschlag erhält und verstärkt die vorhandene Ordnung (Region, Erzeuger, Typ, Alter); Flaschen desselben Weins liegen zusammen.
- Mehrere Flaschen atomar einlagern.

**Non-Goals:**
- KI, automatisches Einlagern, Umsortieren bestehender Flaschen, Temperaturzonen, Vorschlag beim Umlagern.

## Decisions

**1. Regelbasiert auf dem Server (`PlacementSuggestionService`), keine KI.**
Kostenlos, deterministisch und testbar. Die Daten (Belegung und Weinattribute) liegen ohnehin in der Datenbank. Ein KI-Vorschlag wäre nicht reproduzierbar, bräuchte Datenweitergabe und Kontingent. *Alternative:* Berechnung im Browser – verworfen, weil der Server die Wahrheit über die Belegung hat und die Regeln dort mit den vorhandenen Unit- und SpecFlow-Tests prüfbar sind.

**2. Bewertung eines freien Fachs über seine Nachbarschaft.**
Für jedes freie Fach (alle Regale) wird die Ähnlichkeit zu belegten Fächern der Nachbarschaft berechnet: gleiche Reihe (Abstand 1 bzw. 2 Spalten) und die direkt angrenzenden Reihen (Abstand 1). Näher zählt mehr (Gewicht 1,0 / 0,5 / 0,35 für gleiche Reihe Abstand 1 / gleiche Reihe Abstand 2 / angrenzende Reihe). Die Ähnlichkeit zweier Weine wird additiv aus Punkten gebildet, damit die Rangfolge glatt ist:

| Merkmal | Punkte |
|---|---|
| derselbe Wein (gleiche Id) | 100 |
| gleicher Erzeuger (normalisiert, nur wenn vorhanden) | 40 |
| gleiche Region | 25 |
| gleiches Land | 20 |
| gleicher Typ | 15 |
| Jahrgang höchstens 2 Jahre auseinander (nur wenn beide vorhanden) | 5 |
| Trinkfenster überlappt oder liegt höchstens 3 Jahre auseinander | 5 |

Die Rangfolge Wein > Erzeuger > Region > Land > Typ ergibt sich aus den Punkten. Der Wert eines Fachs ist der beste einzelne Nachbar plus ein Drittel der übrigen Nachbarwerte, damit ein Fach zwischen vielen mittelmäßigen Nachbarn nicht ein Fach neben einem sehr passenden schlägt. Fehlen Region, Land oder Erzeuger, trägt der Wein nur die Merkmale bei, die er hat (kein Abzug).

**3. Fremde Nachbarn bremsen, freie Ecken belohnen.**
Ein Fach direkt neben einem Wein ohne jede Ähnlichkeit (0 Punkte) bekommt einen kleinen Abzug (−5 je solchem Nachbarn), ein Fach, dessen Nachbarn alle leer sind, einen kleinen Bonus (+3). So landet ein „Exot“ bevorzugt in einer freien Ecke statt mitten in einer anderen Region. Ohne eingelagerte Weine haben alle Fächer denselben Wert; der Tiebreak entscheidet.

**4. Deterministischer Tiebreak.**
Bei Punktgleichheit: Regal mit mehr freien Fächern, dann Regalname, dann Reihe aufsteigend, dann Spalte aufsteigend. „Oben links zuerst“ ist damit der Standard im leeren Regal.

**5. Mehrere Flaschen: Abschnitte statt Einzelfächer.**
Für n Flaschen wird der beste **zusammenhängende freie Abschnitt** der Länge n in einer Reihe gesucht (Summe der Fachwerte, berechnet gegen die Belegung vor dem Vorschlag). Gibt es keinen Abschnitt dieser Länge, wird der beste längste Abschnitt genommen und der Rest bevorzugt in der angrenzenden Reihe, dann in anderen Reihen/Regalen fortgesetzt. Regale sind höchstens 50 × 50 groß, der Aufwand ist unkritisch.

**6. Begründung als Text.**
Der Dienst liefert zusätzlich zu den Fächern einen deutschen Satz, der den ausschlaggebenden Nachbarn nennt („Neben deinen Weinen aus Toskana“, „Neben anderen Weinen von Antinori“, „Noch keine Weine eingelagert – erste freie Fächer“, „Freie Ecke, da nichts Ähnliches vorhanden“). Das erklärt die Wahl und schafft Vertrauen in den Vorschlag.

**7. API.**
- `GET /api/wines/{id}/placement-suggestion?count=n` (count optional; Standard und Obergrenze: nicht eingelagerte Flaschen) liefert `PlacementSuggestionDto { WineId, Requested, Slots[{RackId, RackName, Row, Column}], Unplaceable, Reason }`. Reine Berechnung, ändert nichts.
- `POST /api/racks/placements` mit `{ WineId, Slots[{RackId, Row, Column}] }` legt alle Flaschen in **einer Transaktion** ein (alles oder nichts). Geprüft werden Besitz, Regalgrenzen, freie Fächer, doppelte Fächer in der Anfrage und Anzahl ≤ nicht eingelagerte Flaschen. Konflikt → 409 mit verständlicher Meldung; die App fordert dann einen neuen Vorschlag an. Das bestehende `POST /api/racks/{id}/slots` bleibt unverändert; beide teilen sich die Prüfungen in `RackService`.

**8. Frontend: Einlagern-Schritt nach dem Speichern.**
Neue Komponente `PlacementStep` (Dialog wie die vorhandenen Dialoge) zeigt Vorschlag (Regal, Fächer, Begründung, kleine Rasteransicht der betroffenen Reihen mit hervorgehobenen Fächern) und die Aktionen „Einlagern“, „Selbst wählen“ (navigiert zur Regalseite `?place=<id>`) und „Später“. `wine-new` und `draft-review` navigieren nach dem Speichern erst nach diesem Schritt zur Weinseite, aber nur wenn ein Regal mit freien Fächern existiert; ohne Regal gibt es einen Hinweis „Regal anlegen“. `wine-detail` bekommt „Einlagerung vorschlagen“ (nur bei `unplacedCount > 0`), das denselben Schritt öffnet. Anzahl der Flaschen im Schritt: bei neuem Wein die angelegte Menge, bei „Flaschen hinzufügen“ der hinzugefügte Betrag (jeweils höchstens die nicht eingelagerten Flaschen).
*Alternative:* Regalauswahl direkt im Formular – verworfen, weil Wein-Id und endgültige Flaschenzahl erst nach dem Speichern feststehen und das Formular auch beim Bearbeiten genutzt wird.

**9. Keine Migration.**
Alle benötigten Daten existieren; die Berechnung liest `Racks`, `RackSlots` (mit Wine, Country, Region) nur lesend.

## Risks / Trade-offs

- **Bewertungsgewichte sind Heuristik** → in einer Konstanten-Tabelle gebündelt, durch Unit-Tests pro Szenario abgesichert, leicht anpassbar.
- **Vorschlag veraltet beim Übernehmen** (zweites Gerät) → atomares Einlagern mit Konflikt-Antwort; die App holt automatisch einen neuen Vorschlag.
- **Viele Flaschen, wenige Lücken** → der Vorschlag kann zerstückelt sein; Begründung und „Selbst wählen“ bleiben als Ausweg.
- **Überschneidung mit offenen Changes** (`combine-barcode-and-photo-capture` ändert `wine-new`, `improve-3d-rack-bottles` ändert `RackWineDto`) → dieser Change hängt nur am Punkt „nach erfolgreichem Speichern“ und fügt neue Verträge hinzu; bei gleichzeitiger Umsetzung ist eine kleine Merge-Anpassung in `wine-new.ts` nötig.
- **Region oder Erzeuger fehlen häufig** (Barcode-Entwurf, Handeingabe) → fehlende Merkmale geben keine Punkte, aber auch keinen Abzug; im Zweifel greifen Typ und Tiebreak.

## Open Questions

- Sollen Sekt und Süßwein ausdrücklich in untere oder obere Reihen (Temperatur)? Vorerst nein, da Regale keine Zonen kennen.
