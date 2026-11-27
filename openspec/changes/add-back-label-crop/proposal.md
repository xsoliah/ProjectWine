# Proposal

## Why

Das Rückseitenbild eines Weins wird heute als rohes, ganzes Foto gespeichert und genauso auf die Flasche in der 3D-Ansicht gelegt. Darauf sind Tisch, Flaschenglas und Hintergrund zu sehen, das Etikett ist klein und schief. Beim Vorderetikett kann man dagegen die vier Ecken setzen und bekommt ein sauber entzerrtes Etikettenbild. Dieselbe Möglichkeit soll es für die Rückseite geben.

## What Changes

- Neu: Beim Hinzufügen oder Ersetzen des Rückseitenbilds öffnet sich wie beim Vorderetikett der **Ecken-Editor**; der Server schneidet das Rückenetikett entzerrt aus und speichert es im Standardformat (Hochformat 3:4, 900 × 1200 Pixel, JPEG, Papierfarbe als Füllung, keine Verzerrung).
- Neu: Das Originalfoto der Rückseite bleibt privat gespeichert; „Zuschnitt anpassen“ in der Detailansicht verschiebt die Ecken und schneidet neu (keine Recherche, kein Tageslimit).
- Geändert: Detailansicht (flache Rückseite) und 3D-Flasche zeigen das zugeschnittene Rückenetikett statt des Rohfotos.
- Geändert: Bestehende Rückseitenbilder (Rohfotos, auch aus der Foto-Erfassung) bleiben unverändert sichtbar; „Zuschnitt anpassen“ nimmt dann dieses Foto als Original und legt erst beim Speichern ein zugeschnittenes Bild an.
- Beim Entfernen der Rückseite und beim Löschen des Weins werden Rückseitenbild und Originalfoto gelöscht.
- `WineDto` bekommt `backSourceImageId` und `backCorners`; kein Breaking Change. Die Foto-Erfassung bleibt unverändert (Rückenfoto wird roh übernommen, Zuschnitt danach möglich).

## Capabilities

### New Capabilities
<!-- Keine -->

### Modified Capabilities
- `wine-back-label-image`: Rückseitenbild wird zugeschnitten und entzerrt gespeichert, Zuschnitt lässt sich prüfen und anpassen. Die Capability liegt noch im offenen Change `add-wine-back-label`, nicht in `openspec/specs`; dieser Change wird deshalb nach ihm umgesetzt und archiviert.

## Impact

- **Domain/Infrastruktur**: `Wine.BackSourceImageId`, `Wine.BackCornersJson`; Migration `AddWineBackCrop`.
- **Application**: `BackImageService` (Setzen mit Ecken, Neu-Zuschnitt, Entfernen inkl. Original), Wiederverwendung von `ILabelImageExtractor`; `WineService` löscht das Original mit; `WineDto`-Mapping.
- **API**: `PUT /api/wines/{id}/back-image` nimmt Foto plus Ecken, neu `PUT /api/wines/{id}/back-image/corners`.
- **Frontend**: `wine-detail` (Ecken-Editor und „Zuschnitt anpassen“ für die Rückseite), `ApiService`, `models.ts`; die 3D-Komponente bleibt unverändert, sie lädt `backImageId`.
- **Tests**: `Rueckseite.feature` und Schritte erweitern.
- **Abhängigkeit**: `add-wine-back-label`, `show-back-label-in-3d` (beide Spezifikationen noch offen).
- **Nicht Teil**: automatische Eckenerkennung für die Rückseite, Zuschnitt in der Foto-Erfassung, Texterkennung, Rückseite in der Kellerliste.
