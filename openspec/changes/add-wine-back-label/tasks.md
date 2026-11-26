# Tasks

## 1. Daten und Übernahme

- [ ] 1.1 `Wine.BackImageId` samt EF-Konfiguration und Migration `AddWineBackImage` anlegen; `WineDto` und Mapping um `BackImageId` erweitern. Prüfen: Migration läuft, `dotnet build` ohne Fehler.
- [ ] 1.2 `CaptureService.AcceptAsync` so ändern, dass das Rückenfoto des Entwurfs am neuen Wein (oder an einem Wein ohne Rückseite) erhalten bleibt und sonst gelöscht wird. Prüfen: neue Szenarien in `FotoErfassung.feature` (mit Rückseite, ohne Rückseite, vorhandene Rückseite bleibt) sind grün.
- [ ] 1.3 `WineService`: Rückseitenbild beim Löschen des Weins mit entfernen. Prüfen: Reqnroll-Szenario „Wein löschen“ zeigt, dass das Bild weg ist.

## 2. Rückseite pflegen (API)

- [ ] 2.1 Service-Methoden und Endpunkte `PUT/DELETE /api/wines/{id}/back-image` (Typ- und Größenprüfung, altes Bild löschen, kein Tageslimit, Besitzerprüfung). Prüfen: neues Feature `Rueckseite.feature` deckt Hinzufügen, Ersetzen, Entfernen, ungültige Datei und fremdes Bild ab und ist grün.

## 3. Frontend

- [ ] 3.1 `Wine`-Modell und `ApiService` um `backImageId`, `setBackImage`, `removeBackImage` erweitern. Prüfen: `ng build` und `ng test` ohne Fehler.
- [ ] 3.2 Detailansicht: Umschalter „Vorderseite | Rückseite“ nur bei vorhandenem Bild, Rückseite unverzerrt und vollständig mit Textersatz; Werkzeuge zum Hinzufügen, Ersetzen und Entfernen. Prüfen: Komponententest für die Umschalter-Logik und Sichtprüfung im Browser (mit und ohne Rückseite, schmale Bildschirmbreite).
- [ ] 3.3 Integrationsprüfung im Browser: Wein per Foto mit Rückseite erfassen, übernehmen, Detailansicht zeigt beide Seiten; Rückseite ersetzen und entfernen; Wein löschen.
