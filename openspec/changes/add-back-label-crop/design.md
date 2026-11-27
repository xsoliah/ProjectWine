# Design

## Context

`Wine` kennt für die Vorderseite `LabelImageId` (zugeschnitten), `LabelSourceImageId` (Original) und `LabelCornersJson`; `LabelImageService` schneidet über `ILabelImageExtractor` (Perspektive, 3:4, Papierfarbe) und das Frontend nutzt `LabelCornerEditor`. Die Rückseite ist dagegen nur `BackImageId` mit dem rohen Foto (`BackImageService`, `PUT/DELETE /back-image`); `app-bottle-3d` legt dieses Bild über `backLabelFrame` auf die Flasche und kommt mit beliebigem Seitenverhältnis zurecht.

## Goals / Non-Goals

**Goals:** Rückenetikett wie die Vorderseite zuschneiden, Zuschnitt anpassen, bestehende Rohfotos weiter nutzbar.

**Non-Goals:** automatische Eckenerkennung (die Recherche liefert nur Vorderecken), Zuschnitt in der Foto-Erfassung, Kellerliste, Texterkennung.

## Decisions

- **Vorhandene Bausteine wiederverwenden.** `ILabelImageExtractor` und `LabelCornersJson` sind nicht vorderseitenspezifisch; die Rückseite nutzt sie unverändert, ebenso das Standardformat 3:4. Alternative: freies Seitenverhältnis (Querformat für breite Etiketten). Das würde Extractor und Format ändern; „wie bei der Vorderseite“ spricht für dasselbe Format. Annahme, später änderbar.
- **Zwei neue Spalten** `Wine.BackSourceImageId` (nullable, ohne FK, wie `LabelSourceImageId`) und `Wine.BackCornersJson`; Migration `AddWineBackCrop`. `BackImageId` bleibt das angezeigte Bild, damit 3D-Komponente, Detailansicht und Datenschutz unverändert bleiben.
- **Bestehende Rohfotos ohne Datenmigration.** Ist `BackSourceImageId` leer, gilt `BackImageId` als unbearbeitetes Original. `SetCornersAsync` nimmt dann `BackImageId` als Quelle, schneidet neu, setzt das Rohfoto als `BackSourceImageId` und das neue Bild als `BackImageId` (das Rohfoto wird nicht gelöscht). Ist das Original vorhanden, wird nur das zugeschnittene Bild ersetzt und gelöscht. Dasselbe gilt für aus der Foto-Erfassung übernommene Rückenfotos; `CaptureService` bleibt unverändert.
- **API:** `PUT /api/wines/{id}/back-image` bekommt wie das Etikett zusätzlich das Feld `corners` (Multipart: `image` + `corners`); ohne gültige Ecken Fehler mit deutscher Meldung. Neu `PUT /api/wines/{id}/back-image/corners` für den Neu-Zuschnitt. `DELETE` löscht Bild und Original. `WineDto` um `backSourceImageId` und `backCorners` erweitert; „Zuschnitt anpassen“ erscheint, sobald ein Rückseitenbild existiert (Original oder Rohfoto).
- **Frontend:** Der Ecken-Editor der Vorderseite (`LabelCornerEditor`) wird mit eigenem Zustand (`backEditor`) für die Rückseite wiederverwendet; `pickBack` öffnet den Editor statt direkt hochzuladen, `adjustBack` lädt das Original (oder das Rohbild) und speichert über `setBackCorners`. Die 3D-Komponente bleibt unberührt.
- **Beim Ersetzen** werden altes Bild und altes Original über `ImageService.RemoveAsync` erst nach erfolgreichem Zuschnitt gelöscht (ungültige Datei ändert nichts).

## Risks / Trade-offs

- [Breite Rückenetiketten werden im 3:4-Format mit Papierrand kleiner auf der Flasche] → Proportionen haben Vorrang; ein freies Format wäre ein späterer Change.
- [Ecken müssen von Hand gesetzt werden] → Vorschlag in der Bildmitte wie bei der Vorderseite; automatische Erkennung ist Non-Goal.
- [Bestehende Rückseiten ohne Original] → bleiben sichtbar wie bisher, Zuschnitt ist freiwillig.
- [Überschneidung mit offenen Changes `add-wine-back-label` und `show-back-label-in-3d`] → Umsetzung danach; betrifft `BackImageService`, `wine-detail` und `Rueckseite.feature`.

## Migration Plan

EF-Migration `AddWineBackCrop` fügt zwei nullable Spalten hinzu; vorhandene Zeilen bleiben `NULL` und verhalten sich wie bisher. Rollback: Migration zurücknehmen (Originalfotos der Rückseite gehen dann verloren).
