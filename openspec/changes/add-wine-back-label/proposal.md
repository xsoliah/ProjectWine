# Proposal

## Why

In der Einzelansicht eines Weins sieht man nur die Vorderseite. Ein Rückenetikett, das bei der Foto-Erfassung mit aufgenommen wurde, wird für die Recherche genutzt, beim Übernehmen des Entwurfs aber gelöscht. Auf der Rückseite stehen oft Rebsorten, Trinkfenster, Importeur und Hinweise, die man später noch einmal nachlesen möchte.

## What Changes

- Neu: Ein Wein kann zusätzlich ein **Rückseitenbild** haben. Es wird als ganzes Foto gespeichert (kein Zuschnitt, keine Ecken), nur im Browser verkleinert wie andere Fotos.
- Geändert: Beim Übernehmen eines Erfassungsentwurfs bleibt das Rückenetikett-Foto am Wein erhalten, statt gelöscht zu werden.
- Neu: Die Detailansicht zeigt Vorder- und Rückseite und lässt zwischen beiden umschalten. Ohne Rückseitenbild bleibt die Ansicht wie bisher; dort lässt sich eine Rückseite hinzufügen, ersetzen oder entfernen.
- Die Kellerliste zeigt weiterhin nur das Vorderetikett.
- `WineDto` bekommt zusätzlich `backImageId`; kein Breaking Change.

## Capabilities

### New Capabilities
- `wine-back-label-image`: Rückseitenbild eines Weins speichern (auch aus der Foto-Erfassung), in der Detailansicht anzeigen, hinzufügen, ersetzen, entfernen und privat halten.

### Modified Capabilities
<!-- Keine: `wine-label-image` und `photo-capture` stehen noch im offenen Change `add-photo-capture` und nicht in openspec/specs. Die Übernahme des Rückenetiketts wird deshalb hier als eigene Anforderung beschrieben. -->

## Impact

- **Abhängigkeit**: baut auf `add-photo-capture` auf (Entwurf mit `BackImageId`, `ImageService`, Etikettenbild-UI); sollte nach dessen Abschluss umgesetzt werden.
- **Domain/Application**: `Wine.BackImageId`; `CaptureService.AcceptAsync` behält das Rückenfoto; neue Methoden zum Setzen/Entfernen; `WineService` löscht das Bild mit dem Wein; `WineDto`-Mapping.
- **Infrastructure**: Migration `AddWineBackImage` (Spalte, Verweis auf `stored_images`).
- **API**: `PUT/DELETE /api/wines/{id}/back-image`; Abruf über das bestehende `/api/images/{id}`.
- **Frontend**: Detailansicht mit Umschalter Vorderseite/Rückseite und Werkzeugen für die Rückseite.
- **Tests**: Erweiterung von `FotoErfassung.feature` und neues Feature für das Rückseitenbild.
- **Nicht Teil**: Zuschnitt/Entzerren der Rückseite, Texterkennung auf der Rückseite, Anzeige in der Kellerliste.
