# Proposal

## Why

Die Tabellen- und Pivotansicht (Change `add-table-pivot-views`) ist selbst gebaut und deshalb bewusst schlicht: Filter sind einfache Felder oberhalb der Tabelle, das Pivot kennt genau eine Zeilen- und eine Spaltendimension. Gewünscht sind echte Spaltenfilter direkt in der Tabelle (Filterzeile, Werte-Listen, Bedingungen mit „und“/„oder“) und ein Pivot, in dem sich Felder verschachteln lassen (z. B. Land → Region in den Zeilen, Weinart → Jahrgang in den Spalten). Beides ist in den DevExtreme-Komponenten (`DataGrid`, `PivotGrid`) fertig vorhanden und gefällt dem Besitzer ohnehin; statt es nachzubauen, werden die eigenen Tabellenbausteine durch DevExtreme ersetzt.

## What Changes

- Neu: **Spaltenfilter in der Tabelle**: Filterzeile mit typgerechten Bedingungen (Text: enthält/beginnt mit/ist, Zahl: gleich/größer/kleiner/zwischen, Datum: zwischen), Werte-Liste im Spaltenkopf mit Mehrfachauswahl und Häufigkeit.
- Neu: **Verschachtelte Filter**: ein Filter-Editor mit beliebig tief geschachtelten Gruppen („und“, „oder“, „nicht“) und ein Filterfeld, das den aktiven Ausdruck lesbar zeigt, ausschaltet und löscht. Derselbe Filter gilt für Kacheln, Tabelle und Pivot und steht in der URL.
- Neu: **Verschachteltes Pivot**: mehrere Felder in Zeilen- und Spaltenbereich in wählbarer Reihenfolge, auf-/zuklappbare Ebenen mit Zwischensummen, Felder per Drag-and-drop zwischen Bereichen verschieben (Feldauswahl), mehrere Kennzahlen gleichzeitig, Datumsfelder im Archiv nach Jahr → Quartal → Monat gruppiert. Die Anordnung wird je Liste auf dem Gerät gemerkt und lässt sich auf die Vorgabe zurücksetzen.
- Neu: Antippen einer Pivotzelle auf beliebiger Ebene führt zur Tabelle mit **allen Ebenen als Filter** (Pfad aus Zeilen- und Spaltenfeldern).
- Geändert: Die eigenen Komponenten `data-table`, `pivot-table`, `filter-bar`, `column-picker` und `view-switch` werden durch DevExtreme-Komponenten (`DataGrid`, `PivotGrid`, `FilterBuilder`, `ButtonGroup`, `SelectBox`/`TagBox`/`DateBox`) ersetzt; Spaltenwahl, Sortierung, CSV-Export und Ansichtswahl bleiben fachlich wie in `list-table-pivot-views`. Texte, Zahlen- und Datumsformate sind deutsch, Hell/Dunkel folgt dem Gerät.
- Geändert: Bei Mehrfachzuordnung (Rebsorten) können Summen höher ausfallen als die tatsächliche Flaschenzahl; ein Hinweis erklärt das (bisher wurde die Summe korrekt dedupliziert).
- Kein Backend-Umbau, kein Breaking Change an der API. Die Kachelansicht bleibt unverändert, übernimmt aber den neuen Filter.

## Capabilities

### New Capabilities
- `grid-filter-nested-pivot`: Spaltenfilter und verschachtelte Filter in der Tabelle, gemeinsamer Filter für alle drei Ansichten, verschachtelte Pivot-Felder mit Zwischensummen, Feldauswahl und Aufschlüsselung über mehrere Ebenen, umgesetzt mit DevExtreme-Komponenten.

### Modified Capabilities
<!-- Keine formalen Deltas: Die Capability `list-table-pivot-views` gehört zum noch nicht archivierten Change `add-table-pivot-views` und steht nicht in openspec/specs. Wo diese Spec Filter und Pivot auf je eine Dimension beschränkt, gilt künftig die hier beschriebene Erweiterung; beim Archivieren sind beide Specs abzugleichen. -->

## Impact

- **Frontend**: neue Abhängigkeiten `devextreme` und `devextreme-angular` (Version passend zu Angular 22 prüfen), DevExtreme-Theme (hell/dunkel) und Locale `de`; Umbau von `pages/cellar`, `pages/archive`, `pages/racks` sowie `shared/` (Ersatz der Tabellenbausteine), `core/list-views.ts` und `core/list-view-state.ts` (Filter- und Pivotzustand auf DevExtreme-Formate, Aufräumen nicht mehr benötigter Logik und Tests).
- **Lizenz**: `devextreme` ist kommerzielle Software (Lizenzschlüssel; ohne ihn Testhinweis und Warnungen im Browser). Der Schlüssel darf nicht ins Repository; Ablage über Konfiguration/Umgebung. Der Besitzer klärt die Lizenz; ohne Schlüssel läuft die Entwicklung mit Testmeldung.
- **Größe/Performance**: DevExtreme ist groß; Grid und Pivot werden lazy geladen, damit Kacheln und der Rest der App nicht langsamer starten. Mobile App (Capacitor) und dev.ps1 `-Lan` müssen weiter funktionieren.
- **Abgrenzung / Nicht-Ziele**: Der Rest der App (Formulare, Dialoge, Detailansichten) wird nicht auf DevExtreme umgestellt; das wäre ein eigener Change. Kein serverseitiges Filtern/Paging, keine gespeicherten Pivot-Vorlagen mit Namen, kein Excel-Export (CSV bleibt).
