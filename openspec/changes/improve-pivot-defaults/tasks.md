## 1. Grundlagen (reine Logik mit Tests)

- [x] 1.1 `PivotLayout` in `core/list-view-state.ts` um optionale `collapsed`, `sort`, `mode`, `top` erweitern; Rückwärtskompatibilität testen
- [x] 1.2 `core/pivot-kpis.ts`: Kennzahlkacheln aus gefilterten Zeilen (ohne Rebsorten-Auffächerung) + Tests
- [x] 1.3 `core/heat-level.ts`: Stufen 0–4 je Kennzahl aus Min/Max + Tests (ein Wert, leer, fehlende Werte)
- [x] 1.4 `core/pivot-top.ts`: Top-N-Werte eines Feldes nach Kennzahl + Tests

## 2. Vorgaben und Vorlagen

- [x] 2.1 `cellar.views.ts`: neue Vorgabe (Land › Region, Weinart, Flaschen + Kaufpreis, absteigend), Vorlagen inkl. Trinkfenster × Weinart, Jahrgang × Weinart, Winzer (Top 10); Kacheln Flaschen/Weine/Wert
- [x] 2.2 `archive.views.ts`: Vorgabe Jahr › Quartal › Monat × Abgangsart mit Flaschen + Ø Bewertung; Vorlagen; Kacheln
- [x] 2.3 `racks.views.ts`: Vorgabe Regal × Weinart mit Flaschen + Anteil; Kacheln Flaschen/Regale
- [x] 2.4 Seiten (`cellar.html`, `archive.html`, `racks.html`) reichen Vorlagen und Kacheln an `app-dx-pivot-grid`

## 3. Pivot-Komponente

- [x] 3.1 Kachelzeile über dem Pivot (reagiert auf Filter) + Styles
- [x] 3.2 Vorlagen-Auswahl mit Erkennung „Eigene Anordnung“; Wahl wendet das Layout an und merkt es
- [x] 3.3 Sortierung nach Kennzahl, zugeklappte Startebenen und Top N aus dem Layout umsetzen
- [x] 3.4 Heatmap per `onCellPrepared` + CSS-Stufen (hell/dunkel) + Schalter, Wahl unter `pivotui:<id>` merken
- [x] 3.5 Anzeigemodus „% der Gesamtsumme“ je Kennzahl; CSV-Export folgt dem Modus (Test)
- [x] 3.6 Diagramm (Chart, `bindChart`) mit Schalter, Handy-Standard aus, Textalternative, Klick-Aufschlüsselung
- [x] 3.7 „Zurücksetzen“ stellt die neue Vorgabe her; gemerkte Anordnung behält Vorrang

## 4. Prüfung

- [x] 4.1 Tests und Build grün; Größe des Pivot-Chunks vor/nach notieren
- [x] 4.2 Im Browser prüfen: Keller, Archiv, Regale beim ersten Öffnen ohne gemerkten Zustand, Hell/Dunkel, Handybreite, Filter → Kacheln/Diagramm aktualisieren, Aufschlüsseln aus Zelle und Balken
- [x] 4.3 README: Pivot-Funktionen (Vorlagen, Heatmap, Diagramm) kurz ergänzen
