## Why

Das Pivot öffnet bisher mit einer einzigen Kennzahl (Flaschen) in einer flachen Kreuztabelle (Keller: Weinart × Land). Das ist korrekt, sagt aber auf den ersten Blick wenig: keine Gewichtung, keine Hervorhebung, keine Aussage zu Wert oder Trinkreife. Wer das Pivot öffnet, muss erst Felder ziehen, bevor etwas Nützliches zu sehen ist. Es soll sofort ein aussagekräftiges Bild zeigen und sich danach mit wenigen Klicks umbauen lassen.

## What Changes

- **Bessere Vorgaben je Liste** (Ebenen, Spalten, Kennzahlen, Sortierung):
  - Keller: Zeilen Land › Region (Land zugeklappt), Spalten Weinart, Kennzahlen Flaschen und Summe Kaufpreis; Zeilen nach Flaschen absteigend.
  - Archiv: Zeilen Jahr › Quartal › Monat (nur Jahr aufgeklappt), Spalten Abgangsart, Kennzahlen Flaschen und Durchschnittsbewertung.
  - Regale: Zeilen Regal, Spalten Weinart, Kennzahl Flaschen, zusätzlich Anteil an der Gesamtsumme.
- **Kennzahlkacheln über dem Pivot** (Keller: Flaschen, Weine, Wert; Archiv: Flaschen, Einträge, Ø Bewertung), berechnet aus den gefilterten Zeilen.
- **Heatmap**: Wertzellen werden nach Wert abgestuft eingefärbt (hell/dunkel tauglich, Wert bleibt sichtbar); abschaltbar.
- **Vorlagen-Auswahl** mit wenigen sofort sinnvollen Anordnungen je Liste, z. B. Keller: „Land × Weinart“, „Trinkfenster × Weinart“ (was kann ich jetzt trinken?), „Jahrgang × Weinart“, „Winzer (Top 10)“.
- **Anteil in %** als zusätzlicher Anzeigemodus der Kennzahl („% der Gesamtsumme“).
- **Diagramm** (Balken) zum Pivot, ein-/ausblendbar, verknüpft mit Auf-/Zuklappen und Filtern.
- Gemerkte Anordnung, „Zurücksetzen“ (stellt die neue Vorgabe her), Aufschlüsseln, CSV und der Mehrfach-Rebsorten-Hinweis bleiben erhalten.

Nicht Teil: neue Felder im Datenmodell, Excel-Export, Änderungen an Tabelle und Kacheln.

## Capabilities

### New Capabilities
- `pivot-insights`: Aussagekräftige Vorgabeansicht des Pivots (Vorgaben je Liste, Kennzahlkacheln, Heatmap, Vorlagen, Anteil in %, Diagramm).

### Modified Capabilities
<!-- Keine: Die Vorgaben aus `grid-filter-nested-pivot` (Change add-devextreme-grid-pivot, noch nicht archiviert) werden durch dieses Delta überlagert; siehe Design. -->

## Impact

- `web/src/app/shared/dx/dx-pivot-grid.ts` (Vorlagen, Heatmap, Anteil, Diagramm, Kacheln); neue kleine Hilfen in `web/src/app/core/` (Kachel-Summen, Heatmap-Stufen, Top-N) mit Tests.
- `cellar.views.ts`, `archive.views.ts`, `racks.views.ts`: neue Vorgaben und Vorlagen; `PivotLayout` wird erweitert (`list-view-state.ts`).
- `styles.css`: Kacheln, Heatmap-Farben, Diagrammbereich.
- Zusätzliches DevExtreme-Modul (Chart), lazy mit dem Pivot geladen; Pivot-Chunk wächst.
- Bereits gemerkte Anordnungen bleiben gültig; nur „Zurücksetzen“ führt zur neuen Vorgabe.
