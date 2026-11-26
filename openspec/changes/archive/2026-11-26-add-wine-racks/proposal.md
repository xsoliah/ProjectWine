# Proposal

## Why

Der Lagerort eines Weins ist heute nur ein Freitextfeld („Lagerort“). Damit lässt sich weder sehen, wie voll ein Weinregal ist, noch wo genau eine bestimmte Flasche liegt. Weinsammler organisieren ihre Flaschen aber in Regalen mit festen Fächern (z. B. 5 Reihen hoch × 6 Spalten breit = 30 Plätze). Die App soll diese Regale abbilden, damit man freie Plätze findet und eine Flasche gezielt wiederfindet.

## What Changes

- Neu: Benutzer können eigene Weinregale anlegen, umbenennen, in der Größe ändern und löschen. Ein Regal hat einen Namen, eine Höhe (Anzahl Reihen) und eine Breite (Anzahl Spalten); die Kapazität ist Höhe × Breite.
- Neu: Jede Flasche eines Weins kann in genau ein Fach (Reihe/Spalte) eines Regals gelegt werden. Ein Fach fasst genau eine Flasche.
- Neu: Regalansicht als 2D-Raster (Standard), das belegte und freie Fächer und den Wein in jedem Fach zeigt.
- Neu: 3D-Regalansicht als zusätzliche, optionale Ansicht, erreichbar aus dem Regal und über „In 3D ansehen“ in der Kellerliste. Sie nutzt ein einheitliches Modell einer Bordeaux-Flasche (Farbe nach Weintyp), und das Antippen einer Reihe zeigt, welche Weine darin liegen.
- Unverändert: Die Kellerliste mit Suche und Filtern bleibt die Hauptansicht des Kellers; die 3D-Ansicht ersetzt sie nicht.
- Neu: Flaschen können zwischen Fächern und Regalen umgelagert und aus einem Fach heraus getrunken, verkauft oder verschenkt werden.
- Geändert: Beim Trinken/Verkaufen/Verschenken werden die betroffenen Fächer frei.
- **BREAKING**: Das Freitextfeld `StorageLocation` („Lagerort“) am Wein entfällt in API (`WineDto`, `SaveWineRequest`), Datenbank und Oberfläche. Der Lagerort ergibt sich nur noch aus der Regalbelegung. Vorhandene Freitextwerte werden nicht übernommen (aktuell sind keine gespeichert).

## Capabilities

### New Capabilities
- `wine-racks`: Verwaltung der Weinregale eines Benutzers (Name, Höhe, Breite, Kapazität) und Belegung ihrer Fächer mit Flaschen aus dem Keller, inklusive Umlagern, Entnehmen und Anzeige als Raster.

### Modified Capabilities
<!-- Es gibt noch keine Spezifikationen unter openspec/specs/; das Entfernen des Freitext-Lagerorts wird in der neuen Capability beschrieben. -->

## Impact

- **Domain** (`WineCellar.Domain`): neue Entitäten für Regal und Fachbelegung; `Wine.StorageLocation` entfällt.
- **Application** (`WineCellar.Application`): neuer `RackService`, neue DTOs/Requests; `WineService.ConsumeAsync` und Wein-Löschen müssen Fächer freigeben; `StorageLocation` aus `WineDto`/`SaveWineRequest`/`Mapping` entfernen.
- **Infrastructure**: neue Tabellen `racks` und `rack_slots`, Spalte `wines.StorageLocation` entfällt. Da das Projekt noch keine EF-Migrationen hat (Schema wird per `EnsureCreated` erzeugt), muss eine Migration eingeführt oder die lokale Datenbank neu erzeugt werden.
- **API** (`WineCellar.Api`): neue Endpunkte unter `/api/racks`.
- **Frontend** (`web/`): neue Abhängigkeit `three` (nur auf der Regalseite nachgeladen), neue Seiten für Regalliste und Regalansicht (Raster, optional 3D), Schaltfläche „In 3D ansehen“ in der Kellerliste, Fach-Auswahl auf der Wein-Detailseite; Feld „Lagerort“ in Formular und Detailansicht entfällt.
- **Tests** (`tests/WineCellar.Specs`): neues Feature `Weinregale.feature` mit Step-Definitionen.
