# Tasks

## 1. Migrationen einführen

- [x] 1.1 `dotnet-ef` als lokales Tool (`dotnet-tools.json`) hinzufügen und `Microsoft.EntityFrameworkCore.Design` im Api-Projekt referenzieren; prüfen mit `dotnet ef --version`
- [x] 1.2 Migration `Initial` für das aktuelle Schema (vor allen Regal-Änderungen) erzeugen; prüfen, dass `dotnet build` erfolgreich ist und die Migration die Tabellen `wines`, `consumption_records` und Identity-Tabellen enthält

## 2. Domain und Datenmodell

- [x] 2.1 Entität `Rack` mit `EnsureValid()` (Name nicht leer, ≤ 100 Zeichen, Höhe/Breite 1–50), `Capacity` und `Contains(row, column)` anlegen; prüfen über Reqnroll-Szenarien „Regal mit 5 Reihen und 6 Spalten“, „Ungültige Maße“, „Name fehlt“
- [x] 2.2 Entität `RackSlot` (`RackId`, `Row`, `Column`, `WineId`, `OwnerId`) anlegen
- [x] 2.3 `Wine.StorageLocation` entfernen; prüfen, dass `dotnet build` ohne Verweise auf `StorageLocation` im Backend durchläuft
- [x] 2.4 `AppDbContext`/`IAppDbContext` um `Racks` und `RackSlots` erweitern: Tabellen `racks`/`rack_slots`, eindeutige Indizes (`RackId`, `Row`, `Column`) und (`OwnerId`, `Name`), Cascade Rack→Slot und Wein→Slot, kein FK `RackSlot.OwnerId`→`AppUser`
- [x] 2.5 Migration `AddWineRacks` erzeugen; prüfen, dass sie die zwei Tabellen anlegt und die Spalte `StorageLocation` entfernt

## 3. Application: Regalverwaltung

- [x] 3.1 DTOs/Requests in `Contracts.cs` ergänzen (`RackSummaryDto`, `RackDto` mit Slots und Wein-Kurzinfo, `SaveRackRequest`, `PlaceBottleRequest`, `MoveBottleRequest`, `SlotLocationDto`)
- [x] 3.2 `RackService` mit `ListAsync`, `GetAsync`, `CreateAsync`, `UpdateAsync`, `DeleteAsync` inkl. Namenseindeutigkeit und Verkleinerungsprüfung implementieren und in `DependencyInjection` registrieren
- [x] 3.3 Reqnroll-Feature `Features/Weinregale.feature` mit Szenarien für Anlegen, eindeutige Namen, Privatsphäre (anna/ben), Übersicht, Größe ändern und Löschen schreiben, `RackSteps.cs` ergänzen, `TestWorld` um `RackService` erweitern; prüfen mit `dotnet test tests/WineCellar.Specs`

## 4. Application: Fachbelegung

- [x] 4.1 `PlaceAsync`, `MoveAsync`, `RemoveAsync` im `RackService` implementieren (Fach frei, innerhalb der Grenzen, eingelagert ≤ `Quantity`, `DbUpdateException` bei Index-Verletzung → `ConflictException`)
- [x] 4.2 `ConsumeFromSlotAsync` implementieren (nutzt `Wine.Consume`, entfernt Slot in derselben Transaktion)
- [x] 4.3 Szenarien für Einlagern, belegtes Fach, Fach außerhalb, keine Flasche übrig, Umlagern, Ziel belegt, Auslagern und Trinken aus Fach in `Weinregale.feature` ergänzen; prüfen mit `dotnet test tests/WineCellar.Specs`

## 5. Bestehende Wein- und Archiv-Abläufe anpassen

- [x] 5.1 `WineDto` um `Slots` und `UnplacedCount` erweitern, `StorageLocation` aus `WineDto`, `SaveWineRequest` und `Mapping` entfernen; `ListAsync`/`GetAsync` laden die Slots
- [x] 5.2 `WineService.ConsumeAsync`: nicht eingelagerte Flaschen zuerst, sonst Slots nach Regalname/Reihe/Spalte freigeben und als `FreedSlots` im `ArchiveEntryDto` zurückgeben
- [x] 5.3 `WineService.UpdateAsync`: `Quantity` kleiner als Anzahl Slots ablehnen
- [x] 5.4 Szenarien „Genug nicht eingelagerte Flaschen“, „Fächer müssen freigegeben werden“, „Anzahl zu klein“, „Rückgängig nach Trinken aus dem Fach“, „Wein mit eingelagerten Flaschen“ und „Gelöschter Wein im Regal“ ergänzen; prüfen, dass alle bestehenden und neuen Szenarien mit `dotnet test tests/WineCellar.Specs` grün sind

## 6. API

- [x] 6.1 `RackEndpoints.cs` mit den Endpunkten aus design.md D6 anlegen (`RequireAuthorization`) und in `Program.cs` registrieren; prüfen mit `dotnet build` und einem manuellen Aufruf `GET /api/racks` (401 ohne Anmeldung)

## 7. Frontend

- [x] 7.1 `models.ts` und `api.service.ts` um Regal-Typen und -Aufrufe erweitern, `storageLocation` entfernen, Abhängigkeit `three` (und `@types/three`) hinzufügen; prüfen mit `npm run build` in `web/`
- [x] 7.2 Feld „Lagerort“ aus `wine-form` und `wine-detail` entfernen; Testdaten in `barcode-flow.spec.ts` anpassen; prüfen mit `npm test` in `web/`
- [x] 7.3 Seite `racks` (Liste mit Kapazität/belegt/frei, Dialog „Regal anlegen/bearbeiten“, Löschen mit Bestätigung) und Route/Navigationseintrag „Regale“ anlegen; prüfen im Browser unter `/racks`
- [x] 7.4 Seite `rack-detail` mit Ansicht „Raster“ (Reihen-/Spaltennummern, belegte Fächer mit Wein, freie Fächer) und gemeinsamem Fach-Aktionsmenü (einlagern, umlagern, auslagern, trinken/verkaufen/verschenken über `consume-dialog`) anlegen; prüfen im Browser mit einem 5×6-Regal
- [x] 7.5 Wein-Detail um Abschnitt „Lagerplätze“ (Fächer, „n nicht eingelagert“, Button „Einlagern“) erweitern und nach Entnahme mit `freedSlots` einen Hinweis-Toast anzeigen; prüfen im Browser
- [x] 7.6 Komponente `rack-3d` per dynamischem `import()` anlegen (D9): Regal aus Böden/Trennwänden, Bordeaux-Flasche als `LatheGeometry`, `InstancedMesh` für Flaschen mit Farbe je `WineType`, begrenzte `OrbitControls`, „Ansicht zurücksetzen“, Rendern nur bei Änderungen; prüfen im Browser mit einem 5×6-Regal mit Rot- und Weißwein (Szenarien „Regal in 3D öffnen“, „Farbe nach Weintyp“, „Ansicht zurücksetzen“) und in `npm run build`, dass `three` in einem eigenen Lazy-Chunk liegt
- [x] 7.7 Reihe antippen (D9): `Raycaster` auf Flaschen und Fach-Boxen, Tippen vs. Drehen unterscheiden, Reihe hervorheben, Reihen-Panel (Bottom Sheet/Seitenleiste) mit allen Spalten, das das Fach-Aktionsmenü aus 7.4 öffnet; die Funktion `slotIndex → {row, column}` mit Vitest-Unit-Tests abdecken; prüfen mit `npm test` und im Browser (Szenarien „Reihe 2 antippen“, „Aus der Reihe trinken“, „Andere Reihe wählen“)
- [x] 7.8 Umschalter „Raster | 3D“ in `rack-detail` (Standard Raster, `?view=3d` wählt 3D), WebGL-Prüfung vor dem Laden von `three` mit deaktivierter 3D-Option und Hinweis, Wechsel zum Raster bei `webglcontextlost`, per Tastatur bedienbare Reihenliste neben dem Canvas (`aria-hidden` auf dem Canvas); prüfen im Browser mit deaktiviertem WebGL und nur per Tastatur (Szenarien „Gerät ohne 3D“, „Reihe per Tastatur wählen“, „Belegtes und freies Fach“ öffnet im Raster)
- [x] 7.9 Kellerliste: Suche und Filter in URL-Query-Parametern halten, Schaltfläche „In 3D ansehen“ (zuletzt geöffnetes Regal aus `Preferences`, sonst erstes nach Name; Hinweis mit „Regal anlegen“ ohne Regal; deaktiviert ohne WebGL), Regalauswahl und „Zurück zur Liste“ in `rack-detail` bei `from=cellar`; prüfen im Browser, dass die Kellerliste sonst unverändert funktioniert (Szenarien „Keller öffnen“, „Zur 3D-Ansicht und zurück“, „Noch kein Regal“) und dass `npm test` grün bleibt

## 8. Integration

- [x] 8.1 API gegen eine eigene Testdatenbank starten (Migrationen laufen; die Datenbank `WineCellar` mit echten Daten wird nicht gelöscht), Benutzer registrieren, Testflasche Sassicaia 2021 anlegen; im Browser ein Regal 5×6 anlegen, Flasche einlagern, umlagern und aus dem Fach trinken, Archiv und Regal prüfen; aus der Kellerliste per „In 3D ansehen“ in die 3D-Ansicht wechseln, dort über das Reihen-Panel dasselbe tun und per „Zurück zur Liste“ zurückkehren, auch auf dem Handy (Capacitor-App oder mobile Ansicht)
- [x] 8.2 `openspec validate add-wine-racks --strict` ausführen und Fehler beheben

## Workflow follow-up

- Change nach erfolgreicher Prüfung mit `/openspec-archive-change` archivieren, damit `openspec/specs/wine-racks/spec.md` entsteht.
