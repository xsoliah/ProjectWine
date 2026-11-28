## Context

Beobachtet: Das Pivot ist `DxPivotGrid` (`shared/dx/dx-pivot-grid.ts`, ~660 Zeilen) mit Vorlagen, Heatmap, Diagramm, Kennzahlkacheln und Layout-Speicher; die Listen definieren dafür Pivot-Felder, Kennzahlen, Vorlagen und (Regale) „Fakten“ je Flasche in `cellar.views.ts`, `archive.views.ts`, `racks.views.ts`. `ListView` ist `'tiles' | 'table' | 'pivot'` (`core/list-model.ts`), `ListViewState` merkt die Ansicht (`view:<id>`) und kann aus einer Pivotzelle in die Tabelle aufschlüsseln (`drill`, `endDrill` → „Zurück zum Pivot“). Siehe proposal.md – Why für die Motivation.

Wichtig für die Daten: Jeder `Wine` der Keller-Liste trägt `slots` (je Flasche im Regal: `rackId`, `rackName`), `unplacedCount`, `region`, `country`, `type`, `quantity`, `purchasePrice`. Die Verteilung der Flaschen auf Regale, Weinarten und Regionen lässt sich daher **ohne** Nachladen der Regaldetails berechnen. Ein echtes Marktwert-Feld gibt es nicht.

Die Changes `add-devextreme-grid-pivot` und `improve-pivot-defaults` sind umgesetzt, aber noch nicht archiviert; ihre Deltas (`grid-filter-nested-pivot`, `pivot-insights`) beschreiben das Pivot, das hier entfernt wird.

## Goals / Non-Goals

**Goals:**
- Statistik als reine, lesbare Ansicht ohne Konfiguration und ohne Diagramme.
- Auswertung als reine Funktionen mit Tests, getrennt von der Darstellung.
- Pivot-Code und die DevExtreme-Module Pivot und Chart vollständig entfernen.

**Non-Goals:**
- Kein Export, keine Diagramme, keine frei wählbaren Dimensionen, kein Backend.
- Keine Marktwert-Schätzung; „geschätzt“ meint hier die Hochrechnung aus dem Einkaufspreis.

## Decisions

1. **Wert = Einkaufspreis × Flaschen, Wein ohne Preis zählt nicht.** Wie bisher auf der Übersichtsseite und in der Pivot-Kachel; die Beschriftung lautet „Geschätzter Wert“, ein Hinweis nennt, wie viele Weine ohne Preis fehlen. Alternative (Recherche per Websuche wie bei der Trinkkurve) verworfen: eigener, größerer Change mit externen Aufrufen.
2. **Regalverteilung aus `wine.slots`, nicht aus den Regaldetails.** Je Wein zählen die Slots je `rackName`; `unplacedCount` ergibt „Ohne Fach“. Das vermeidet das Nachladen aller Regale, das das Regale-Pivot brauchte. Der Wert einer Flasche ist `purchasePrice` des Weins. Die Statistik der Regale lebt deshalb in der Keller-Statistik; die Regale-Liste verliert die dritte Ansicht (Alternative: eigene Regal-Statistik mit zusätzlichen Weindaten – Doppelung ohne Mehrwert).
3. **Reine Auswertung in `pages/cellar/cellar.stats.ts` und `pages/archive/archive.stats.ts` (gemeinsame Bausteine in `core/stats.ts`).** Eingabe: gefilterte Zeilen; Ausgabe: Kennzahlen, Regalkarten und Aufteilungszeilen (`{ label, bottles, share, value, filter }`). Sortierung („Ohne Angabe“ zuletzt, Gleichstand alphabetisch), ganzzahlige Prozent und Rebsorten-Unabhängigkeit (keine Fächerung) liegen dort und sind per Unit-Test belegt. Prozentsumme muss nicht 100 ergeben (reine Rundung, wie in der Übersicht).
4. **Aufschlüsseln über Filterausdrücke.** Jede Zeile/Karte trägt fertig den Filterausdruck (`[['country','=','Italien'],'and',['region','=','Toskana']]`, Regal über das vorhandene Feld `rack` mit `contains`, „Ohne Fach“ über `placement`). `ListViewState.drill()` bleibt, `endDrill()` kehrt zu `'stats'` zurück. Für das Jahr im Archiv wird `dateRange` aus `pivot-drill.ts` in `core/date-range.ts` übernommen, der Rest von `pivot-drill.ts` entfällt.
5. **`ListView` wird `'tiles' | 'table' | 'stats'`; Migration beim Lesen.** `restoreView` und der Adressparameter `view=pivot` werden auf `stats` abgebildet (Regale: `tiles`, da dort keine Statistik angeboten wird). Der Umschalter bekommt die zulässigen Ansichten als Eingabe. Gemerkte `pivot:*`-Schlüssel bleiben ungenutzt liegen (kein Aufräumen nötig; Speicher klein) – alternativ beim Start löschen, falls `StorageService` das trivial kann.
6. **Darstellung ohne DevExtreme.** Kacheln, Regalkarten und Listen sind schlichtes HTML/CSS in einer gemeinsamen `StatSection`-Hülle (Überschrift, Zeilen) und eigenen Komponenten `CellarStats`/`ArchiveStats`; antippbare Teile sind `<button>`/`<a>`-Elemente (Tastatur, zugängliche Bezeichnung), Karten umbrechen per CSS-Grid (`auto-fill`), nutzen die Themevariablen (Hell/Dunkel) und müssen kein DevExtreme-Theme laden – die Statistik braucht kein `@defer`.
7. **Entfernen statt Verstecken.** `dx-pivot-grid.ts`, `pivot-*.ts` (außer `dateRange`) samt Tests, Pivot-Teile der `*.views.ts`, `pv-*`/`.dx-pivotgrid`-Styles und Pivot-/Chart-Imports werden gelöscht; geprüft wird, dass das Tabellenmodul weiter lazy lädt und der Bundle nicht wächst.
8. **Verhältnis zu den offenen Changes.** Die Pivot-Anforderungen der unarchivierten Changes (`grid-filter-nested-pivot`, `pivot-insights`) werden nicht in diesem Change angefasst. Reihenfolge beim Archivieren: erst jene beiden, dann diesen; danach `REMOVED`-Deltas für deren Pivot-Anforderungen ergänzen (Aufgabe unter „Workflow follow-up“). Das Delta von `list-table-pivot-views` gilt gegen den Stand der Hauptspezifikation und entfernt dort „Pivotansicht“ usw.

## Risks / Trade-offs

- Wert ohne Preis ist unvollständig → Hinweis mit Anzahl der Weine ohne Preis; Ansicht bleibt ehrlich („geschätzt“).
- Leute, die das Pivot als Werkzeug nutzten, verlieren freie Auswertung → bewusst gewünscht; Tabelle mit Filtern und CSV bleiben.
- Karten mit sehr vielen Regionen werden lang → je Karte höchstens die fünf größten Regionen/Weinarten, Rest als „+ n weitere“ (reine Anzeige, Zahlen der Karte bleiben vollständig).
- Gemerkte Ansicht/Adresse mit `pivot` → Migration (Entscheidung 5) per Test abgesichert.

## Migration Plan

Reine Frontend-Änderung, keine Datenmigration. Ausliefern wie üblich über den Web-Build; Rückfall durch Zurücksetzen des Commits (die Pivot-Daten waren nur Gerätezustand).

## Open Questions

- Soll die Regale-Liste später eine eigene Statistik bekommen (Auslastung, freie Fächer)? Kann später ergänzt werden, ohne diesen Change zu ändern.
