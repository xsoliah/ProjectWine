## Why

Das Pivot (Kreuztabelle mit Diagramm) wirkt überladen und beantwortet die einfache Frage nicht: „Was liegt eigentlich in meinen Regalen und was ist es wert?“. Gewünscht ist ein ruhiger, gut lesbarer Überblick über Keller und Flaschen – ohne Diagramme, ohne Feld-Baukasten. Der Name „Pivot“ ist zudem ein Werkzeugbegriff; „Statistik“ sagt, worum es geht.

## What Changes

- **BREAKING (Oberfläche):** Die Ansicht „Pivot“ entfällt in Keller, Archiv und Regale; an ihre Stelle tritt die Ansicht **„Statistik“** (Umschalter: Kacheln · Tabelle · Statistik). Pivot-Anordnung, Vorlagen, Heatmap, Diagramm und Feldauswahl werden entfernt.
- **Statistik Keller:** Kennzahlkacheln (Flaschen, Weine, geschätzter Wert), darunter
  - **Regale:** je Regal (und „Ohne Fach“) eine Karte mit Flaschenzahl, Weinarten, Regionen und geschätztem Wert;
  - **Aufteilungen** als einfache Listen mit Flaschen, Anteil und Wert: nach Weinart, nach Land mit Regionen darunter, nach Trinkfenster.
- **Statistik Archiv:** Kennzahlkacheln (Flaschen, Einträge, Ø Bewertung, Summe Preis) und Listen nach Jahr, Abgangsart, Weinart und Bewertung.
- **Regale-Liste** bietet nur noch Kacheln und Tabelle; die Inhalte der Regale stehen in der Keller-Statistik.
- Filter wirken weiterhin in allen Ansichten; ein Tipp auf eine Zeile/Karte der Statistik öffnet die Tabelle mit passendem Filter („Zurück zur Statistik“).
- Eine auf dem Gerät gemerkte Ansicht „Pivot“ wird zu „Statistik“ (Keller, Archiv) bzw. „Kacheln“ (Regale); gemerkte Pivot-Anordnungen werden verworfen.

Nicht Teil: Diagramme jeder Art, Export der Statistik, ein echtes Marktwert-Feld oder eine Bewertung per Recherche (der Wert beruht auf dem erfassten Einkaufspreis), Änderungen an Kacheln und Tabelle, die Seite „Übersicht“.

## Capabilities

### New Capabilities
- `list-statistics`: Statistikansicht der Listen Keller und Archiv (Kennzahlen, Regale mit Inhalt, Aufteilungen, Aufschlüsseln).

### Modified Capabilities
- `list-table-pivot-views`: Umschalter nennt „Statistik“ statt „Pivot“; Pivotansicht, Pivotzelle-Aufschlüsseln und das Pivot der Regale entfallen; Filter, CSV-Export und Bedienung gelten für Kacheln, Tabelle und Statistik.

## Impact

- Entfernt: `web/src/app/shared/dx/dx-pivot-grid.ts`, `core/pivot-*.ts` samt Tests, Pivot-Vorlagen/-Kennzahlen/-Fakten in `cellar.views.ts`, `archive.views.ts`, `racks.views.ts`, Pivot-Styles; DevExtreme-Module Pivot und Chart (Bundle schrumpft).
- Neu: reine Auswertungsfunktionen in `web/src/app/core/` (mit Tests) und gemeinsame Statistik-Bausteine in `web/src/app/shared/`.
- Geändert: `view-switch.ts`, `list-model.ts` (`ListView`), `list-view-state.ts` (Migration „pivot“, Aufschlüsseln), die drei Seiten, README-Abschnitt „Ansichten“.
- Kein Backend, keine neuen Daten: Alles wird aus der bereits geladenen Weinliste (Flaschen mit Regalfach, Region, Einkaufspreis) berechnet.
- Überschneidung: Die noch nicht archivierten Changes `add-devextreme-grid-pivot` und `improve-pivot-defaults` beschreiben das Pivot, das dieser Change entfernt (siehe design.md).
