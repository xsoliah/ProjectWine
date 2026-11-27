## Context

Beobachtet: `DxPivotGrid` (`shared/dx/dx-pivot-grid.ts`) baut aus `rows`, `fields`, `measures` und `layout` (`PivotLayout`: `rows`, `cols`, `data` als Schlüssellisten) eine `PivotGridDataSource`. Der Zustand (`ds.state()`) wird je Liste unter `pivot:<id>` gemerkt; ohne gemerkten Zustand gilt die Vorgabe (z. B. `CELLAR_PIVOT` = Weinart × Land mit Flaschen). Es gibt Werkzeugknöpfe (aufklappen, Summen, Zurücksetzen, CSV), aber keine Kacheln, Färbung, Vorlagen oder Diagramm. DevExtreme-Pivot bietet `summaryDisplayMode`, `sortBySummaryField`, `onCellPrepared` und `bindChart`.

Annahmen: „cooler“ heißt mehr Aussage und Übersicht, kein neues Bedienkonzept. Die Vorgaben und Vorlagen sind ein Vorschlag und in `*.views.ts` leicht änderbar.

## Decisions

1. **`PivotLayout` wird erweitert** um optionale `collapsed` (Felder, deren Ebenen zugeklappt starten), `sort` (Kennzahl + Richtung), `mode` je Kennzahl (`value` | `percent`) und `top` (Anzahl). Alte Layouts bleiben gültig.
2. **Vorlagen sind Daten**: je Liste eine Liste `{ id, title, layout }` neben den Vorgaben in `*.views.ts`; die Vorgabe ist die erste Vorlage. Die Wahl wendet das Layout wie „Zurücksetzen“ an. Die aktive Vorlage wird durch Vergleich von Feldzuordnung und Kennzahlen mit dem aktuellen `ds.state()` erkannt, sonst „Eigene Anordnung“.
3. **Top N** in reiner Logik (`core/pivot-top.ts`): die größten N Werte eines Feldes nach Kennzahl aus den Zeilen bestimmen und als `filterValues` am Feld setzen (testbar, unabhängig von DevExtreme).
4. **Kennzahlkacheln aus den gefilterten Zeilen** (`core/pivot-kpis.ts`), nicht aus dem Pivot: unabhängig von der Anordnung und ohne Rebsorten-Auffächerung, daher keine Doppelzählung.
5. **Heatmap über `onCellPrepared`**: nur Datenzellen ohne Summen; Stufe 0–4 relativ zu Min/Max der Kennzahl (`core/heat-level.ts`), umgesetzt als CSS-Klassen `heat-1…4` mit Akzentfarbe und Transparenz, im Dunkelmodus angepasst. Der Wert bleibt Text.
6. **Anteil in %** über `summaryDisplayMode: 'percentOfGrandTotal'`; der CSV-Export liest die angezeigten Zellen und folgt dem Modus (per Test zu belegen).
7. **Diagramm**: DevExtreme `Chart`, lazy im selben `@defer`, per `pivotGrid.bindChart(...)` verknüpft; Zeilen als Balken (`inverted`), Spalten als gestapelte Reihen, jede Kennzahl in eigenem Bereich (`splitPanes`), da Flaschen und Euro nicht auf eine Achse gehören. Balkenklick nutzt dieselbe Aufschlüsselung wie `cellClick`. Textalternative: `aria-label` plus verstecktes Wertelisting der obersten Zeilen. Standard nach Bildschirmbreite (Handy aus).
8. **UI-Schalter getrennt merken** (Heatmap, Diagramm) unter `pivotui:<id>`, damit ein ungültiger Pivotzustand sie nicht mitreißt. Gemerkter Pivotzustand hat weiter Vorrang vor der Vorgabe.
9. **Verhältnis zu `grid-filter-nested-pivot`**: Dieser Change (noch nicht archiviert) nennt die alten Vorgaben „Keller Weinart × Land mit Flaschen“ usw. `pivot-insights` ersetzt diese Vorgaben; beim Archivieren gilt die neue. Die Datei des anderen Changes wird hier nicht angefasst.

## Risks / Trade-offs

- Der Pivot-Chunk wächst durch das Diagramm; durch `@defer` auf die Pivotansicht begrenzt, Größe vor/nach messen.
- Heatmap-Kontrast im Dunkelmodus ist visuell zu prüfen.
- Bei Rebsorte als Pivotfeld zeigt auch das Diagramm die Mehrfachzählung; der vorhandene Hinweis bleibt.
- Die Erkennung der aktiven Vorlage kann an internen DevExtreme-Zustandsfeldern scheitern; Rückfall ist die Anzeige „Eigene Anordnung“ (unkritisch).
