# Tasks

## 1. DevExtreme einrichten

- [x] 1.1 `devextreme` und `devextreme-angular` in `web/` installieren (Version passend zu Angular 22; bei Inkompatibilität stoppen und beim Benutzer nachfragen), Locale `de`, Theme (hell/dunkel nach `prefers-color-scheme`, an Akzentfarbe und Schrift der App angepasst) und Lizenzschlüssel-Einbindung über ignorierte Datei bzw. Umgebungsvariable (nicht einchecken; in `dev.ps1`, `publish.ps1`, README beschreiben). Prüfen: `ng build` und `ng test` grün; eine Testseite mit einem `dx-data-grid` zeigt sich deutsch und in beiden Designs korrekt.

## 2. Gemeinsamer Filter

- [x] 2.1 Filterausdruck (DevExtreme-Format, geschachtelt) als gemeinsames Modell in `core/` einführen: Auswerten auf lokalen Zeilen über `devextreme/data/query`, Serialisieren in den URL-Parameter `f`, Übersetzen der bisherigen Parameter (`q`, `type` u. a.) in den Ausdruck, Auffächern der Rebsorten. Prüfen: Unit-Tests für verschachtelte und/oder/nicht-Gruppen, alte Adressen, ungültiges JSON (fällt auf „kein Filter“ zurück), Rebsorten.
- [x] 2.2 Kacheln, Tabelle und Pivot der drei Listen auf diesen Filter umstellen; Filterfeld mit lesbarem Text, Ein-/Ausschalten, Bearbeiten (`FilterBuilder` als Dialog, auf schmalen Bildschirmen vollflächig) und Löschen. Prüfen: Szenarien „Verschachtelte Filter“ und „Ein Filter für alle Ansichten“ im Browser durchgespielt.

## 3. Tabelle mit DevExtreme

- [x] 3.1 Gemeinsame Komponente `dx-data-grid` (lazy geladen): Spalten aus den vorhandenen Spaltendefinitionen, Filterzeile (auf dem Handy per Knopf), Werteliste im Spaltenkopf, Sortierung, Spaltenwahl, feste erste Spalte, Zeilenklick zur Einzelansicht, Merken von Spalten und Sortierung im `StorageService`, CSV-Export wie bisher (BOM, Semikolon, Formelschutz). Prüfen: Szenarien „Spaltenfilter in der Tabelle“ und „CSV bleibt“ im Browser, bei 375 px und Desktop.

## 4. Pivot mit DevExtreme

- [x] 4.1 Gemeinsame Komponente `dx-pivot-grid` (lazy geladen): Felder und Kennzahlen aus Dimensions-/Kennzahldefinitionen je Liste, mehrere Zeilen-/Spaltenfelder, Zwischensummen, Auf-/Zuklappen, Feldauswahl, mehrere Kennzahlen, „Ohne Angabe“ zuletzt, Datumsgruppierung im Archiv, Hinweis bei Rebsorte, Vorgaben und „Zurücksetzen“, Anordnung im `StorageService`, CSV aus den Zellen. Prüfen: Unit-Tests für Pivot-Datenaufbereitung (Auffächern, Leerwerte, Datumsfelder); Szenarien „Verschachtelte Pivotfelder“, „Anordnung merken“, „Mehrfachzuordnung von Rebsorten“ im Browser.
- [x] 4.2 Aufschlüsseln über mehrere Ebenen: Pfad der angeklickten Zelle/Summe in Filterbedingungen übersetzen (inkl. Zeiträume bei Datumsgruppen), mit bestehendem Filter verknüpfen, Wechsel in die Tabelle, „Zurück“ zum Pivot. Prüfen: Unit-Tests für Pfad → Filter; Szenarien „Aufschlüsseln über mehrere Ebenen“ im Browser.

## 5. Listen umstellen und aufräumen

- [x] 5.1 Keller, Archiv und Regale auf die neuen Komponenten umstellen (Ansichtsumschalter als `ButtonGroup`, Regale-Zeilenliste aus Regaldetails für Tabelle und Pivot, Kachelansicht unverändert). Prüfen: alle Szenarien der Specs `list-table-pivot-views` und `grid-filter-nested-pivot` je Liste im Browser durchgespielt, hell und dunkel.
- [x] 5.2 Nicht mehr benötigte eigene Bausteine (`data-table`, `pivot-table`, `filter-bar`, `column-picker`, `view-switch`, ungenutzte Teile von `core/list-views.ts`/`list-view-state.ts`, `tables.css`) und ihre Tests entfernen bzw. durch Tests der neuen Logik ersetzen. Prüfen: `ng build` und `ng test` grün, keine toten Importe.
- [x] 5.3 Bundle prüfen: Kachelansicht lädt kein DevExtreme (Netzwerkanzeige im Browser), Größe der neuen Chunks notieren. README um DevExtreme, Lizenzschlüssel und Bedienung ergänzen. Prüfen: Szenario „Nachladen“; Backend unverändert.
