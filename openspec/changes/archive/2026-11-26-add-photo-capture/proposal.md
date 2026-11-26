# Proposal

## Why

Viele Flaschen haben keinen Barcode in der externen Datenbank, und alle Felder von Hand abzutippen ist mühsam. Fast alles Wichtige steht aber auf dem Etikett, und was dort fehlt (Region, Rebsorten, Trinkfenster, Barcode), lässt sich im Web nachschlagen. Ein Foto vom Etikett soll deshalb reichen: Ein KI-Agent liest das Etikett, recherchiert im Hintergrund per Websuche und liefert einen fertig ausgefüllten Vorschlag, den man nur noch prüft und übernimmt.

## What Changes

- Neu: Auf „Wein hinzufügen“ gibt es „Per Foto erfassen“. Man nimmt ein Foto des Vorderetiketts auf (optional ein zweites vom Rückenetikett), gibt optional die Anzahl Flaschen an und ist sofort fertig.
- Neu: Aus der Aufnahme entsteht ein **Erfassungsentwurf**. Ein Agent auf dem Server (Claude Opus 5.5 mit Bildverständnis, Websuche und Webseitenabruf) recherchiert im Hintergrund die Metadaten: Name, Weingut, Jahrgang, Weintyp, Land, Region, Rebsorten mit Anteilen, Flaschengröße, Trinkfenster, Barcode und eine kurze Notiz. Er liefert zu jedem Feld, ob es vom Etikett oder aus dem Web stammt, und die genutzten Quellen.
- Neu: Eine Seite „Entwürfe“ listet laufende, fertige und fehlgeschlagene Entwürfe. Ein fertiger Entwurf öffnet das Wein-Formular vorbefüllt (Herkunft und Rebsorten werden wie beim Barcode vorhandenen Stammdaten zugeordnet oder als neu vorgeschlagen). Erst mit „Speichern“ entsteht der Wein. Entwürfe lassen sich verwerfen oder neu recherchieren.
- Neu: Findet der Agent einen Barcode oder einen Wein, der schon im Keller ist, schlägt die App stattdessen vor, Flaschen zum vorhandenen Wein hinzuzufügen.
- Neu: Aus dem Foto wird **nur das Etikett** ausgeschnitten (die Ecken liefert der Agent, die App entzerrt perspektivisch) und als **Etikettenbild** im einheitlichen Hochformat 3:4 (900 × 1200 px) beim Wein gespeichert – ohne Hintergrund und ohne Teile der Flasche. Es erscheint im Keller und in der Detailansicht. Der Zuschnitt lässt sich über einen Ecken-Editor anpassen; ein Etikettenbild lässt sich auch nachträglich hinzufügen (mit Ecken-Editor), ersetzen oder entfernen.
- Neu: Ein **Tageslimit pro Benutzer** für Recherchen (Standard 20, konfigurierbar). Ohne konfigurierten API-Schlüssel ist die Foto-Erfassung ausgeblendet; alles andere funktioniert weiter.
- Kein Breaking Change am bestehenden Wein-Vertrag; `WineDto` bekommt zusätzlich `labelImageId`.

## Capabilities

### New Capabilities
- `photo-capture`: Aufnahme von Etikettenfotos, Erfassungsentwürfe mit Statusverlauf, Hintergrund-Recherche durch den Agenten, Prüfen und Übernehmen als Wein, Tageslimit und Verfügbarkeit.
- `wine-label-image`: Etikett aus einem Foto ausschneiden und entzerren, im Standardformat speichern, anzeigen, Zuschnitt anpassen, ersetzen und entfernen.

### Modified Capabilities
<!-- Keine: Die bestehenden Specs (wine-origins, cellar-statistics) ändern ihr Verhalten nicht; die Zuordnung zu Herkunft und Rebsorten nutzt die vorhandenen Regeln. -->

## Impact

- **Abhängigkeit**: setzt `add-grape-varieties` voraus (Rebsorten-Vorschläge mit Anteilen und deren Zuordnung). Reihenfolge der Umsetzung: erst Rebsorten, dann Foto-Erfassung.
- **Neue Abhängigkeit**: offizielles Anthropic-SDK für C# (NuGet `Anthropic`) im Infrastructure-Projekt; API-Schlüssel über Konfiguration (`Anthropic:ApiKey`, Umgebungsvariable oder User Secrets), nie im Frontend.
- **Neue Abhängigkeit**: SkiaSharp (NuGet `SkiaSharp`, MIT-Lizenz) im Infrastructure-Projekt zum Entzerren und Ausschneiden der Etiketten.
- **Domain/Application**: neue Entitäten `CaptureDraft` und `StoredImage`; `Wine.LabelImageId` und `Wine.LabelSourceImageId` (Originalfoto); `CaptureService`, `ImageService`; Abstraktionen `IWineResearchAgent` und `ILabelImageExtractor`.
- **Infrastructure**: `ClaudeWineResearchAgent` (Anthropic-SDK), `CaptureWorker` (Hintergrunddienst mit Warteschlange in der Datenbank); Tabellen `capture_drafts`, `stored_images`; Migration `AddPhotoCapture`.
- **API**: `/api/captures` (anlegen mit Foto-Upload, Liste, Details, verwerfen, neu recherchieren), `/api/images/{id}`, `PUT/DELETE /api/wines/{id}/label-image`, Ecken anpassen bei Entwurf und Wein.
- **Frontend**: Foto-Aufnahme (Dateiauswahl mit Kamera, Verkleinerung im Browser), Seite „Entwürfe“ mit Zähler in der Navigation, Vorbefüllung des Wein-Formulars aus dem Entwurf, Ecken-Editor für den Etikett-Zuschnitt, Etikettenbild in Keller/Detail.
- **Datenschutz und Kosten**: Fotos werden zur Auswertung an die Anthropic-API übertragen; die App weist bei der ersten Foto-Erfassung darauf hin. Jede Recherche verursacht API-Kosten (Größenordnung 10–30 Cent, wird bei der Umsetzung gemessen).
- **Tests**: Reqnroll-Feature `FotoErfassung.feature` mit einem simulierten Agenten (kein echter API-Aufruf in Tests).
