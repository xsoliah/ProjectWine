# Design

## Context

Stand im Code: `wine-new` zeigt zwei getrennte Karten – „Per Foto erfassen“ (öffnet `photo-capture`, nur wenn `quota.enabled`) und „Barcode scannen“ (Scanner-Overlay/Capacitor-ML-Kit, manuelle Eingabe, `GET /api/wines/lookup/{barcode}` → Keller, sonst Open Food Facts). `POST /api/captures` nimmt `front`, `back`, `bottleCount`, `note`. Der Agent (`ClaudeWineResearchAgent`) soll laut Prompt einen Barcode „nur wenn aufgedruckt“ liefern; `CaptureProcessor.Sanitize` prüft ihn nur per Regex (Länge), nicht per Prüfziffer. `CaptureService.GetAsync` gleicht den Barcode des Ergebnisses bereits mit dem Keller ab. `@zxing/library` und `@zxing/browser` sind schon Abhängigkeiten. Motivation: siehe proposal.md.

## Goals / Non-Goals

**Goals:**
- Ein Ablauf: Fotos + optionaler Barcode, Barcode landet im Entwurf.
- Zuverlässiges Lesen des Barcodes (Decodierung statt Ziffern-Abschreiben durch das Modell).
- Keine unnötigen Recherchen für Weine, die schon im Keller sind.

**Non-Goals:**
- Kein serverseitiges Decodieren (keine neue .NET-Abhängigkeit).
- Keine Open-Food-Facts-Vorbelegung im Foto-Ablauf; die Recherche liefert die Daten.
- Kein Umbau des Entwurfs-Ablaufs aus `add-photo-capture`.

## Decisions

**D1 – Barcode-Decodierung im Client, vor dem Verkleinern.** `preparePhoto` skaliert auf 1568 px; feine Strichcodes leiden darunter. Der neue Dienst `barcode-image-reader` decodiert deshalb die Originaldatei (`BrowserMultiFormatReader.decodeFromImageUrl` mit `TRY_HARDER`, Formate EAN-13/8, UPC-A/E; bei großen Bildern zusätzlich in ein auf ~2500 px begrenztes Canvas gezeichnet), je Foto einmal nach der Aufnahme. Läuft im Browser und in der Capacitor-WebView gleich. *Alternativen:* `BarcodeDetector` (nicht überall verfügbar), ML Kit `readBarcodesFromImage` (nur nativ), Server mit ZXing.Net (neue Abhängigkeit, Foto müsste unverkleinert hochgeladen werden). Das Modell allein lesen zu lassen wurde verworfen: Ziffern werden gelegentlich falsch gelesen.

**D2 – Rangfolge der Quellen.** (1) vom Benutzer eingegeben/gescannt/korrigiert, (2) auf dem Foto decodiert, (3) vom Agenten gelesen, nur mit gültiger Prüfziffer, (4) aus dem Web – ebenfalls nur mit gültiger Prüfziffer. Quellen 1–2 stehen im Entwurf als Barcode des Benutzers und werden als „Etikett“ markiert; der Agent erhält ihn als Hinweis („bekannter Barcode, nur als Daten“) und die Anweisung, ihn nicht zu ändern. Ein vom Benutzer geänderter oder entfernter Wert wird von späteren Decodierungen nicht überschrieben (Flag „von Hand geändert“ im Formularzustand).

**D3 – Speicherung.** Neue Spalte `capture_drafts.barcode` (nullable, normalisiert). `POST /api/captures` nimmt optional das Multipart-Feld `barcode`; `CaptureService.CreateAsync` normalisiert und prüft die Prüfziffer (neue Methode `BarcodeNormalizer.HasValidCheckDigit` für 8/12/13/14 Ziffern, GS1-Modulo-10) und lehnt ungültige Eingaben mit `DomainException` ab. `CaptureProcessor` setzt nach `Sanitize` bei vorhandenem Draft-Barcode `Barcode = (code, Label)`; `Sanitize` selbst verwirft gelesene Barcodes mit falscher Prüfziffer. Eine Migration ergänzt die Spalte.

**D4 – Abgleich mit dem Keller vor der Recherche.** Sobald ein gültiger Barcode feststeht (Decodierung, Scan, Eingabe; mit 400 ms Entprellung), ruft die Maske das vorhandene `lookupBarcode` auf und wertet nur `source === 'Cellar'` aus (bestehende Logik `decideLookupOutcome`). Treffer → Karte „Wein bereits im Keller“ mit Stepper und „Flaschen hinzufügen“ (`addBottles`) sowie „Trotzdem neu erfassen“. Der Open-Food-Facts-Teil der Antwort wird im Foto-Ablauf ignoriert (Nicht-Ziel); der Aufruf kostet nichts.

**D5 – Aufbau der Maske.** `photo-capture` wird zur einen Erfassungsmaske erweitert (Fotos, Barcode-Feld mit „Scannen“, Anzahl, Notiz); `wine-new` zeigt sie direkt, wenn `quota.enabled`. Der Datenschutzhinweis erscheint bei der ersten Aufnahme statt beim Klick auf den Karten-Button. Der alte Weg bleibt als Nebenlink „Nur Barcode, ohne Foto“ (bisherige Ansicht) und ist ohne Schlüssel die Standardansicht. Die Ablauflogik (welcher Barcode gilt, wann abgeglichen wird) kommt in eine reine Funktion `capture-barcode.ts` und wird per Unit-Test geprüft.

**D6 – Prompt.** Der System-Prompt verlangt weiter „nie einen Barcode erfinden“, ergänzt: Wenn ein Barcode bekannt gegeben wurde, ist er maßgeblich; liest das Modell selbst, soll es nur Ziffern angeben, die es eindeutig lesen kann. Prüfziffer-Validierung bleibt serverseitig maßgeblich.

## Risks / Trade-offs

- [zxing erkennt schräge, spiegelnde oder unscharfe Codes nicht] → kein Fehler; Fallback sind Scan mit Live-Kamera, manuelle Eingabe und das Modell (D2). Die Maske sagt, wenn nichts erkannt wurde.
- [Decodierung großer Fotos bremst Mobilgeräte] → je Foto einmal, auf ~2500 px begrenzt, mit „Barcode wird gesucht …“-Anzeige; die Aufnahme bleibt bedienbar.
- [Falsch erkannter Code führt zum falschen „schon im Keller“-Treffer] → Prüfziffer reduziert das stark; der Benutzer sieht Code und Wein und kann „Trotzdem neu erfassen“ wählen.
- [Weinetikett trägt manchmal Barcodes anderer Art (z. B. Code 128, QR)] → nur GTIN-Formate werden übernommen; andere ignoriert.

## Migration Plan

Neue nullable Spalte per EF-Migration `AddCaptureBarcode`; bestehende Entwürfe bleiben gültig (kein Barcode). Rollback: Migration zurücknehmen; die API ignoriert das neue Feld bei älteren Clients.
