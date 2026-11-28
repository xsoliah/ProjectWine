# Design

## Context

Motivation und Umfang: siehe proposal.md. Bestand (aus `add-cellar-3d-room`, bereits im Code): `CellarRoom` (Maße in cm, `Set`, `CheckFit`), `Rack` mit `PosX/PosZ/Rotation`, `Place`/`ClearPlacement`, `CellarRoomService` (`SaveAsync`, `PlaceAsync`, `ClearPlacementAsync`, statisch `EnsureStillFitsAsync` für `RackService`), DTOs `RackPlacementDto(X, Z, Rotation)`/`PlaceRackRequest`, Frontend `core/cellar-room.ts` (reine Geometrie), `shared/cellar-room-3d.ts` (Wände mit Durchscheinen, instanzierte Regale, Ziehen mit Einrasten) und Seite `pages/cellar-room`. Koordinaten: x nach rechts, z von der hinteren Wand nach vorn, y nach oben, Szene in Metern.

## Goals / Non-Goals

**Goals:** Eine Tür und eine Höhe pro Regal speichern, serverseitig auf Gültigkeit prüfen und in der Szene maßstäblich zeigen; bestehende Daten unverändert gültig.

**Non-Goals:** siehe proposal.md; zusätzlich keine Änderung am Kollisionsmodell (Grundfläche bleibt maßgeblich).

## Decisions

**Tür-Datenmodell:** Zwei nullable Spalten an `CellarRoom`: `DoorWall` (0 = hinten, 1 = rechts, 2 = vorne, 3 = links, im Uhrzeigersinn von oben gesehen, passend zur Regaldrehung) und `DoorOffsetCm`. Beide `null` = keine Tür. Breite 90 cm und Höhe 205 cm sind Konstanten (`CellarRoom.DoorWidthCm`, `DoorHeightCm`; effektive Höhe `min(205, HeightCm)`). Alternative eigene Tabelle `Doors` – verworfen, es gibt höchstens eine Tür pro Raum; die Tabelle ließe sich bei „mehrere Türen“ später ergänzen. Da der Raumdatensatz erst beim ersten Speichern entsteht, legt `PUT /door` ihn bei Bedarf mit Standardmaßen an.

**Tür-Geometrie:** Wandlänge ist `WidthCm` für hinten/vorne, `DepthCm` für links/rechts. Gültig, wenn `0 ≤ offset` und `offset + 90 ≤ Wandlänge`. Als 2D-Rechteck im Grundriss (dünner Streifen in der Wandebene) berechnet eine reine Funktion `doorSegment(room, door)` Start-/Endpunkt; eine Funktion `projectToWall(room, point)` (Frontend) wählt die nächste Wand zum Zeigerpunkt auf dem Boden, setzt den Abstand so, dass die Tür mittig unter dem Zeiger sitzt, klemmt auf `[0, Wandlänge − 90]` und rastet innerhalb 10 cm an Anfang/Ende ein. Dieselbe Prüfung gibt es in C# (`CellarRoom.CheckDoor`) und TS mit identischen Testvektoren (wie bei der Regalplatzierung). Der Server ist maßgeblich.

**Tür-API:** `PUT /api/cellar-room/door` `{Wall, OffsetCm}` → 400 bei ungültiger Wand/Zahl, 409 wenn die Tür nicht in die Wand passt (bei Raum ohne Datensatz gegen die Standardmaße); `DELETE /api/cellar-room/door` → entfernt die Tür (idempotent). `CellarRoomDto` erhält `Door? {Wall, OffsetCm}`. `SaveAsync` (Raummaße) prüft zusätzlich die Tür (409 „Die Tür würde nicht mehr in die Wand passen“). Eigene Endpunkte statt Erweiterung von `PUT /api/cellar-room`: Die Maßänderung der bestehenden Oberfläche würde sonst die Tür bei Auslassen überschreiben.

**Regalhöhe-Datenmodell:** Neue Spalte `Rack.ElevationCm` (int, `NOT NULL`, Standard 0). Die Höhe wird nur bei platzierten Regalen angezeigt/bearbeitet, `ClearPlacement` setzt sie auf 0 (so gibt es keine „versteckte“ Höhe an nicht platzierten Regalen). `Rack.Place(x, z, rotation, elevationCm)` validiert 0–200 (`DomainException` → 400). `PlaceRackRequest` und `RackPlacementDto` erhalten `ElevationCm` (im Request optional, Standard 0 – Clients ohne das Feld würden die Höhe also zurücksetzen; das Frontend schickt immer den vollständigen Stand). Ein Ändern allein der Höhe läuft über dieselbe Endstelle `PUT /api/racks/{id}/placement` mit unveränderter Position – kein neuer Endpunkt, die Überlappungs- und Raumprüfung läuft dabei mit.

**Höhenprüfung:** Neue reine Funktion `CellarRoom.CheckHeight(roomHeightCm, rack, elevationCm)` → Fehler, wenn `elevationCm > 0` und `elevationCm + rack.Height × CellSize > HeightCm`. Aufgerufen in `PlaceAsync`, `SaveAsync` (alle platzierten Regale mit Höhe > 0; erste Verletzung nennt das Regal) und `EnsureStillFitsAsync` (nach Regalvergrößerung). Bei Höhe 0 wird nicht geprüft, damit bestehende Regale, die höher als der Raum sind, weiterhin änderbar bleiben (heutiges Verhalten, nicht Teil dieser Änderung).

**3D – Tür:** Die Wand mit Tür wird nicht mehr als ein Quader gebaut, sondern aus bis zu drei Quadern: links neben der Öffnung, rechts neben der Öffnung und über der Öffnung (Sturz). Alle Teile teilen sich Material und Durchscheinen der Wand (`updateWalls` setzt sie gemeinsam). Hinzu kommen ein Türrahmen (drei dünne Quader in Holzfarbe) und ein Türblatt (flacher Quader, leicht eingerückt, kräftige Farbe, die sich von Wand und Boden abhebt; Klinke als kleiner Zylinder). Alles wird in `buildWalls` aufgebaut und über den vorhandenen `walls`-Container mit freigegeben (Schlüssel enthält die Tür, damit Änderungen neu bauen). Kein Aufschwung, die Tür ist geschlossen dargestellt.

**3D – Tür ziehen:** Im Modus „Anordnen“ hat das Türblatt einen Raycast-Treffer (vorrangig vor Wand); Ziehen projiziert den Zeigerpunkt auf die Bodenebene und nutzt `projectToWall`. Während des Ziehens wird die Tür live umgebaut (nur die Wand-Teile), beim Loslassen `PUT /door`, bei Fehler Rückkehr zur gespeicherten Tür. OrbitControls sperren wie beim Regalziehen. Tastatur/Screenreader: Eingabefelder in der Seite (Auswahl „Wand“, Zahlenfeld „Abstand in cm“, Knöpfe „Tür setzen“/„Tür entfernen“); ein Raum ohne Tür zeigt „Tür hinzufügen“ (Standard: vordere Wand, mittig).

**3D – Podest:** Pro Regal mit `elevationCm > 0` ein `Mesh` (BoxGeometry einheitlich 1 × 1 × 1, skaliert und in der Regalgruppe an Position/Drehung angehängt, Material warmes Holz/Beton, `MeshStandardMaterial` mit leichter Rauheit), Breite × Tiefe = Regal-Grundfläche, Höhe = Erhöhung. Regalbretter, Flaschenböden, Hüllquader (Auswahl/Raycast) und Ziehumriss erhalten `y += elevation`. Podeste werden gemeinsam mit den Regalen neu aufgebaut und mit freigegeben. Der Umriss beim Ziehen bleibt auf Bodenhöhe (er zeigt die Grundfläche, ist also auch ohne Anheben richtig). Die Raycast-Ebene zum Ziehen bleibt y = 0; die Greifversatzberechnung ändert sich nicht, nur sieht der Zeigerpunkt bei hohen Podesten leicht verschoben aus – hingenommen.

**Seite:** Regalliste: Zahlenfeld „Höhe über Boden (cm)“ (0–200, Schritt 5) pro platziertem Regal, Text „40 cm über dem Boden“ in `describePlacement`; Infoleiste des ausgewählten Regals mit demselben Feld. Änderung löst `PUT placement` mit der vollständigen Platzierung aus; Fehler → Meldung und Rückkehr zum gespeicherten Wert. Raumformular: Abschnitt „Tür“ (siehe oben). Textbeschreibung der Szene nennt die Tür.

## Risks / Trade-offs

- **Tür im Standardraum vorn:** Mehr als eine Tür fehlt; der Nutzen (Orientierung) ist mit einer Tür gedeckt. Erweiterung später als Liste möglich (Spalten wären dann in eine Tabelle zu verschieben).
- **Regale vor der Tür erlaubt:** Realitätsfern, aber das Freihalten des Türbereichs würde neue Konflikte auf bestehende Platzierungen bringen; bewusst nicht Teil der Änderung.
- **Podest an der Wand:** Ein Podest ist genau die Regalfläche; Wand-Durchscheinen verändert dessen Sichtbarkeit nicht. Kein Problem.
- **Doppelte Validierung C#/TS** wie bisher: identische Testvektoren.
- **Teurere Wandgeometrie:** Bis zu drei Quader statt einem pro Wand mit Tür; unerheblich.

## Migration Plan

EF-Migration `AddDoorAndRackElevation`: `cellar_rooms.DoorWall`, `cellar_rooms.DoorOffsetCm` (nullable), `racks.ElevationCm` (int, Standard 0). Bestehende Daten: keine Tür, Höhe 0 → Verhalten unverändert. Rückbau: Migration zurücknehmen; keine anderen Funktionen hängen davon ab.

## Open Questions

- Soll später der Bereich vor der Tür (Aufschwung/Durchgang) von Regalen freigehalten werden? Vorerst nein.
