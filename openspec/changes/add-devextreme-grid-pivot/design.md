# Design

## Kontext

Beobachtet (Stand `main`): Tabelle, Pivot und Filter sind eigene Komponenten (`shared/data-table.ts`, `pivot-table.ts`, `filter-bar.ts`, `column-picker.ts`, `view-switch.ts`) auf reiner Logik in `core/list-views.ts` (Spalten, Sortierung, Filter, Pivot, CSV) und `core/list-view-state.ts` (Zustand ↔ Query-Parameter, Geräte-Speicher). Filter sind flach (je Schlüssel ein Wert, Mehrfachauswahl mit „|“), das Pivot kennt eine Zeilen- und eine Spaltendimension. Angular 22, kein UI-Framework, eigenes CSS mit Hell/Dunkel über `prefers-color-scheme`.

## Entscheidungen

1. **DevExtreme nur für Listenansichten.** `DataGrid` (Tabelle, Filterzeile, Werte-Filter, Filter-Panel, Spaltenwahl, Sortierung), `PivotGrid` mit `PivotGridDataSource` und Feldauswahl (Pivot), `FilterBuilder` (verschachtelte Filter), `ButtonGroup` (Ansichtsumschalter). Alternative „ganze App umstellen“ verworfen: großer Umbau ohne konkreten Nutzen, würde Formulare, Scanner und 3D-Ansichten berühren.
2. **Ein Filterausdruck für alles.** Der Filter wird als DevExtreme-Filterausdruck (`[["wineType","=","Red"],"and",[...]]`, beliebig verschachtelt) gehalten. Kacheln, Tabelle und Pivot werten denselben Ausdruck aus: auf den lokal vorliegenden Zeilen über `devextreme/data/query` (`query(rows).filter(expr)`), im Grid über den `filterValue`, im Pivot über die vorgefilterte Zeilenmenge. So wirkt jeder Filter überall gleich.
3. **URL-Zustand bleibt.** Ansicht und Filter stehen weiter in der Adresse: der Filterausdruck als kompaktes JSON im Parameter `f`. Alte Adressen mit `?q=`, `?type=` und den bisherigen Einzelparametern werden beim Laden in den Ausdruck übersetzt. Sortierung, Spaltenwahl und Pivot-Anordnung (Felder, Bereiche, Reihenfolge, Ebenen-Auf/Zu) liegen je Liste im `StorageService`, nicht in der URL, da sie lang werden können. Alternative „alles in der URL“ verworfen (zu lang, hässlich).
4. **Spaltendefinition bleibt die eine Quelle.** Die vorhandenen Spalten-/Dimensionsdefinitionen je Liste werden zu DevExtreme-Spalten bzw. Pivot-Feldern (Datentyp, Format, Werte-Getter, Gruppierung) umgesetzt. So bleiben Tabelle, Filter, Pivot und CSV konsistent.
5. **Mehrwertige Felder (Rebsorte).** Für Pivot und Rebsorten-Filter werden die Zeilen je Rebsorte aufgefächert (eine Zeile je Wein × Rebsorte, mit Merker zur Zeilenherkunft). Die Gesamtsumme des Pivots zählt dadurch Cuvée-Flaschen mehrfach; das ist eine bewusste Änderung gegenüber der Vorgänger-Spec (dort dedupliziert) und wird mit einem Hinweis am Pivot erklärt. Wird Rebsorte nicht als Feld verwendet, bleibt alles exakt.
6. **Aufschlüsselung über Ebenen.** Ein Klick auf eine Pivotzelle ermittelt den Pfad (alle Zeilen- und Spaltenfelder bis zur angeklickten Ebene, bei Summenzellen nur die vorhandene Teilmenge) und wechselt mit diesen Gleichheitsbedingungen, mit „und“ zum bestehenden Filter verknüpft, in die Tabelle. Für Datumsgruppen (Jahr/Quartal/Monat) werden die Bedingungen als Bereich gesetzt. „Zurück“ führt zum unveränderten Pivot.
7. **Regale-Pivot.** Bleibt wie bisher: Regaldetails werden beim ersten Pivot nachgeladen; die so entstandene Zeilenliste (Regal, Reihe, Spalte, Weinart, Wein) speist PivotGrid und Tabelle gleichermaßen. Zusätzlich bietet die Regale-Tabelle weiterhin die Übersichtsspalten (Maße, Kapazität, belegt, frei).
8. **Lizenz und Schlüssel.** `devextreme` braucht einen Lizenzschlüssel. Er wird nicht eingecheckt: Einlesen zur Build-/Startzeit aus einer ignorierten Datei oder Umgebungsvariable (`dev.ps1`, `publish.ps1` und README beschreiben das). Fehlt er, läuft die Anwendung mit DevExtreme-Testhinweis; das ist kein Fehler, wird aber im README erwähnt.
9. **Theme und Sprache.** Ein DevExtreme-Theme (z. B. generisch hell/dunkel), per CSS-Variablen an Akzentfarbe, Schrift und Rundungen der App angepasst; Umschalten folgt `prefers-color-scheme`. Locale `de` (Meldungen, Zahlen, Datum, Filteroperatoren), Währung EUR.
10. **Größe.** Grid und Pivot sind eigene, lazy geladene Chunks (Angular `@defer`); Kachelansicht und Start der App laden DevExtreme nicht. Es werden nur benötigte Module importiert (kein Gesamtpaket).
11. **Mobil/Barrierefreiheit.** DataGrid mit festem ersten Spalte (Name) und horizontalem Scrollen; Filterzeile auf schmalen Bildschirmen über Knopf ein-/ausblendbar; Filter-Editor als Vollbild-Dialog. DevExtreme bringt Tastaturbedienung und ARIA mit; es wird geprüft, dass Umschalter, Spaltenköpfe und Pivotzellen weiter erreichbar und bezeichnet sind.
12. **CSV bleibt eigener Code.** Der DevExtreme-Export zielt auf Excel (zusätzliche Bibliothek). Stattdessen bleibt die vorhandene CSV-Erzeugung (BOM, Semikolon, Formelschutz) und liest die sichtbaren Spalten/Zeilen aus Grid bzw. die Zellen aus dem Pivot.

## Risiken

- **Kompatibilität**: `devextreme-angular` verlangt `@angular/core >=20`, Angular 22 ist neuer als die zuletzt dokumentierten Versionen. Erster Task prüft, ob Installation und Build sauber laufen; andernfalls nach Rückfrage anders vorgehen.
- **Lizenzkosten/Entscheidung** liegt beim Besitzer.
- **Ladezeit/Bundle** auf dem Handy; durch Lazy-Loading begrenzt, per Messung zu prüfen.
- **Theme-Abweichung** zwischen DevExtreme-Komponenten und der restlichen App, besonders im Dunkelmodus.
- **Verlust bisheriger Tests**: Tests der ersetzten Logik werden durch Tests der neuen Umsetzung ersetzt, nicht ersatzlos gelöscht.
