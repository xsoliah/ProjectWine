# Tasks

## 1. Daten und Service

- [x] 1.1 `Wine.BackSourceImageId` und `Wine.BackCornersJson` samt EF-Konfiguration und Migration `AddWineBackCrop` anlegen; `WineDto` und Mapping um `backSourceImageId` und `backCorners` erweitern. Prüfen: Migration läuft, `dotnet build` ohne Fehler.
- [x] 1.2 `BackImageService`: `SetAsync(wineId, photo, corners)` schneidet über `ILabelImageExtractor`, speichert Bild, Original und Ecken und löscht altes Bild samt Original erst nach erfolgreichem Zuschnitt; `SetCornersAsync` schneidet neu (Original oder bestehendes Rohbild als Quelle, Rohbild bleibt als Original erhalten); `RemoveAsync` löscht beide Bilder. Prüfen: Reqnroll-Szenarien in `Rueckseite.feature` (hinzufügen mit Ecken, ersetzen, Zuschnitt anpassen, Rohfoto zuschneiden, entfernen, ungültige Datei oder Ecken) sind grün.
- [x] 1.3 `WineService`: Original der Rückseite beim Löschen des Weins mit entfernen. Prüfen: Szenario „Wein löschen“ zeigt, dass Bild und Original weg sind; Szenario „fremdes Originalfoto“ liefert „nicht gefunden“.

## 2. API

- [x] 2.1 `PUT /api/wines/{id}/back-image` um das Feld `corners` erweitern, neuer Endpunkt `PUT /api/wines/{id}/back-image/corners`. Prüfen: Aufruf über die Specs bzw. Swagger; Besitzerprüfung wirkt.

## 3. Frontend

- [x] 3.1 `Wine`-Modell und `ApiService`: `backSourceImageId`, `backCorners`, `setBackImage(wineId, photo, corners)`, `setBackCorners`. Prüfen: `ng build` und `ng test` ohne Fehler.
- [ ] 3.2 `wine-detail`: Foto wählen öffnet den Ecken-Editor (Vorschlag in der Bildmitte), „Zuschnitt anpassen“ für die Rückseite (Original oder Rohfoto), Speichern ersetzt das Bild; 3D-Flasche und flache Rückseite zeigen das zugeschnittene Bild ohne Neuladen. Prüfen: Komponententest für die Editor-Logik und Sichtprüfung im Browser (mit und ohne Original, bestehendes Rohfoto, schmale Breite).
- [ ] 3.3 Integrationsprüfung im Browser: Wein mit Rohfoto-Rückseite zuschneiden, neue Rückseite mit Ecken setzen, Zuschnitt anpassen, entfernen; `dotnet test` und `ng test` grün.
