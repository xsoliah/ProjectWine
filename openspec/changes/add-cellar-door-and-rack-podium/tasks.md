# Tasks

## 1. Domäne und Datenbank

- [x] 1.1 In `CellarRoom` die nullable Felder `DoorWall` (0–3) und `DoorOffsetCm`, Konstanten (Breite 90, Höhe 205), Methoden `SetDoor`/`ClearDoor` und die reine Prüffunktion `CheckDoor` (Tür liegt in der Wand) anlegen; Unit-Tests mit den Zahlen aus der Spec (150 cm vorne gültig, 330 cm bei 4 m Breite ungültig, ungültige Wand, Raumverkleinerung auf 3 m bei Abstand 300 cm)
- [x] 1.2 An `Rack` das Feld `ElevationCm` (0–200) ergänzen, `Place(x, z, rotation, elevationCm)` anpassen, `ClearPlacement` setzt auf 0; reine Funktion `CellarRoom.CheckHeight` (Höhe + Reihen × 12 cm ≤ Raumhöhe, nur bei Höhe > 0); Unit-Tests (150 cm bei 10 Reihen im 2,50-m-Raum abgelehnt, 40 cm bei 5 Reihen angenommen, −5 und 250 abgelehnt)
- [x] 1.3 `AppDbContext` abbilden und Migration `AddDoorAndRackElevation` erzeugen; gegen die Datenbank prüfen (bestehende Räume ohne Tür, bestehende Regale Höhe 0)

## 2. Anwendungsschicht und API

- [x] 2.1 DTOs erweitern (`CellarRoomDto.Door`, `RackPlacementDto.ElevationCm`, `PlaceRackRequest.ElevationCm` optional, neuer `SetDoorRequest`) und `ToDto` anpassen
- [x] 2.2 `CellarRoomService`: `SetDoorAsync` (legt den Raum bei Bedarf an; 400/409) und `ClearDoorAsync` (idempotent); `SaveAsync` prüft zusätzlich Tür und Höhen aller platzierten Regale (409 mit Namen); `PlaceAsync` übernimmt die Höhe und prüft sie; `EnsureStillFitsAsync` prüft nach Regalvergrößerung auch die Höhe
- [x] 2.3 Endpunkte `PUT/DELETE /api/cellar-room/door` registrieren; Specs-Feature `Kellerraum.feature` um die Szenarien aus `cellar-room-door` und `rack-elevation` erweitern (Tür setzen/verschieben/ungültig/entfernen/Raum verkleinern/Privatsphäre; Höhe setzen/zu hoch/ungültig/Raum abgesenkt/Regal vergrößern/Entfernen setzt zurück/Höhe bleibt beim Verschieben/fremdes Regal) mit Steps, alle Szenarien grün

## 3. Frontend: Geometrie und Daten

- [ ] 3.1 `core/cellar-room.ts`: Modelle (`RoomDoor`, `elevationCm` an `RackPlacement`), `doorSegment`, `isDoorValid`, `projectToWall` (nächste Wand, Mittelpunkt unter dem Zeiger, Klemmen, Einrasten ≤ 10 cm), `checkHeight`, `describePlacement` mit „… cm über dem Boden“; `ApiService`-Aufrufe für Tür und erweiterte Platzierung; Tests in `cellar-room.spec.ts` mit denselben Testvektoren wie in C#

## 4. Frontend: 3D-Szene

- [ ] 4.1 Wände mit Tür bauen (Wand in links/rechts/Sturz zerlegt), Türrahmen, Türblatt und Klinke; Durchscheinen wie die Wand; Aufräumen; im Browser prüfen, dass die Tür an allen vier Wänden maßstäblich und von innen wie von außen sichtbar ist
- [ ] 4.2 Podeste und Anheben: Podest-Quader pro Regal mit Höhe > 0, `y`-Versatz für Bretter, Flaschenböden, Auswahlhülle; Podest folgt Ziehen und Drehen; kein Podest bei Höhe 0; im Browser mit 0, 40 und 200 cm prüfen
- [ ] 4.3 Tür ziehen im Modus „Anordnen“ (Raycast auf Türblatt, `projectToWall`, Live-Umbau, Speichern beim Loslassen, Rückkehr bei Fehler); im Browser mit simulierten Zeigerereignissen prüfen, auch Wechsel der Wand

## 5. Frontend: Seite „Kellerraum“

- [ ] 5.1 Raumformular um den Abschnitt „Tür“ erweitern (Auswahl Wand, Abstand in cm, „Tür setzen“/„Tür hinzufügen“, „Tür entfernen“, Konfliktmeldung des Servers); Beschreibung der Szene nennt die Tür; Anzeige der Tür auch in der 3D-losen Liste
- [ ] 5.2 Regalliste und Infoleiste um das Feld „Höhe über Boden (cm)“ für platzierte Regale ergänzen (kein Feld bei nicht platzierten), Speichern über `PUT placement` mit vollständiger Platzierung, Rückkehr zum gespeicherten Wert und Fehlermeldung bei Fehlschlag; Platzierung beim Ziehen/Drehen/Platzieren behält die Höhe

## 6. Abschluss

- [ ] 6.1 Gesamttest: `dotnet test`, Frontend-Tests und `ng build`; im Browser Raum mit Tür und mindestens zwei Regalen (eines auf Podest) auf Desktop- und Handybreite durchspielen (Tür setzen/ziehen/entfernen, Höhe ändern, Regal ziehen mit Podest, Raum verkleinern mit Konflikt, Seite neu laden)
