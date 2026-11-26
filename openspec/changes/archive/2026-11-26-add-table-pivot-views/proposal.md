# Proposal

## Why

Keller, Archiv und Regale zeigen ihre Einträge ausschließlich als Kacheln in einer Liste. Das ist auf dem Handy übersichtlich, stößt aber bei größeren Beständen an Grenzen: Man kann Weine nicht nach Spalten sortieren, nicht mehrere Eigenschaften gleichzeitig vergleichen und keine Auswertungen wie „Flaschen je Land und Weinart“ oder „getrunkene Flaschen je Jahr und Art“ ablesen. Gewünscht ist, die Ansicht umzustellen: wahlweise als Tabelle oder als Pivot, jeweils mit Filtern.

## What Changes

- Neu: In **Keller**, **Archiv** und **Regale** gibt es einen Umschalter „Ansicht“ mit **Kacheln** (bisher, Standard), **Tabelle** und **Pivot**. Die Wahl wird je Liste im Gerät gemerkt.
- Neu: **Tabelle** mit sortierbaren Spalten, wählbaren Spalten (ein-/ausblenden) und Zeilen, die wie die Kacheln zur Einzelansicht führen. Der Keller zeigt z. B. Name, Winzer, Jahrgang, Art, Land, Region, Rebsorten, Flaschen, Trinkfenster, Preis; das Archiv Datum, Wein, Art, Anzahl, Bewertung, Preis, Gegenpartei; die Regale Name, Reihen, Spalten, Kapazität, belegt, frei.
- Neu: **Filter** für alle Ansichten: die bisherige Suche und Chips bleiben, dazu Spaltenfilter (Weinart, Land, Region, Rebsorte, Jahrgang von/bis, Trinkfenster-Status, Art des Abgangs, Zeitraum, Bewertung ab, Regalbelegung). Filter gelten für Kacheln, Tabelle und Pivot gleichermaßen und stehen in der URL.
- Neu: **Pivot** mit frei wählbarer Zeilen- und Spaltendimension, Kennzahl (Anzahl Flaschen, Anzahl Weine/Einträge, Summe Preis, Ø Bewertung), Summenzeile/-spalte und Leerwert „Ohne Angabe“. Das Antippen einer Zelle zeigt die zugehörigen Einträge als gefilterte Tabelle.
- Neu: Tabelle und Pivot lassen sich als CSV exportieren.
- Kein Backend-Umbau: Es werden die vorhandenen Endpunkte genutzt, Sortierung, Filterung und Pivot-Berechnung laufen im Frontend. Kein Breaking Change.

## Capabilities

### New Capabilities
- `list-table-pivot-views`: Umschaltbare Ansichten (Kacheln, Tabelle, Pivot) mit Filtern für Keller, Archiv und Regale, einschließlich Spaltenwahl, Sortierung, Pivot-Konfiguration und CSV-Export.

### Modified Capabilities
<!-- Keine: Es ändern sich keine bestehenden Anforderungen; die Kachelansicht bleibt unverändert. -->

## Impact

- **Frontend (Angular)**: `pages/cellar`, `pages/archive`, `pages/racks`; neue gemeinsame Bausteine unter `shared/` bzw. `core/` (Ansichtsumschalter, Datentabelle, Pivot-Berechnung als reine Logik mit Tests, Filterleiste, CSV-Export); Ablage der Ansichtswahl in `StorageService`.
- **Backend**: keine Änderung. Archiv-Einträge enthalten kein Land/Region/Rebsorte; das nachzuliefern ist bewusst nicht Teil dieses Changes (siehe design.md).
- **Abgrenzung / Nicht-Ziele**: keine gespeicherten Pivot-Vorlagen, keine Diagramme im Pivot, kein serverseitiges Paging, keine Bearbeitung direkt in der Tabelle.
