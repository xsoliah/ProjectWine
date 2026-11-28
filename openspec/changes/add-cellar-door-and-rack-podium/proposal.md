# Proposal

## Why

Im Kellerraum (3D) sehen alle Wände gleich aus; wer die Ansicht gedreht hat, erkennt nicht mehr, wo vorne ist oder wo man den Keller betritt. Eine Tür als Orientierungspunkt hilft, den 3D-Raum mit dem echten Keller in Deckung zu bringen. Außerdem stehen Regale im echten Keller manchmal auf einem Sockel oder Podest (z. B. wegen Feuchtigkeit oder Unebenheiten); bisher stehen alle Regale zwingend auf dem Boden.

## What Changes

- **Tür:** Der Kellerraum kann eine Tür haben. Der Benutzer wählt die Wand (vorne, hinten, links, rechts) und den Abstand der Tür vom Wandanfang; die Tür ist 90 cm breit und 205 cm hoch (nie höher als der Raum). In der 3D-Szene erscheint sie als Türöffnung mit Rahmen und Türblatt, im Modus „Anordnen“ lässt sie sich per Ziehen entlang der Wände verschieben, alternativ über Eingabefelder. „Tür entfernen“ nimmt sie wieder weg. Standardmäßig hat ein Raum keine Tür.
- **Regal auf Höhe stellen:** Ein platziertes Regal bekommt eine einstellbare Höhe über dem Fußboden (0–200 cm, ganze cm; Standard 0). Bei Höhe > 0 erscheint unter dem Regal ein Podest in genau der Grundfläche des Regals, das bis zum Boden reicht, damit das Regal nicht in der Luft schwebt. Das Regal samt Flaschen steht dann auf dem Podest. Die Höhe ist in der Regalliste, der Infoleiste und über Eingabefelder einstellbar und wird mit der Position gespeichert.
- Konsistenz: Regal samt Podest MUSS unter die Decke passen (Höhe über Boden + Regalhöhe ≤ Raumhöhe); beim Verkleinern des Raums oder Vergrößern des Regals wird das geprüft. Die Tür MUSS in ihre Wand passen und wird beim Verkleinern des Raums mitgeprüft.

Nicht Teil dieser Änderung: mehrere Türen, Fenster, Treppen, Türaufschwung bzw. Freihalten des Bereichs vor der Tür (Regale dürfen davor stehen), Türen mit anderer Größe, Stapeln von Regalen übereinander (das Podest dient nur dem Anheben, die Überlappungsprüfung bleibt auf der Grundfläche), einstellbare Podestmaße oder -material, Podeste ohne Regal.

## Capabilities

### New Capabilities
- `cellar-room-door`: Eine Tür im Kellerraum (Wand, Abstand, Darstellung, Verschieben).
- `rack-elevation`: Höhe eines platzierten Regals über dem Boden samt Podest.

### Modified Capabilities

Die Anforderungen ergänzen die noch nicht ins Hauptverzeichnis übernommene Fähigkeit `cellar-room` aus der Änderung `add-cellar-3d-room` (Code bereits gemergt). Sie sind deshalb als eigene Fähigkeiten formuliert und ändern deren Anforderungen nicht inhaltlich.

## Impact

- Backend: `CellarRoom` erhält nullable Türfelder (`DoorWall`, `DoorOffsetCm`), `Rack` ein Feld `ElevationCm` (Standard 0); EF-Migration; `CellarRoomService` und Endpunkte `PUT/DELETE /api/cellar-room/door`; `PlaceRackRequest` und `RackPlacementDto` um `ElevationCm` erweitert; Prüfungen in `CellarRoomService.SaveAsync/PlaceAsync` und `RackService`/`EnsureStillFitsAsync`.
- Frontend: `core/cellar-room.ts` (Modelle, Türgeometrie, Projektion auf die Wand mit Einrasten, Höhenprüfung, Tests), `shared/cellar-room-3d.ts` (Türöffnung in der Wand, Podest, Anheben von Regalen/Flaschenböden/Auswahlhülle, Ziehen der Tür), Seite `pages/cellar-room/` (Türformular, Höhenfeld).
- Tests: `Kellerraum.feature` um Szenarien erweitern (Tür setzen/ungültig/entfernen/Raum verkleinern, Höhe setzen/zu hoch/zurücksetzen), Unit-Tests für die Geometrie.
- Bestehende Daten bleiben gültig (keine Tür, Höhe 0). Keine neuen Abhängigkeiten. Setzt die Änderung `add-cellar-3d-room` voraus.
