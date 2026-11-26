# Tasks

## 1. Voraussetzungen

- [x] 1.1 Prüfen, dass `add-grape-varieties` umgesetzt und archiviert ist (Rebsorten-Abgleich wird wiederverwendet); sonst zuerst diesen Change umsetzen
- [x] 1.2 NuGet-Pakete `Anthropic` und `SkiaSharp` im Infrastructure-Projekt hinzufügen; Konfiguration `Anthropic:ApiKey`, `Anthropic:Model` (Standard `claude-opus-5-5`), `Anthropic:Effort` (Standard `medium`), `PhotoCapture:DailyLimitPerUser` (20), `PhotoCapture:MaxParallel` (2) mit Options-Klassen anlegen; Schlüssel nur per User Secrets/Umgebungsvariable; prüfen mit `dotnet build` und Start ohne Schlüssel (App startet, Foto-Erfassung deaktiviert)

## 2. Datenmodell

- [x] 2.1 Entitäten `StoredImage`, `CaptureDraft` (Status, Fotos, Anzahl, Notiz, Ergebnis-JSON, Quellen, Fehler, Versuche, Zeitstempel, `RowVersion`), `CaptureUsage` sowie `Wine.LabelImageId`, `Wine.LabelSourceImageId`, `Wine.LabelCorners` und am Entwurf `LabelCorners`, `LabelPreviewImageId` anlegen; `AppDbContext` laut design.md D4–D6 konfigurieren
- [x] 2.2 Migration `AddPhotoCapture` erzeugen; prüfen in einer Wegwerf-Datenbank (hoch, zurück auf die vorige Migration, wieder hoch)

## 3. Application: Bilder und Entwürfe

- [x] 3.1 `ImageService` (Speichern mit Prüfung von Dateityp per Magic Bytes und Größe ≤ 10 MB, Abrufen nur durch den Besitzer, Löschen) und Etikettenbild am Wein (setzen aus Originalfoto + Ecken, Ecken anpassen, ersetzen, entfernen, Löschen beim Wein-Löschen – jeweils Etikettenbild und Originalfoto)
- [x] 3.2 Schnittstelle `IWineResearchAgent` und Ergebnis-Typen (`WineResearchResult` mit Feldern samt Herkunft, Rebsorten, `IsWineLabel`, `Summary`, Quellen) im Application-Layer
- [x] 3.3 `CaptureService`: Aufnahme anlegen (Tageslimit in derselben Transaktion), Liste, Details mit Abgleich (Land/Region/Rebsorten per Name, vorhandener Wein per Barcode oder Name+Weingut+Jahrgang), erneut recherchieren, Ecken im Entwurf anpassen (Vorschau neu erzeugen, nicht aufs Limit), übernehmen (neuer Wein oder Flaschen hinzufügen; Etikett aus dem Vorderfoto ausschneiden, Vorderfoto wird Originalfoto), verwerfen inklusive Fotos; Kontingent-Abfrage
- [x] 3.4 `CaptureProcessor.ProcessAsync`: Entwurf exklusiv übernehmen (`Pending → Researching`), Agent aufrufen, Ergebnis serverseitig prüfen und bereinigen (design.md D2, inklusive Plausibilitätsprüfung der Etikett-Ecken), Etikett-Vorschau erzeugen, Status setzen; Wiederholung vorübergehender Fehler (2×), Zeitlimit 5 Minuten, Zurücksetzen hängender Entwürfe beim Start; verworfene Entwürfe während der Recherche werden nicht wiederbelebt
- [x] 3.5 Reqnroll-Feature `FotoErfassung.feature` mit einem simulierten Agenten in `TestWorld` (konfigurierbare Antworten, Fehler, Verzögerung): alle Szenarien aus `specs/photo-capture/spec.md` außer Hinweis-Dialog und Live-Aktualisierung der Liste, sowie aus `specs/wine-label-image/spec.md` außer der reinen Anzeige; prüfen mit `dotnet test tests/WineCellar.Specs`
- [x] 3.6 `ILabelImageExtractor` (Application) und `SkiaLabelImageExtractor` (Infrastructure) laut design.md D9: Homographie als reine, unit-getestete Funktion, 2 % Einzug, Seitenverhältnis aus den Kantenlängen, proportionales Einpassen in 900 × 1200 mit Papierfarbe als Füllung, JPEG 85; Unit-Tests mit künstlichen Bildern: farbiges, schräg verzerrtes Viereck auf andersfarbigem Hintergrund → Ergebnis 900 × 1200 ohne ein einziges Pixel in Hintergrundfarbe; hochformatiges Etikett füllt die Fläche; breites Etikett ist vollständig und unverzerrt mit einfarbigem Rand oben und unten; prüfen mit `dotnet test`

## 4. Infrastructure: Agent und Hintergrunddienst

- [ ] 4.1 `ClaudeWineResearchAgent` mit dem Anthropic-C#-SDK laut design.md D1–D3: Bilder als Base64-Blöcke, Server-Tools `web_search_20260209` (`max_uses` 5) und `web_fetch_20260209` (`max_uses` 3), adaptives Denken, Effort aus der Konfiguration, strukturierte Ausgabe per JSON-Schema inklusive `labelCorners` (normiert 0–1, sonst `null`), Streaming, `pause_turn`-Fortsetzung (max. 3), `refusal`-Prüfung mit serverseitigem Fallback, Quellen aus den Tool-Ergebnisblöcken; Kombination Server-Tools + `output_config.format` prüfen und bei Bedarf auf validiertes JSON im Textblock ausweichen
- [x] 4.2 Unit-Tests für das Auslesen einer aufgezeichneten API-Antwort (Ergebnis, Quellen ohne Duplikate, Ablehnung, ungültiges JSON) ohne Netzwerkzugriff
- [x] 4.3 `CaptureWorker : BackgroundService` mit `Channel`-Weckruf, 30-Sekunden-Prüfung, Parallelitätsgrenze und Zurücksetzen beim Start; nur registrieren, wenn ein Schlüssel konfiguriert ist
- [ ] 4.4 Live-Test mit echtem API-Schlüssel nach Rückfrage beim Benutzer (verursacht Kosten): 3–5 echte Etikettenfotos (u. a. Sassicaia 2021, ein Hauswein ohne Webtreffer, ein Foto ohne Wein); Ergebnisse, Dauer und tatsächliche Kosten je Recherche notieren und in der README angeben; außerdem prüfen, dass die ausgeschnittenen Etiketten keinen Hintergrund und keine Flaschenteile zeigen, und die Treffsicherheit der Ecken notieren

## 5. API

- [x] 5.1 `CaptureEndpoints` (inklusive `PUT /api/captures/{id}/label-corners`), `ImageEndpoints`, `PUT/DELETE /api/wines/{id}/label-image` (Foto + Ecken) und `PUT /api/wines/{id}/label-image/corners` laut design.md D7 (Multipart-Upload mit Größenlimit, Prüfung der Ecken, 202/429/503, Besitzerprüfung); `WineDto` um `LabelImageId` erweitern; prüfen mit `dotnet build` und Aufrufen mit/ohne Token, mit/ohne Schlüssel

## 6. Frontend

- [x] 6.1 Modelle und `api.service.ts` für Entwürfe, Kontingent, Bilder; Direktive `appAuthImage` (Blob laden, Object-URL freigeben); Bildverkleinerung im Browser (1568 px, JPEG 0,85, EXIF-Ausrichtung) mit Unit-Test für die Größenberechnung; prüfen mit `npm test`
- [x] 6.2 „Per Foto erfassen“ auf „Wein hinzufügen“: Dateiauswahl mit Kamera, optionales zweites Foto, Anzahl, Notiz, verbleibendes Kontingent, einmaliger Datenschutzhinweis; ausgeblendet ohne Schlüssel; prüfen im Browser und auf 375 px Breite
- [x] 6.3 Seite „Entwürfe“ (Liste mit Vorschaubild, Status, Fehlertext, Erneut recherchieren, Verwerfen, 5-Sekunden-Aktualisierung bei laufenden Entwürfen) und Navigationseintrag mit Zähler (auf dem Handy nur bei vorhandenen Entwürfen)
- [x] 6.4 Entwurf öffnen: „Wein bereits im Keller“ mit Flaschen hinzufügen oder trotzdem neu anlegen; sonst Wein-Formular mit Vorbelegung, Markierung „Etikett“/„Web“ je Feld, Quellenliste und ausgeschnittenem Etikett mit „Zuschnitt anpassen“ (bei fehlenden Ecken öffnet der Editor von selbst mit Hinweis „Zuschnitt prüfen“); nach dem Speichern `accept` aufrufen; Unit-Test für die Umwandlung Entwurf → `WineFormInitial`
- [x] 6.5 Etikettenbild in Kellerliste (Vorschaubild im Hochformat 3:4) und Detailansicht (groß, Ersetzen über Foto + Ecken-Editor, „Zuschnitt anpassen“, Entfernen) mit Alternativtext; prüfen im Browser in hellem und dunklem Design
- [x] 6.6 Komponente `label-corner-editor` laut design.md D8: Originalfoto mit vier ziehbaren Eckpunkten (Maus, Touch, Pfeiltasten), Lupe am gezogenen Punkt, Vorschlag in der Bildmitte ohne vorhandene Ecken, Ausgabe normiert auf 0–1; Unit-Tests für die Umrechnung Bildschirm ↔ normierte Koordinaten und das Begrenzen auf das Bild; prüfen im Browser und auf 375 px Breite mit Touch

## 7. Integration und Doku

- [ ] 7.1 Durchgängig im Browser: Foto aufnehmen, App schließen und wieder öffnen, Entwurf prüfen und übernehmen, Zuschnitt prüfen und anpassen, Etikettenbild nachträglich setzen (nur Etikett, kein Hintergrund sichtbar), vorhandenen Wein erkennen, Limit erreichen (Limit testweise auf 2 setzen), Server während einer Recherche neu starten
- [ ] 7.2 README ergänzen: API-Schlüssel einrichten (User Secrets, IIS-Umgebungsvariable), IIS-App-Pool „AlwaysRunning“/Preload, gemessene Kosten je Recherche, Datenschutzhinweis
- [x] 7.3 `openspec validate add-photo-capture --strict` ausführen und Fehler beheben

## Workflow follow-up

- Change nach erfolgreicher Prüfung mit `/openspec-archive-change` archivieren.
