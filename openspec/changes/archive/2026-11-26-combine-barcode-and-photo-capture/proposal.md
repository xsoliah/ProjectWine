# Proposal

## Why

Auf „Wein hinzufügen“ gibt es heute zwei getrennte Wege: Barcode scannen oder per Foto erfassen. Beides gehört zusammen: Der Barcode steht fast immer auf dem Etikett, meist auf dem Rückenetikett. Wer ein Foto macht, soll den Barcode nicht noch einmal separat scannen müssen, und der Barcode soll mit dem Foto und allen anderen Angaben im selben Entwurf landen. Heute liest der Agent den Barcode nur als Text aus dem Bild; das ist bei Ziffernfolgen unzuverlässig und wird nicht auf Plausibilität (Prüfziffer) geprüft.

## What Changes

- Neu: Die Foto-Erfassung (Vorder- und Rückenetikett) und der Barcode sind **eine Maske**. Auf „Wein hinzufügen“ nimmt man ein oder zwei Fotos auf; ein Barcode kann zusätzlich gescannt oder eingegeben werden, ist aber nie Pflicht.
- Neu: Die App sucht **automatisch auf beiden Fotos nach einem Barcode** (Decodierung im Gerät/Browser auf dem unverkleinerten Foto) und zeigt den gefundenen Code in der Maske an, bevor die Erfassung startet. Er lässt sich korrigieren oder entfernen.
- Neu: Der Barcode wird **zusammen mit den Fotos** zum Entwurf gespeichert. Der Agent bekommt ihn als bekannte Angabe (hilft bei der Websuche per EAN) und liest nur dann selbst einen vom Foto, wenn keiner vorliegt. Ein vom Agenten gelesener Barcode wird nur übernommen, wenn die Prüfziffer stimmt.
- Neu: Ist der Barcode bekannt und der Wein schon im Keller, bietet die Maske **vor der Recherche** an, Flaschen hinzuzufügen – ohne Recherche-Kontingent zu verbrauchen.
- Geändert: „Barcode scannen“ und „Per Foto erfassen“ erscheinen nicht mehr als zwei getrennte Karten. Ohne konfigurierten API-Schlüssel bleibt der bisherige Barcode-Ablauf (Datenbank-Abfrage, manuelle Eingabe, „Ohne Barcode“) unverändert; mit Schlüssel bleibt „Nur Barcode, ohne Foto“ als Nebenweg.
- Kein Breaking Change an bestehenden API-Verträgen; `POST /api/captures` nimmt zusätzlich ein optionales Feld `barcode` an.

## Capabilities

### New Capabilities
- `combined-wine-capture`: Gemeinsame Erfassungsmaske für Fotos und Barcode: Barcode-Erkennung auf den Fotos, Scan/Eingabe, Prüfung, Speicherung im Entwurf, Vorrang des Barcodes, Abgleich mit dem Keller vor der Recherche.

### Modified Capabilities
<!-- Keine im Hauptbestand: `photo-capture` liegt noch im offenen Change `add-photo-capture` und ist nicht in openspec/specs. Dieser Change setzt dessen Umsetzung voraus und ergänzt sie in einer eigenen Capability. -->

## Impact

- **Abhängigkeit**: setzt `add-photo-capture` voraus (Entwürfe, Agent, Worker).
- **Frontend**: `wine-new` und `photo-capture` werden zu einer Maske; neuer Dienst zur Barcode-Erkennung auf Bilddateien (vorhandene Abhängigkeit `@zxing/library`, keine neue); `api.service.ts` sendet `barcode` mit.
- **Domain/Application**: `CaptureDraft.Barcode` (Migration), `CaptureService.CreateAsync` (Prüfung per `BarcodeNormalizer` inkl. Prüfziffer), `CaptureProcessor` (Vorrang des angegebenen Barcodes, Prüfziffer für gelesene).
- **Infrastructure**: `ResearchPrompt`/`ClaudeWineResearchAgent` (Barcode als Hinweis; Ziffern nur bei sicherem Lesen angeben).
- **Tests**: Erweiterung von `FotoErfassung.feature`, Unit-Tests für Prüfziffer und Frontend-Ablaufentscheidung.
- **Außerhalb des Umfangs**: Vorbelegung aus Open Food Facts im Foto-Ablauf; serverseitige Barcode-Decodierung; mehrere Barcodes pro Flasche.
