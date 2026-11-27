# Design

## Context

Ein `Rack` (`WineCellar.Domain/Racks.cs`) ist ein Raster Höhe × Breite mit `RackSlot`-Einträgen; es hat keinerlei räumliche Position. Die vorhandene Komponente `web/src/app/shared/rack-3d.ts` (three.js 0.181, OrbitControls) rendert genau ein Regal detailliert (Flaschenformen, Etikettenatlas, Reihen-Animation) in einem eigenen WebGL-Kontext mit Einheiten `CELL = 1`, `DEPTH = 3.2`. Der Raum soll viele Regale gleichzeitig zeigen, ohne die Detailtiefe und Kosten dieser Komponente pro Regal zu vervielfachen.

## Goals / Non-Goals

**Goals:**
- Einen Raum pro Benutzer mit Maßen speichern; Regale darin platzieren, drehen, entfernen – serverseitig auf Gültigkeit geprüft.
- Eine flüssige 3D-Szene auch mit vielen Regalen (z. B. 10 Regale à 30 Fächer) auf einem Handy.
- Anordnen per Ziehen sowie vollwertig per Tastatur/Eingabefeldern.

**Non-Goals:** mehrere Räume, Stockwerke, Türen/Fenster, nicht-rechteckige Grundrisse, Etiketten im Raum.

## Decisions

**Maßstab (Annahme):** Ein Fach ist 12 cm × 12 cm, ein Regal 38 cm tief (Verhältnis wie `CELL`/`DEPTH`: 1 : 3,2 ≈ 12 : 38). Regalbreite = Spalten × 12 cm, Regalhöhe = Reihen × 12 cm. Die Szene arbeitet in Metern; ein Regal ist also eine Gruppe, die mit 0,12 skaliert wird. Alternative „eigene Fachgröße pro Regal“ wurde verworfen (zusätzliches Eingabefeld, geringer Nutzen); die Konstante liegt zentral und lässt sich später pro Regal machen.

**Datenmodell:** Neue Entität `CellarRoom` mit `OwnerId` (Schlüssel, FK auf `AppUser`, Cascade), `WidthCm`, `DepthCm`, `HeightCm`. Der Datensatz entsteht erst beim ersten Speichern; `GET` liefert bis dahin die Standardmaße (400/300/250). `Rack` bekommt nullable `PosX`, `PosZ` (cm, Ecke links-hinten der gedrehten Grundfläche) und `Rotation` (0–3, Viertelumdrehungen im Uhrzeigersinn, 0 = Front zeigt zur vorderen Wand); „nicht platziert“ heißt alle drei `null`. Alternative: eigene Tabelle für Platzierungen – verworfen, da genau eine Platzierung pro Regal existiert und das Löschen des Regals sie automatisch mitnimmt. Eine Migration `AddCellarRoom` legt Tabelle und Spalten an; bestehende Regale bleiben „nicht platziert“.

**Koordinatensystem:** x nach rechts, z von der hinteren Wand nach vorn (Boden-Draufsicht, y nach oben in three.js). Die Grundfläche eines Regals bei Rotation r ist `(w, d)` für 0/2 und `(d, w)` für 1/3; gespeichert wird immer die Min-Ecke dieser Fläche. Drehen um die Mitte ändert damit die Min-Ecke (Mitte bleibt, wird auf ganze cm gerundet).

**Gültigkeit – eine Quelle, zwei Orte:** Die Regeln (innerhalb des Raums, keine Überlappung mit offenen Intervallen, d. h. Berührung erlaubt) stehen als reine Funktionen in `WineCellar.Domain` (`RackFootprint`, `CellarRoom.Validate`) und als gleichwertige reine Funktionen im Frontend (`core/cellar-room.ts`) für Ziehvorschau und Einrasten. Der Server ist maßgeblich; das Frontend verwendet seine Funktionen nur für die Vorschau. Identische Testfälle laufen auf beiden Seiten (Specs-Unit-Tests und Karma/Vitest).

**API:**
- `GET /api/cellar-room` → `CellarRoomDto(WidthCm, DepthCm, HeightCm, Racks[])`, je Regal `Id, Name, Height, Width, Placement? {X, Z, Rotation}` und kompakte Belegung `Slots[] {Row, Column, Type}` (ohne Weindetails). Ein Aufruf statt N Regalabrufe.
- `PUT /api/cellar-room` (Maße) → 409, wenn ein platziertes Regal danach nicht mehr passt (Meldung nennt das Regal).
- `PUT /api/racks/{id}/placement` `{X, Z, Rotation}` → 400 bei ungültiger Drehung/Zahl, 409 bei außerhalb/Überlappung (Meldung nennt das andere Regal); `DELETE` → entfernt die Platzierung. Fremde Regale → 404 wie bisher.
- `RackService.UpdateAsync` prüft nach Maßänderung die Platzierung (409); `DeleteAsync` braucht nichts Zusätzliches, die Spalten gehören zum Regal.
Parallele Änderungen: letzter Schreiber gewinnt je Regal; Überlappungsprüfung liest im selben Request alle Regale des Benutzers. Ein Rennen zweier gleichzeitiger Platzierungen ist bei einem Einzelbenutzer-Szenario hinnehmbar.

**3D-Darstellung: vereinfachte Regale statt `Rack3d` wiederzuverwenden.** `Rack3d` baut pro Regal ein detailliertes Modell mit Atlas und eigenem Renderer; ein Raum mit vielen Regalen wäre damit zu teuer. Neue Komponente `cellar-room-3d` rendert ein Regal als Rahmen aus Brettern (ein `InstancedMesh` für alle Bretter aller Regale) plus ein `InstancedMesh` pro Weintyp für belegte Fächer (Zylinderscheibe als Flaschenboden mit Typfarbe, die aus den vorhandenen natürlichen Glasfarben des Regalmodells übernommen wird – die Farbtabelle wird dafür aus `rack-3d.ts` in `core/bottle.ts` oder eine kleine Datei gehoben, ohne Verhalten zu ändern). Boden, vier Wände (Wand und Boden als `MeshStandardMaterial`, einfache Beleuchtung wie in `Rack3d`: HemisphereLight, DirectionalLight, RoomEnvironment).
Wände, die zwischen Kamera und Raum liegen, werden pro Frame anhand der Kamerarichtung (Skalarprodukt Wandnormale/Blickrichtung) auf ~12 % Deckkraft gesetzt (`transparent`, `depthWrite=false`); Rückseiten bleiben deckend. Die Szene rendert nur bei Änderung (wie `Rack3d`) und läuft nur während Kamerafahrten/Ziehen im Animationsloop.

**Interaktion:** OrbitControls mit begrenztem Polarwinkel (nicht unter den Boden), Zoom zwischen 1 m und Raumdiagonale × 1,5. Ansicht „Übersicht“ rahmt den Raum über die Boundingsphere. Im Modus „Ansehen“ wählt ein Tipp (Raycast auf unsichtbare Hüllquader pro Regal) ein Regal und fährt die Kamera auf einen Zielpunkt vor der Regalfront (≈ 450 ms, Sprung bei `prefers-reduced-motion`). Im Modus „Anordnen“ sperren OrbitControls während eines Ziehens; der Zeiger wird per Raycast auf die Ebene y = 0 projiziert, die Ziehposition = Zeigerpunkt − Greifversatz, gerastet auf Wände/Regalkanten innerhalb von 10 cm (reine Funktion `snapPosition`), gerundet auf ganze cm. Gültig/ungültig wird per Farbe des Regal-Umrisses (grün/rot) plus Textstatus in einer `aria-live`-Region angezeigt (Farbe allein trägt keine Information). Beim Loslassen: gültig → `PUT placement`; ungültig oder Fehler → Rückkehr zur letzten gespeicherten Position, Fehlermeldung bei Fehlern.

**Zugänglichkeit/Fallback:** Rechts (Handy: unter der Szene) steht immer eine Regalliste (Name, Maße, Position, Drehung, Aktionen „Auswählen/Platzieren/Entfernen/Drehen“, Eingabefelder X/Z in cm) – sie ist gleichzeitig der Fallback ohne WebGL (`WebGLRenderer` schlägt fehl → nur Liste plus Hinweis, wie `can3d()` in `rack-detail`). Pfeiltasten (10 cm, Umschalt 1 cm) wirken auf das ausgewählte Regal, wenn der Szenenfokus aktiv ist; R dreht. Szene: `role="img"` mit `aria-label` (Raummaße, Anzahl Regale).

**„Platzieren“ an die erste freie Stelle:** Rasterschnitt in Schritten von 10 cm über den Raum (zeilenweise von hinten links), die erste gültige Position gewinnt; mit Rotation 0, dann 90°. Reine Funktion mit Test; bei Raumgröße 20 × 20 m und 10-cm-Schritt (40 000 Kandidaten × Regalanzahl) unkritisch.

**Navigation:** Eintrag „Kellerraum“ zwischen „Regale“ und „Entwürfe“ (`section() === 'cellar-room'`). Regaldetailansicht erhält einen Link „Im Kellerraum zeigen“ (nur wenn platziert), der `/cellar-room?rack=<id>` öffnet und das Regal vorauswählt; „Regal öffnen“ führt zu `/racks/:id`.

## Risks / Trade-offs

- **Annahme zur Fachgröße** weicht von echten Regalen ab (z. B. 10 cm oder 14 cm Fächer) → Raummaßstab stimmt dann nur ungefähr. Mitigation: Konstante zentral, Hinweis in der Oberfläche („Fachgröße 12 cm“); späterer Ausbau auf pro-Regal-Maße möglich, die Spalten ließen sich ergänzen.
- **Doppelte Validierungslogik** (C# und TS) kann auseinanderlaufen → identische Testvektoren auf beiden Seiten; Server bleibt maßgeblich.
- **Transparente Wände** sind pro Frame zu aktualisieren; bei nur vier Wänden vernachlässigbar. Sortierproblem bei Transparenz → Wände mit `depthWrite=false` und feste `renderOrder`.
- **Touch-Ziehen vs. Kamera-Bedienung** auf dem Handy: Ziehen nur im Modus „Anordnen“ und nur beginnend auf einem Regal; sonst bedient die Geste die Kamera. Eingabefelder bleiben als sichere Alternative.
- **Regal wächst nicht mehr in den Raum** → Konflikt statt automatischem „nicht platziert“: keine stillen Datenänderungen, dafür eine Hürde beim Bearbeiten; Benutzer kann das Regal zuerst entfernen.

## Migration Plan

EF-Migration `AddCellarRoom` (Tabelle `cellar_rooms`, Spalten `PosX`, `PosZ`, `Rotation` nullable an `racks`). Bestehende Daten bleiben unverändert (alle Regale nicht platziert, Raum Standard). Rückbau: Migration zurücknehmen; keine Datenabhängigkeit anderer Funktionen.

## Open Questions

- Soll die Fachgröße später pro Regal einstellbar sein (z. B. für Flaschenregale mit 10 cm oder Magnum-Fächern)? Vorerst nicht Teil der Änderung.
