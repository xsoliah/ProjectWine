# Tasks

## 1. Backend: Barcode im Entwurf

- [x] 1.1 `BarcodeNormalizer.HasValidCheckDigit` (GS1-Prüfziffer für 8/12/13/14 Ziffern) mit Unit-Tests (gültige/ungültige EAN-13, EAN-8, UPC-A, GTIN-14, Leerzeichen/Bindestriche); prüfen mit `dotnet test`
- [x] 1.2 `CaptureDraft.Barcode` (nullable) samt Migration `AddCaptureBarcode`; prüfen mit `dotnet build` und Migration auf einer Test-Datenbank
- [x] 1.3 `POST /api/captures` nimmt optional `barcode` an; `CaptureService.CreateAsync` normalisiert, prüft die Prüfziffer und lehnt ungültige Codes ohne Entwurf und ohne Kontingentverbrauch ab; Scenarios „Barcode wird mit dem Entwurf gespeichert“ und „Falsche Prüfziffer eingegeben“ in `FotoErfassung.feature` ergänzen und grün
- [x] 1.4 `CaptureProcessor`: Barcode des Entwurfs hat Vorrang (`Source = Label`), `Sanitize` verwirft gelesene Barcodes mit falscher Prüfziffer; Scenarios „Angegebener Code hat Vorrang“, „Agent liest Barcode vom Foto“, „Gelesener Code mit falscher Prüfziffer“ als Feature-Tests mit simuliertem Agenten grün
- [x] 1.5 `IWineResearchAgent.ResearchAsync` und `ResearchPrompt` um den bekannten Barcode erweitern (als Daten-Hinweis, maßgeblich, nur eindeutig lesbare Ziffern); Unit-Test, dass der Hinweis im Prompt steht und `ClaudeWineResearchAgent` weiter ohne Netzwerk testbar bleibt

## 2. Frontend: Barcode aus Fotos lesen

- [x] 2.1 Dienst `barcode-image-reader` (zxing, Formate EAN-13/8, UPC-A/E, `TRY_HARDER`, Bild auf ~2500 px begrenzt, Decodierung auf der Originaldatei vor `preparePhoto`); Unit-Test der reinen Teile (Größenberechnung, Prüfziffer, Formatfilter) mit `npm test`
- [x] 2.2 Reine Funktion `capture-barcode.ts` für die Rangfolge (Eingabe > Foto > leer, „von Hand geändert“ blockiert spätere Funde) mit Unit-Tests für alle Scenarios aus „Barcode auf den Fotos erkennen“

## 3. Frontend: gemeinsame Maske

- [x] 3.1 `photo-capture` um Barcode-Feld (Eingabe, „Scannen“ über `BarcodeScannerService`, Hinweis „auf dem Foto erkannt“, Entfernen) erweitern und `api.service.ts` `createCapture` das Feld `barcode` mitsenden lassen; prüfen im Browser mit Vorder- und Rückenfoto, beide mit/ohne Barcode
- [x] 3.2 `wine-new` zeigt bei `quota.enabled` die gemeinsame Maske statt zweier Karten, Datenschutzhinweis bei der ersten Aufnahme, Nebenlink „Nur Barcode, ohne Foto“ mit bisherigem Ablauf; ohne Schlüssel unverändert; prüfen im Browser (mit/ohne Schlüssel) und auf 375 px Breite
- [x] 3.3 Abgleich vor der Recherche: bei gültigem Barcode `lookupBarcode` (entprellt), Treffer im Keller → Karte „Wein bereits im Keller“ mit „Flaschen hinzufügen“ und „Trotzdem neu erfassen“; prüfen im Browser, dass dabei kein Kontingent verbraucht wird (`/api/captures/quota` bleibt gleich)
- [x] 3.4 Vorbefülltes Formular zeigt den Entwurfs-Barcode als „Etikett“ (Markierung); Unit-Test in `capture.spec.ts`

## 4. Integration und Doku

- [x] 4.1 Durchgängig im Browser: Foto vorne ohne, Foto hinten mit Barcode → Code erscheint → Erfassung → Entwurf enthält Code; bekannter Wein erkannt; ungültiger Code von Hand eingegeben; Barcode entfernt und neu aufgenommen; ohne Schlüssel läuft der alte Ablauf
- [x] 4.2 README (Erfassungsablauf, Barcode-Erkennung auf Fotos) aktualisieren und `openspec validate combine-barcode-and-photo-capture --strict` ausführen

## Workflow follow-up

- Change nach erfolgreicher Prüfung mit `/openspec-archive-change` archivieren; zuvor muss `add-photo-capture` archiviert sein.
