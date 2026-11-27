# Design

## Context

Siehe proposal.md – Why. Heute hat `CaptureDraft` ein optionales `BackImageId`; `CaptureService.AcceptAsync` löscht es beim Übernehmen. `Wine` kennt nur `LabelImageId`, `LabelSourceImageId` und `LabelCornersJson`. Bilder liegen als `StoredImage` je Besitzer und werden über `/api/images/{id}` ausgeliefert; die Detailansicht (`wine-detail`) zeigt das Etikettenbild mit Werkzeugen (Zuschnitt, Neues Foto, Entfernen).

## Goals / Non-Goals

**Goals:** Rückseitenbild am Wein speichern, aus der Erfassung übernehmen, in der Detailansicht umschaltbar anzeigen, nachträglich pflegen.

**Non-Goals:** Zuschnitt/Entzerren der Rückseite, Anzeige in der Kellerliste, Texterkennung, neue Recherche.

## Decisions

- **Ganzes Foto statt Zuschnitt.** Der Agent liefert nur Ecken fürs Vorderetikett; eine Rückseite ist oft Text auf Flaschenglas oder ein langer Streifen, bei dem 3:4-Entzerren Inhalt verlöre. Das Foto wird unbearbeitet gespeichert (im Browser wie bisher verkleinert). Alternative: eigener Ecken-Editor – aufwendiger, ohne klaren Nutzen; später ergänzbar.
- **Eine Spalte `Wine.BackImageId` (nullable, ohne FK – wie `LabelImageId`: ein FK auf `stored_images` ergäbe unter SQL Server einen zweiten Kaskadenpfad).** Kein Original/Ecken nötig. Löschen mit dem Wein und beim Ersetzen/Entfernen über `ImageService.RemoveAsync`.
- **Übernahme im Entwurf.** `AcceptAsync`: Bei neuem Wein oder vorhandenem Wein ohne Rückseite wird `draft.BackImageId` zu `wine.BackImageId` und aus der Löschliste genommen; hat der vorhandene Wein schon eins, wird das Entwurfsfoto wie bisher gelöscht (nichts überschreiben).
- **Eigene Endpunkte** `PUT/DELETE /api/wines/{id}/back-image` im Stil der Etikett-Endpunkte; Upload als Rohbild mit denselben Typ- und Größenprüfungen wie `ImageService.Add`.
- **UI:** In der Detailansicht ein Segment „Vorderseite | Rückseite“ nur bei vorhandenem Rückseitenbild; Werkzeuge „Rückseite hinzufügen / Neues Foto / Entfernen“ im Etikett-Bereich. Die Rückseite wird mit `object-fit: contain` gezeigt, damit nichts beschnitten wird.

## Risks / Trade-offs

- [Bestehende Weine haben das Rückenfoto bereits verloren] → nachträglich hinzufügbar; keine Migration der Daten möglich.
- [Speicherplatz durch weitere Fotos] → Browser-Verkleinerung und 10-MB-Grenze gelten weiter.
- [Überschneidung mit offenem Change `add-photo-capture`] → Umsetzung erst nach dessen Abschluss; betrifft dieselben Dateien (`CaptureService`, `wine-detail`).

## Migration Plan

EF-Migration `AddWineBackImage` fügt die nullable Spalte hinzu; bestehende Zeilen bleiben `NULL`. Rollback: Migration zurücknehmen (Rückseitenbilder gehen dann verloren).
