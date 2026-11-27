# Tasks

## 1. Domäne und Datenbank

- [x] 1.1 In `WineCellar.Domain` Entität `CellarRoom` (Maße in cm, Grenzen 100–2000 / 150–500, Standardwerte 400/300/250) und an `Rack` die nullable Felder `PosX`, `PosZ`, `Rotation` samt Methoden `Place`, `ClearPlacement` und der Grundflächenberechnung (Fachgröße 12 cm, Tiefe 38 cm) anlegen; reine Prüffunktion für „im Raum“ und „überlappt (Berührung erlaubt)“; Unit-Tests mit den Zahlen aus der Spec (Überlappung 50/10 abgelehnt, 72/0 angenommen, Drehung vertauscht Maße)
- [x] 1.2 `AppDbContext` um `CellarRoom` erweitern (FK auf `AppUser`, Cascade) und die Rack-Spalten abbilden; Migration `AddCellarRoom` erzeugen und gegen die Datenbank prüfen (bestehende Regale bleiben nicht platziert)

## 2. Anwendungsschicht und API

- [x] 2.1 DTOs (`CellarRoomDto`, `RoomRackDto` mit Platzierung und kompakter Belegung, `SaveCellarRoomRequest`, `PlaceRackRequest`) in `Contracts.cs` und `CellarRoomService` mit Abruf (Standardmaße ohne Datensatz), Maße speichern (Konflikt, wenn ein platziertes Regal danach nicht passt, mit Regalname) sowie Platzierung setzen/entfernen (400 ungültige Drehung/Zahl, 409 außerhalb/Überlappung mit Name des anderen Regals, 404 für fremde Regale) umsetzen
- [x] 2.2 `RackService.UpdateAsync` prüft nach Höhen-/Breitenänderung die Platzierung (Konflikt, Maße unverändert); Endpunkte `GET/PUT /api/cellar-room`, `PUT/DELETE /api/racks/{id}/placement` in `RackEndpoints`/neuer `CellarRoomEndpoints` registrieren und in `DependencyInjection` eintragen
- [x] 2.3 Specs-Feature `Kellerraum.feature` mit Steps (Standardraum, Maße ändern/ungültig/würde Regale ausschließen, Regal setzen/außerhalb/Überlappung/Berührung/Drehung/entfernen, Regal verbreitern, Regal löschen, Privatsphäre zweier Benutzer) und alle Szenarien grün

## 3. Frontend: Geometrie und Daten

- [x] 3.1 `web/src/app/core/cellar-room.ts` mit Modellen, API-Aufrufen in `ApiService` sowie reinen Funktionen `footprint`, `isValid`, `snapPosition` (Einrasten ≤ 10 cm an Wänden und Regalkanten), `rotateAround`, `firstFreeSpot`; dazu `cellar-room.spec.ts` mit denselben Testvektoren wie die C#-Tests (inkl. Berührung erlaubt, Drehung um die Mitte, keine freie Stelle)
- [x] 3.2 Weintyp-Glasfarben für den Raum nutzen (`GLASS_BY_TYPE` liegt bereits gemeinsam in `rack-3d-look.ts`, kein Verschieben nötig)

## 4. Frontend: 3D-Szene

- [x] 4.1 Komponente `cellar-room-3d` mit Szene (Boden, vier Wände, Licht), Regalen als gebündelte `InstancedMesh`-Bretter, belegten Fächern als Flaschenböden nach Weintyp, OrbitControls mit Begrenzung und Zoomgrenzen, „Ansicht zurücksetzen“ (Übersicht über Boundingsphere), Rendern nur bei Änderung, Aufräumen von Geometrien/Materialien/Kontext; im Browser prüfen, dass Raum und zwei Regale maßstäblich stehen
- [x] 4.2 Wände zwischen Kamera und Raum durchscheinend schalten (Skalarprodukt Blickrichtung/Wandnormale, `depthWrite=false`, feste `renderOrder`); im Browser von allen Seiten prüfen, dass die Regale sichtbar bleiben
- [x] 4.3 Auswahl per Tipp (Raycast auf Hüllquader), Hervorhebung, weiche Kamerafahrt zur Regalfront (≈ 450 ms, innerhalb des Raums), Auswahl aufheben per leerer Fläche/Escape, `prefers-reduced-motion` (Sprung); im Browser prüfen
- [x] 4.4 Modus „Anordnen“: Ziehen über Raycast auf die Bodenebene mit Greifversatz, Einrasten, grüner/roter Umriss plus Statustext in `aria-live`, OrbitControls während des Ziehens sperren, Rückkehr zur letzten gültigen Position bei ungültigem Loslassen; im Browser mit Maus und per Touch-Emulation prüfen

## 5. Frontend: Seite „Kellerraum“

- [x] 5.1 Seite `cellar-room` mit Laden/Fehlerzustand, Umschalter „Ansehen“/„Anordnen“, Formular für Raummaße (Meter, Validierung, Konfliktmeldung des Servers), leerem Zustand mit Verweis auf „Regale“, Route `/cellar-room` in `app.routes.ts` und Navigationseintrag „Kellerraum“ in `app.html`
- [x] 5.2 Regalliste (immer sichtbar; Handy unter der Szene) mit Name, Maßen, Position/Drehung bzw. „nicht platziert“, Aktionen „Auswählen“, „Platzieren“ (erste freie Stelle, Hinweis wenn kein Platz), „Drehen“, „Entfernen“ und Eingabefeldern X/Z in cm; Speichern mit Rückkehr zur gespeicherten Stellung und Fehlermeldung bei Fehlschlag
- [x] 5.3 Infoleiste für das ausgewählte Regal (Name, Reihen × Spalten, belegt/frei, „Regal öffnen“); in `rack-detail` den Link „Im Kellerraum“ (immer sichtbar, `?rack=<id>` wählt das Regal vor); Link „Kellerraum“ auch auf der Regale-Seite, da der Navigationseintrag auf dem Handy nur auf der Seite selbst erscheint
- [x] 5.4 Zugänglichkeit und Fallback: Pfeiltasten (10 cm, Umschalt 1 cm) und R zum Drehen im Szenenfokus, `role="img"` mit Beschriftung, Hinweis „3D nicht verfügbar“ mit vollständig bedienbarer Liste, Wechsel zur Liste bei Verlust des Grafikkontexts; per Tastatur komplett durchbedienen und prüfen

## 6. Abschluss

- [x] 6.1 Gesamttest: `dotnet test`, Frontend-Tests und `ng build`; im Browser Raum mit mindestens 3 Regalen auf Desktop- und Handybreite durchspielen (anlegen, platzieren, ziehen, drehen, entfernen, Regal öffnen, Seite neu laden) (Frame-Rate mit ~10 Regalen wurde nicht gemessen; Ziehen und Tastatur wurden mit simulierten Zeigerereignissen geprüft, nicht mit echter Maus/Touch)
