# Tasks

## 1. Auswertung (reine Logik)

- [x] 1.1 `pages/cellar/cellar.stats.ts`: Kennzahlen (Flaschen, Weine, geschätzter Wert, Weine ohne Preis), Regalkarten (aus `slots` und `unplacedCount`, Weinarten, Regionen, Wert, Sortierung, „Ohne Fach“ zuletzt) und Aufteilungen nach Weinart, Land › Region und Trinkfenster mit Anteil, Wert, Sortierung und Filterausdruck je Zeile; `cellar.stats.spec.ts` belegt die Szenarien aus `list-statistics` (Kennzahlen 572,00 €, Wein in zwei Regalen, Ohne Fach, Cuvée nur einmal, Ohne Angabe zuletzt) – Verifikation: `npm test` für diese Datei grün
- [x] 1.2 `pages/archive/archive.stats.ts`: Kennzahlen (Flaschen, Einträge, Ø Bewertung ohne unbewertete, Summe Preis) und Aufteilungen nach Jahr (absteigend), Abgangsart, Weinart, Bewertung mit Filterausdruck; `dateRange` nach `core/date-range.ts` übernehmen; Tests inkl. 4,5 Durchschnitt und 38 %/63 % – Verifikation: `npm test` grün

## 2. Ansicht „Statistik“ im Keller

- [x] 2.1 `ListView` auf `'tiles' | 'table' | 'stats'` ändern, `ListViewState` anpassen (Migration von gemerkter/URL-Ansicht `pivot` → `stats`, `endDrill` → `stats`, „Zurück zur Statistik“), Umschalter mit zulässigen Ansichten als Eingabe und Beschriftung „Statistik“; Test der Migration – Verifikation: Unit-Test für `restoreView`/URL `view=pivot` und Umschalter zeigt in Regalen nur zwei Ansichten
- [x] 2.2 Gemeinsame Bausteine (`shared/stat-tiles`, `shared/stat-list`) und Komponente `CellarStats`: Kachelreihe, Regalkarten (Weinarten, Regionen mit „+ n weitere“, Wert), Aufteilungslisten (Land mit Regionen darunter), Hinweis „n Weine ohne Preis“; antippbar per `<button>`, zugängliche Bezeichnung, `ListViewState.drill` mit dem Filter der Zeile – Verifikation: Komponententest öffnet per Klick/Enter die gefilterte Tabelle
- [ ] 2.3 Keller-Seite: Pivot-Zweig durch `CellarStats` ersetzen, Hinweis „Keine passenden Einträge“ und Zurück-Banner; Styles für Karten/Listen (Hell/Dunkel, schmal ohne Seitwärtsscrollen) in `styles.css` oder Komponenten-CSS – Verifikation: Dev-Server, Keller › Statistik in Hell/Dunkel und bei 375 px per Browser geprüft

## 3. Archiv und Regale

- [x] 3.1 `ArchiveStats` (Kacheln, Listen nach Jahr, Abgangsart, Weinart, Bewertung, Zeile → Archivtabelle gefiltert) und Archiv-Seite umstellen – Verifikation: Komponententest/Browserprüfung, Jahr-Zeile filtert auf den Zeitraum
- [x] 3.2 Regale-Seite: Ansicht „Pivot“ samt Fakten-Nachladen für das Pivot entfernen (Details nur noch für optionale Tabellenspalten), Umschalter ohne Statistik – Verifikation: Regale zeigen Kacheln/Tabelle, gemerktes „Pivot“ öffnet Kacheln

## 4. Pivot entfernen

- [x] 4.1 Löschen: `shared/dx/dx-pivot-grid.ts`, `core/pivot-*.ts` samt Specs, Pivot-Felder/-Kennzahlen/-Vorlagen/-KPIs aus `cellar.views.ts`, `archive.views.ts`, `racks.views.ts`, `PivotLayout` aus `list-view-state.ts`, Pivot-/Heatmap-Styles, Chart- und PivotGrid-Imports; nicht mehr benötigte `pivot`/`drill`-Eigenschaften der Felder prüfen – Verifikation: `npm run build` und `npm test` grün, `grep -ri pivot web/src` ohne Treffer außer Migration
- [x] 4.2 README-Abschnitt „Ansichten: Kacheln, Tabelle, Pivot“ auf Kacheln · Tabelle · Statistik umschreiben (Aufbau der Statistik, Wert aus Einkaufspreis, kein Export) – Verifikation: README enthält kein „Pivot“ mehr außer ggf. Migrationshinweis

## 5. Abschluss

- [ ] 5.1 Gesamtprüfung: Statistik in Keller und Archiv mit echten Daten durchklicken (Filter, Drill, Zurück, Regalkarte, Ansicht merken), Konsole ohne Fehler, Bundle-Größe vor/nach notiert – Verifikation: Ergebnis in der Zusammenfassung des Apply-Laufs

## Workflow follow-up

- Vor dem Archivieren die Changes `add-devextreme-grid-pivot` und `improve-pivot-defaults` archivieren; danach in diesem Change `REMOVED`-Deltas für deren Pivot-Anforderungen (`grid-filter-nested-pivot`, `pivot-insights`) ergänzen und `openspec validate` ausführen.
- Change archivieren, sobald Review und Prüfung abgeschlossen sind.
