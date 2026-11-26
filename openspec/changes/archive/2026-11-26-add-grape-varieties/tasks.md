# Tasks

## 1. Datenmodell Rebsorten

- [x] 1.1 Entitäten `GrapeVariety` (Name, `NormalizedName`, `OwnerId`, Validierung wie `Country`) und `WineGrape` (`WineId`, `GrapeVarietyId`, `Position`, `Percent`) anlegen; `Wine.Grapes` (string) durch `List<WineGrape>` mit `SetGrapes(...)` (Dubletten, Anteile 1–100, Summe ≤ 100, Positionen) und `IsCuvee` ersetzen; prüfen mit `dotnet build`
- [x] 1.2 `AppDbContext`/`IAppDbContext` um `GrapeVarieties`/`WineGrapes` erweitern: Tabellen `grape_varieties`/`wine_grapes`, Schlüssel und Indizes laut design.md D1, FK Wein → Cascade, FK Rebsorte → Restrict
- [x] 1.3 Migration (per OPENJSON, ab SQL Server 2016 lauffähig, damit keine Versionsrückfrage nötig; design.md D5) `AddGrapeVarieties` erzeugen und um die Datenübernahme inklusive `Down()` ergänzen; prüfen in einer Wegwerf-Datenbank mit Texten wie „Cabernet Sauvignon, Cabernet Franc“, „Merlot / Carménère“, „Zweigelt und Blaufränkisch“, „merlot;Merlot“, „“ und NULL: hoch, Ergebnis per SQL kontrollieren, zurück auf `AddWineOrigins`, wieder hoch

## 2. Rebsorten: Application und Tests

- [x] 2.1 `GrapeText.Split` (Trennregel Komma, Semikolon, Schrägstrich, „und“, „&“) im Application-Layer anlegen
- [x] 2.2 DTOs (`GrapeVarietyDto`, `WineGrapeDto`, `WineGrapeRequest`, `DraftGrapeDto`) und `GrapeService` (Liste, Anlegen, Umbenennen, Löschen, Zusammenführen laut design.md D3) implementieren und registrieren
- [x] 2.3 `WineService`, `Mapping`, `WineDto` (`Grapes`, `IsCuvee`), `SaveWineRequest` auf Rebsorten-Liste umstellen: Besitz prüfen, Validierung über `Wine.SetGrapes`, Suche über Rebsortennamen, `LookupBarcodeAsync` liefert `DraftGrapes`
- [x] 2.4 Feature `Rebsorten.feature` mit allen Szenarien aus `specs/grape-varieties/spec.md` außer den reinen Formular-Szenarien und der Migration schreiben (inklusive Trennregel), `GrapeSteps.cs` und `TestWorld` ergänzen; vorhandene Steps, die `Grapes` als Text setzen, anpassen; prüfen mit `dotnet test tests/WineCellar.Specs`, alle Szenarien sind grün

## 3. Statistik

- [x] 3.1 `StatisticsService` um `StatisticsGrouping.Grape` und den Cuvée-Drill-down (`cuvee=true`, Feld `DrillDown` in der Antwort) laut design.md D4 erweitern
- [x] 3.2 Szenarien aus `specs/cellar-statistics/spec.md` (Rebsortenrein und Cuvées, ohne Rebsorte, Cuvée zählt nicht bei ihren Rebsorten, Cuvée aufklappen, viele Zusammensetzungen) in `Statistik.feature` ergänzen; prüfen mit `dotnet test tests/WineCellar.Specs`

## 4. API

- [x] 4.1 `GrapeEndpoints.cs` (`/api/grapes`) anlegen und registrieren, `StatisticsEndpoints` um `cuvee` erweitern (`cuvee=true` mit anderer Gruppierung → 400); prüfen mit `dotnet build` und je einem Aufruf mit und ohne Token

## 5. Frontend

- [x] 5.1 `models.ts`/`api.service.ts` um Rebsorten-Typen und -Aufrufe erweitern, `grapes` im Wein-Modell auf Liste umstellen, `drillDown` in `Statistics`; Anzeige im Wein-Detail (Liste mit Anteilen, Badge „Cuvée“/„Rebsortenrein“); prüfen mit `npm run build`
- [x] 5.2 `shared/grape-picker.ts` (Hinzufügen, Entfernen, ↑/↓, Prozentfeld, „anlegen“-Option, Summenhinweis) bauen und ins `wine-form` einsetzen; Barcode-Vorbelegung (`barcode-flow.ts`) nutzt `draftGrapes`, neue Rebsorten werden erst beim Speichern nach Bestätigung angelegt; Unit-Tests für Reihenfolge, Summenprüfung und Barcode-Vorbelegung; prüfen mit `npm test` und im Browser (Cuvée mit neuer Rebsorte und Anteilen anlegen, Reihenfolge ändern)
- [x] 5.3 Seite `grapes` (Liste mit Weinanzahl, Anlegen, Umbenennen, Zusammenführen, Löschen mit Hinweis bei Verwendung) anlegen und aus den Einstellungen verlinken; prüfen im Browser durch Zusammenführen von „Spätburgunder“ in „Pinot Noir“
- [x] 5.4 Übersicht: Chip „Rebsorte“, Segment „Cuvée“ antippbar mit Überschrift „Cuvées“ und „Zurück zu den Rebsorten“; Unit-Test für die Legende (Cuvée farbig, „Ohne Angabe“ neutral); prüfen im Browser in hellem und dunklem Design und auf 375 px Breite

## 6. Integration

- [x] 6.1 Nach dem Einspielen der Migration in die echte Datenbank die Rebsorten der vorhandenen Testweine per SQL und in der App prüfen (z. B. Sassicaia ist Cuvée aus „Cabernet Sauvignon, Cabernet Franc“); Gruppierung „Rebsorte“ und Cuvée-Drill-down mit einer SQL-Summe gegenprüfen
- [x] 6.2 `openspec validate add-grape-varieties --strict` ausführen und Fehler beheben

## Workflow follow-up

- Change nach erfolgreicher Prüfung mit `/openspec-archive-change` archivieren; danach enthält `openspec/specs/cellar-statistics` die Gruppierung „Rebsorte“ und `openspec/specs/grape-varieties` entsteht.
