# Design

## Context

- Backend in Clean-Architecture-Schichten: `Domain` (Entitäten mit Regeln, `DomainException`), `Application` (Services wie `WineService`/`ArchiveService`, DTOs in `Contracts.cs`, `ConflictException`/`NotFoundException`), `Infrastructure` (EF Core `AppDbContext` auf SQL Server Express), `Api` (Minimal-API-Endpunkte, `ApiExceptionHandler` → 400/404/409).
- Alle Abfragen sind über `ICurrentUser.UserId` auf den Besitzer gefiltert; das Muster `FindOwnedAsync` wirft bei fremden IDs „nicht gefunden“.
- `Wine.Quantity` ist die Flaschenanzahl im Keller; Entnahmen erzeugen `ConsumptionRecord`s, das Rückgängigmachen bucht per `AddBottles` zurück.
- Es gibt **keine EF-Migrationen**: `InitializeDatabaseAsync` ruft `EnsureCreated` auf, das ein bestehendes Schema nicht ändert.
- Tests: `tests/WineCellar.Specs` (Reqnroll, deutschsprachige Features) gegen echte Services und SQLite im Arbeitsspeicher.
- Frontend: Angular-Standalone-Seiten unter `web/src/app/pages`, gemeinsame Dialoge unter `shared/`, API-Zugriff über `core/api.service.ts`.

Anforderungen: siehe `specs/wine-racks/spec.md`.

## Goals / Non-Goals

**Goals:**
- Regale und Fachbelegung serverseitig konsistent halten (ein Fach = höchstens eine Flasche, eingelagert ≤ Flaschenanzahl), auch bei parallelen Anfragen.
- Bestehende Entnahme-, Bearbeiten- und Lösch-Abläufe so erweitern, dass Fächer korrekt freigegeben werden.
- Einfaches Raster im Frontend, das auch auf dem Handy (Capacitor) bedienbar ist.

**Non-Goals:**
- Unterschiedliche Fachgrößen, Doppelbelegung, Magnumfächer oder Regale ohne Rasterstruktur.
- Drag & Drop im Raster (Umlagern geht über Auswahl Quelle → Ziel).
- Automatisches Vorschlagen von Plätzen oder Regal-Fotos.
- Realistische 3D-Darstellung (Etiketten, unterschiedliche Flaschenformen, Schatten, nachgebaute Regalmaterialien) und Umlagern per Ziehen im 3D-Regal.
- Übernahme vorhandener Freitext-Lagerorte (in der Datenbank sind keine gespeichert).

## Decisions

### D1: Belegung als eigene Tabelle pro Fach (`rack_slots`), nicht als Liste am Wein
Eine Zeile pro belegtem Fach: `Id`, `RackId`, `Row`, `Column`, `WineId`, `OwnerId`. Freie Fächer werden nicht gespeichert.
- Eindeutiger Index auf (`RackId`, `Row`, `Column`) garantiert „ein Fach = eine Flasche“ auch bei Race Conditions; eine Verletzung beim Speichern (`DbUpdateException`) wird in eine `ConflictException` übersetzt.
- *Alternative*: Raster als JSON am Regal speichern → einfacher zu lesen, aber keine Datenbank-Garantie für Eindeutigkeit und keine Abfrage „wo liegt Wein X“. Verworfen.
- *Alternative*: Zeile pro Fach inklusive freier Fächer → Vergrößern/Verkleinern müsste Zeilen anlegen/löschen. Verworfen.

### D2: Neue Entitäten `Rack` und `RackSlot` in der Domain
- `Rack` (`Id`, `OwnerId`, `Name`, `Height`, `Width`, `CreatedAt`) mit `EnsureValid()` (Name nicht leer, ≤ 100 Zeichen, Maße 1–50) und `Capacity => Height * Width`. `Contains(row, column)` prüft die Grenzen.
- `RackSlot` ist eine reine Belegungszeile; Regeln, die mehrere Aggregate betreffen (Anzahl eingelagert ≤ `Wine.Quantity`), prüft der Application-Service.
- Obergrenze 50 × 50: verhindert versehentlich riesige Raster, deckt reale Regale ab.

### D3: Neuer `RackService` im Application-Layer
Methoden: `ListAsync`, `GetAsync` (Raster inkl. belegter Fächer mit Wein-Kurzinfo), `CreateAsync`, `UpdateAsync` (Name/Maße; prüft, ob belegte Fächer außerhalb lägen), `DeleteAsync`, `PlaceAsync(rackId, row, column, wineId)`, `MoveAsync(slotId, targetRackId, row, column)`, `RemoveAsync(slotId)`, `ConsumeFromSlotAsync(slotId, ConsumeRequest)`.
- `ConsumeFromSlotAsync` ruft dieselbe Domänenlogik `Wine.Consume` wie `WineService` auf und entfernt den Slot in derselben `SaveChanges`-Transaktion.
- Eindeutige Namen: Prüfung im Service (normalisiert: `Trim().ToLower()`) plus eindeutiger Index auf (`OwnerId`, `Name`) als Absicherung.

### D4: Änderungen an `WineService` und `ArchiveService`
- `ConsumeAsync`: berechnet `nichtEingelagert = Quantity - AnzahlSlots`. Benötigt die Entnahme mehr, werden die überzähligen Slots des Weins sortiert nach Regalname, Reihe, Spalte entfernt. Die Antwort (`ArchiveEntryDto`) bekommt ein zusätzliches Feld `FreedSlots` (Liste aus Regalname/Reihe/Spalte), damit das Frontend „Bitte Flasche aus … nehmen“ anzeigen kann.
- `UpdateAsync`: lehnt `Quantity < AnzahlSlots` mit `DomainException` ab.
- `DeleteAsync` (Wein): Slots werden per Cascade (FK `RackSlot.WineId` → `Wine`, `OnDelete Cascade`) gelöscht.
- `ArchiveService.DeleteAsync` bleibt unverändert: `AddBottles` bucht zurück, ohne Slot → Flaschen sind nicht eingelagert.
- `WineDto` erhält `Slots` (Regal-ID, Regalname, Reihe, Spalte, Slot-ID) und `UnplacedCount`; `StorageLocation` entfällt aus `Wine`, `WineDto`, `SaveWineRequest`, `Mapping`, `AppDbContext`.

### D5: Löschen eines Regals
FK `RackSlot.RackId` → `Rack` mit `OnDelete ClientCascade`: `RackService.DeleteAsync` lädt die Slots und EF löscht sie mit dem Regal. Eine Datenbank-Cascade ginge nicht, weil SQL Server dann zwei Cascade-Pfade zu `rack_slots` hätte (Benutzer → Wein → Slot und Benutzer → Regal → Slot). Die Weine bleiben unberührt, ihre Flaschen gelten danach automatisch als nicht eingelagert, weil sich „eingelagert“ nur aus Slots berechnet. Aus demselben Grund bekommt `RackSlot.OwnerId` **keinen** FK zu `AppUser` (nur Index); die Slots eines Benutzers verschwinden über die Wein-Cascade.

### D6: API unter `/api/racks`
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/racks` | Übersicht mit Kapazität/belegt/frei |
| GET | `/api/racks/{id}` | Raster mit belegten Fächern |
| POST | `/api/racks` | Anlegen |
| PUT | `/api/racks/{id}` | Name/Maße ändern |
| DELETE | `/api/racks/{id}` | Löschen |
| POST | `/api/racks/{id}/slots` | Flasche einlagern (`wineId`, `row`, `column`) |
| PUT | `/api/racks/slots/{slotId}` | Umlagern (`rackId`, `row`, `column`) |
| DELETE | `/api/racks/slots/{slotId}` | Auslagern |
| POST | `/api/racks/slots/{slotId}/consume` | Aus Fach trinken/verkaufen/verschenken |

Fehler über das bestehende `ApiExceptionHandler`-Mapping (400/404/409).

### D7: Datenbankschema per EF-Migration
Da `EnsureCreated` bestehende Datenbanken nicht ändert, wird mit dieser Änderung die erste Migration eingeführt: zuerst `Initial` für das aktuelle Schema, danach `AddWineRacks` (neue Tabellen, Spalte `StorageLocation` entfernen). `InitializeDatabaseAsync` nutzt dann automatisch `Migrate`.
- Stand bei der Umsetzung: `Initial`, `AddWineOrigins` und `AddGrapeVarieties` existieren bereits, die lokale Datenbank hat eine `__EFMigrationsHistory`. `AddWineRacks` wird deshalb beim Start einfach eingespielt; die Datenbank wird **nicht** neu erzeugt. Vor dem Entfernen von `StorageLocation` wurde geprüft, dass keine Werte gespeichert sind.
- *Alternative*: weiter `EnsureCreated` und Datenbank bei jeder Schemaänderung löschen → nicht tragfähig, sobald echte Daten existieren. Verworfen.

### D8: Frontend
- Neue Seiten `racks` (Liste + „Regal anlegen“-Dialog mit Name/Höhe/Breite) und `rack-detail`. `rack-detail` hat einen Umschalter „Raster | 3D“ (Standard Raster; 3D ist eine optionale zweite Ansicht, siehe D9). Die Ansicht „Raster“ ist ein CSS-Grid mit `grid-template-columns: repeat(width, …)` und Reihen-/Spaltennummern.
- Fach-Aktionen in beiden Ansichten über dasselbe Aktionsmenü: einlagern (Weinauswahl aus Kellerweinen mit nicht eingelagerten Flaschen), umlagern, auslagern, trinken/verkaufen/verschenken über den bestehenden `consume-dialog`. In 3D erreicht man ein Fach über das Reihen-Panel, im Raster direkt.
- Navigation: neuer Eintrag „Regale“ neben Keller und Archiv.
- Kellerliste (`cellar`) bleibt die Hauptansicht des Kellers und ändert sich funktional nicht. Sie bekommt nur eine Schaltfläche „In 3D ansehen“.
  - Die Schaltfläche führt zu `rack-detail` mit dem zuletzt geöffneten Regal in der Ansicht 3D, etwa `/racks/{id}?view=3d&from=cellar`. Die Regal-ID merkt sich das Frontend lokal in `Preferences`. Ohne gemerktes oder bei gelöschtem Regal nimmt es das erste nach Name.
  - Oben in `rack-detail` wechselt eine Regalauswahl zu den anderen Regalen.
  - „Zurück zur Liste“ führt zur Kellerliste zurück. Dafür hält `cellar` Suche und Filter in den Query-Parametern der URL, damit sie beim Zurückkehren erhalten bleiben.
  - Ohne Regal zeigt die Schaltfläche einen Hinweis mit „Regal anlegen“.
- Wein-Detail: Abschnitt „Lagerplätze“ mit Fächern und „n nicht eingelagert“, Button „Einlagern“.
- Nach einer Entnahme mit `freedSlots` zeigt ein Toast, aus welchen Fächern die Flaschen zu nehmen sind.
- Feld „Lagerort“ aus `wine-form` und `wine-detail` sowie `storageLocation` aus `models.ts` entfernen.

### D9: 3D-Regal mit Three.js
- **Bibliothek:** `three` als Frontend-Abhängigkeit. Die 3D-Komponente `rack-3d` wird per dynamischem `import()` nur auf `rack-detail` geladen, damit der Start der App nicht langsamer wird.
- **Flaschenmodell im Code statt Datei:** Die Bordeaux-Flasche entsteht als `LatheGeometry` aus einem Umriss: gerader Körper, hohe ausgeprägte Schultern, kurzer Hals, Kapsel. Es gibt kein heruntergeladenes Modell, also keine Lizenzfrage, kein Nachladen und nur ein paar hundert Bytes. Wer später ein echtes glTF-Modell will, tauscht nur die Geometrie.
- **Szene:**
  - Das Regal besteht aus einfachen Boxen (Böden und Trennwände) mit einem Fach je Reihe/Spalte.
  - Die Flaschen liegen mit dem Hals nach vorne (+Z). Reihe 1 ist oben, Spalte 1 links, wie im Raster.
  - Beleuchtung: Umgebungs- und Richtungslicht, keine Schatten.
- **Leistung:**
  - Ein `InstancedMesh` für alle Flaschen (bis 50 × 50 = 2500 Instanzen in einem Zeichenaufruf). Die Farbe kommt per `setColorAt` aus einer festen Tabelle je `WineType`.
  - Ein zweites `InstancedMesh` aus unsichtbaren Fach-Boxen dient als Trefferfläche für freie Fächer.
  - `renderer.setPixelRatio(min(devicePixelRatio, 2))`.
  - Gerendert wird nur bei Änderungen (Kamera, Auswahl, Daten), nicht in einer Dauerschleife.
- **Bedienung:**
  - `OrbitControls` mit begrenztem Drehwinkel (etwa ±60° horizontal, ±30° vertikal), Zoom-Grenzen und ausgeschaltetem Verschieben.
  - „Ansicht zurücksetzen“ stellt die berechnete Startkamera wieder her: von vorne, ganzes Regal sichtbar.
- **Reihe antippen:**
  - Ein `Raycaster` trifft Flasche oder Fach-Box. Die `instanceId` wird über eine reine Funktion `slotIndex → {row, column}` aufgelöst, die unit-testbar ist.
  - Ein Tippen zählt nur, wenn sich der Zeiger kaum bewegt hat. Drehen löst also keine Auswahl aus.
  - Die gewählte Reihe wird durch Aufhellen der Instanzfarben und eine Markierung am Regalboden hervorgehoben.
  - Das Reihen-Panel ist auf dem Handy ein Bottom Sheet, auf dem Desktop eine Seitenleiste. Es listet alle Spalten der Reihe und öffnet beim Antippen das gemeinsame Aktionsmenü aus D8.
- **Daten:** Die 3D-Komponente bekommt dieselbe `RackDto` wie das Raster und braucht keine neuen API-Endpunkte. Nach jeder Fach-Aktion aktualisiert sie nur die Instanzen.
- **Rückfall und Barrierefreiheit:**
  - Vor dem Laden von `three` prüft `rack-detail` mit einem Test-Canvas, ob WebGL verfügbar ist. Wenn nicht, ist „3D“ im Umschalter und „In 3D ansehen“ in der Kellerliste mit Hinweis deaktiviert. Kommt man per Link mit `view=3d` auf die Seite, zeigt sie das Raster.
  - Bei `webglcontextlost` während der Nutzung wechselt die Seite zum Raster.
  - Neben dem Canvas gibt es eine per Tastatur bedienbare Reihenliste („Reihe 1 … n“). Sie öffnet dasselbe Reihen-Panel, das Canvas selbst ist für Screenreader `aria-hidden`.
- *Alternative*: CSS-3D-Transforms statt WebGL → keine Bibliothek, aber bei 2500 Flaschen zu langsam und ohne glaubwürdige Flaschenform. Verworfen.
- *Alternative*: fertiges glTF-Modell einer Bordeaux-Flasche → schöner, aber mehr Aufwand für Lizenz, Größe und Laden. Für jetzt verworfen, später austauschbar.

## Risks / Trade-offs

- [Gleichzeitiges Einlagern ins selbe Fach] → eindeutiger DB-Index + Übersetzung in 409.
- [Gleichzeitiges Einlagern mehrerer Flaschen desselben Weins über `Quantity` hinaus] → Prüfung im Service ist nicht atomar; bei einer Ein-Benutzer-App akzeptabel. Absicherung: Zähler wird innerhalb derselben `SaveChanges` erneut geprüft; Restrisiko dokumentiert.
- [Automatische Fachfreigabe bei Entnahme ohne Fachangabe wählt evtl. nicht die physisch entnommene Flasche] → Antwort nennt die freigegebenen Fächer; im UI wird empfohlen, aus der Regalansicht zu entnehmen.
- [Breaking Change am API-Vertrag (`storageLocation` entfällt)] → Frontend und Backend werden gemeinsam geändert; es gibt keine weiteren Clients.
- [Neu-Erzeugen der lokalen Datenbank löscht Testdaten] → betrifft nur Entwicklungsdaten (1 Benutzer, 1 Testflasche); werden danach neu angelegt.
- [Großes Raster (50 × 50) auf dem Handy] → Raster horizontal scrollbar, Fächer mit Mindestgröße.
- [3D-Leistung auf älteren Handys] → Instancing, keine Schatten, begrenzte Pixeldichte, Rendern nur bei Änderungen; notfalls Ansicht „Raster“.
- [Größere App durch `three`] → Laden nur auf der Regalseite (eigener Lazy-Chunk), nur benötigte Module importieren.
- [WebGL in der Capacitor-WebView fehlt oder geht verloren] → 3D-Option deaktiviert bzw. Wechsel zum Raster; Kellerliste und Raster sind davon nie betroffen.
- [Tippen auf einzelne Fächer in großen Regalen ist auf dem Handy fummelig] → Auswahl wirkt auf die ganze Reihe; Zoom erlaubt.

## Migration Plan

1. EF-Tools bereitstellen (`dotnet tool install dotnet-ef` als lokales Tool) und Migration `Initial` für den aktuellen Stand erzeugen.
2. Domain/Infrastructure ändern und Migration `AddWineRacks` erzeugen.
3. Beim nächsten Start der API spielt `Migrate` `AddWineRacks` in die bestehende Datenbank ein (keine Neuanlage nötig, vorhandene Weine bleiben erhalten).
4. Rollback: Migration `AddWineRacks` per `dotnet ef database update Initial` zurücknehmen und Code-Änderungen zurücksetzen.
