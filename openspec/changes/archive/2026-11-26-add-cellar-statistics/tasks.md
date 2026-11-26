# Tasks

## 1. Datenmodell Herkunft

- [x] 1.1 Entitäten `Country` und `Region` (mit `Name`, `NormalizedName`, `OwnerId`, Validierung: Name nicht leer, ≤ 100 Zeichen) anlegen; `Wine.Country`/`Wine.Region` durch `CountryId`/`RegionId` ersetzen; prüfen mit `dotnet build`
- [x] 1.2 `AppDbContext`/`IAppDbContext` um `Countries`/`Regions` erweitern: Tabellen `countries`/`regions`, eindeutige Indizes auf (`OwnerId`, `NormalizedName`) bzw. (`CountryId`, `NormalizedName`), FKs laut design.md D1
- [x] 1.3 Migration `AddWineOrigins` erzeugen und um die Datenübernahme aus den Textspalten (design.md D2) ergänzen, inklusive `Down()`; prüfen: lokal Weine mit Freitext-Herkunft anlegen, `dotnet ef database update` ausführen, Länder/Regionen und Verweise per SQL kontrollieren, dann `dotnet ef database update Initial` und wieder hoch

## 2. Herkunft: Application und Tests

- [x] 2.1 DTOs (`OriginRefDto`, `CountryDto` mit Regionen und Weinanzahl, Requests) und `OriginService` (Liste, Anlegen, Umbenennen, Löschen, Zusammenführen von Ländern und Regionen) implementieren und registrieren
- [x] 2.2 `WineService`, `Mapping`, `WineDto`, `SaveWineRequest` auf `CountryId`/`RegionId` umstellen: Besitz prüfen, Region muss zum Land gehören, Region ohne Land ablehnen; Suche über Länder-/Regionsnamen
- [x] 2.3 `LookupBarcodeAsync`: Land aus dem Entwurf einem eigenen Land zuordnen (`DraftCountryId`)
- [x] 2.4 `TestWorld` und bestehende Steps (`WineSteps`, `CommonSteps`) auf Herkunft per Name → Id umstellen; Feature `Herkunft.feature` mit allen Szenarien aus `specs/wine-origins/spec.md` (außer den reinen Formular-Szenarien) schreiben; prüfen mit `dotnet test tests/WineCellar.Specs`, alle bestehenden und neuen Szenarien sind grün

## 3. Statistik: Application und Tests

- [x] 3.1 DTOs (`StatisticsDto`, `StatisticsTotalsDto`, `StatisticsSegmentDto`) und `StatisticsService` mit Gruppierung nach Typ, Land, Region (inklusive `countryId`-Drill-down) und Winzer, Sortierung, Prozentrundung, „Ohne Angabe“ und „Sonstige“ laut design.md D5 implementieren
- [x] 3.2 Feature `Statistik.feature` mit den Szenarien aus `specs/cellar-statistics/spec.md` (Kennzahlen, fremde Weine, alle Gruppierungen, Ohne Angabe, Land ohne Region, zwölf Winzer, Drill-down Italien, leerer Keller) und `StatisticsSteps.cs` schreiben; prüfen mit `dotnet test tests/WineCellar.Specs`

## 4. API

- [x] 4.1 `OriginEndpoints.cs` (design.md D3) und `StatisticsEndpoints.cs` (`GET /api/statistics`, ungültiges `groupBy` → 400) anlegen und in `Program.cs` registrieren; prüfen mit `dotnet build` und je einem Aufruf ohne Token (401) und mit Token (200)

## 5. Frontend: Herkunft

- [x] 5.1 `models.ts`/`api.service.ts` um Herkunfts-Typen und -Aufrufe erweitern; `country`/`region` im Wein-Modell auf `OriginRef` umstellen; Anzeige in Keller, Wein-Detail und Archiv anpassen; prüfen mit `npm run build`
- [x] 5.2 Comboboxen für Land und Region im `wine-form` mit „anlegen“-Option, Regionsfilter nach Land und Zurücksetzen der Region bei Landwechsel; Barcode-Vorbelegung (`barcode-flow.ts`) nutzt `draftCountryId` bzw. schlägt ein neues Land vor; `barcode-flow.spec.ts` anpassen; prüfen mit `npm test` und im Browser (Wein mit neuem Land und neuer Region anlegen)
- [x] 5.3 Seite `origins` (Länder mit Regionen, Umbenennen, Zusammenführen, Löschen mit Hinweis bei Verwendung) anlegen und aus den Einstellungen verlinken; prüfen im Browser durch Zusammenführen von „Italy“ in „Italien“

## 6. Frontend: Übersicht

- [x] 6.1 Farbpalette `--chart-1` … `--chart-8` und `--chart-muted` für helles und dunkles Design definieren und SVG-Komponente `shared/donut-chart.ts` (Segmente, Mitte mit Gesamtzahl, Tastaturbedienung) bauen; Unit-Test für die Bogenberechnung (Summe der Winkel = 360°, Einzelsegment = Vollkreis); prüfen mit `npm test`
- [x] 6.2 Seite `overview` mit Kennzahlen, Gruppierungsauswahl (gemerkt in `localStorage`), Diagramm, Legende mit aufklappbaren „Sonstige“, Drill-down Land → Region mit „Zurück“ und Leerzustand anlegen
- [x] 6.3 Routen umstellen (`''` → Übersicht, `/cellar` → Keller), Navigation „Übersicht, Keller, Archiv, Einstellungen“, interne Links auf den Keller anpassen; prüfen im Browser: nach Login erscheint die Übersicht, alle Menüpunkte funktionieren, auf Handybreite (375 px) ohne horizontales Scrollen, in hellem und dunklem Design lesbar

## 7. Integration

- [x] 7.1 Im Browser mit mindestens 10 Weinen aus 3 Ländern, 4 Regionen und 9 Winzern alle Gruppierungen, „Sonstige“, „Ohne Angabe“ und den Drill-down prüfen; Kennzahlen mit einer SQL-Summe gegenprüfen
- [x] 7.2 `openspec validate add-cellar-statistics --strict` ausführen und Fehler beheben

## Workflow follow-up

- Change nach erfolgreicher Prüfung mit `/openspec-archive-change` archivieren, damit `openspec/specs/wine-origins` und `openspec/specs/cellar-statistics` entstehen.
