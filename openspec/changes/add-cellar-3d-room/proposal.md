# Proposal

## Why

Regale werden bisher einzeln als Raster oder 3D-Modell gezeigt. Wie sie im echten Keller zueinander stehen, lässt sich damit nicht festhalten. Benutzer möchten ihren Weinkeller als 3D-Raum nachbauen, ihre Regale darin platzieren und so einen räumlichen Eindruck vom tatsächlichen Keller bekommen – auch um Flaschen schneller dem richtigen Regal im richtigen Teil des Kellers zuzuordnen.

## What Changes

- Neue Seite „Kellerraum“ (Navigationseintrag, Route `/cellar-room`) mit einer 3D-Ansicht eines Raums aus Boden und Wänden, in dem alle Regale des Benutzers maßstäblich stehen. Der Raum ist drehbar und zoombar; Regale zeigen ihre Fächer und die Belegung (Flaschenböden nach Weintyp eingefärbt, freie Fächer leer).
- Der Benutzer legt die Raummaße fest (Breite, Tiefe, Deckenhöhe in Metern; Standard 4 × 3 × 2,5 m).
- Modus „Anordnen“: Regale lassen sich per Ziehen auf dem Boden verschieben und in 90°-Schritten drehen, mit Einrasten an Wänden und anderen Regalen. Alternativ (und für Tastatur/Screenreader) lassen sich Position und Drehung über Eingabefelder und Pfeiltasten setzen. Regale dürfen weder überlappen noch aus dem Raum ragen.
- Regale ohne Position erscheinen in einer Liste „Nicht platziert“ und lassen sich mit „Platzieren“ an die erste freie Stelle stellen; „Entfernen“ nimmt ein Regal wieder aus dem Raum, ohne es oder seine Flaschen zu löschen.
- Ein Tipp auf ein Regal im Raum hebt es hervor, fährt die Kamera dorthin und bietet „Regal öffnen“ (bestehende Regaldetailansicht mit Raster/3D).
- Position der Regale und Raummaße werden pro Benutzer gespeichert (neue Tabelle für den Raum, drei neue Spalten am Regal).

Nicht Teil dieser Änderung: mehrere Räume, mehrstöckige Keller, Türen/Fenster/Treppen, Einbauten wie Säulen oder nicht-rechteckige Grundrisse, Etiketten auf den Flaschen in der Raumansicht (dafür gibt es die Regaldetailansicht), Drag-and-drop von Flaschen zwischen Regalen im Raum.

## Capabilities

### New Capabilities
- `cellar-room`: Raummaße, Position und Drehung der Regale im Kellerraum sowie die 3D-Darstellung des Raums.

### Modified Capabilities

## Impact

- Backend: neue Entität `CellarRoom` (pro Benutzer, Maße in cm), nullable Spalten `PosX`, `PosZ`, `Rotation` an `Rack`, EF-Migration; neuer `CellarRoomService` und Endpunkte `GET/PUT /api/cellar-room`, `PUT/DELETE /api/racks/{id}/placement`; Änderung von Regalmaßen und Raummaßen prüft die Platzierungen (`RackService`).
- Frontend: neue Seite `web/src/app/pages/cellar-room/` mit neuer Komponente `cellar-room-3d` (three.js, bereits Abhängigkeit), reine Geometrie-/Kollisionsfunktionen in `web/src/app/core/cellar-room.ts` mit Unit-Tests, Route und Navigationseintrag in `app.routes.ts`/`app.html`.
- Tests: Specs-Feature `Kellerraum.feature` mit Steps; Unit-Tests für Kollision und Einrasten.
- Keine neuen Abhängigkeiten. Unabhängig von den offenen Änderungen zu Flaschenform und Etiketten; berührt die Regaldetailansicht nur durch einen Rücklink.
