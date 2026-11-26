# Proposal

## Why

Nach dem Hinzufügen eines Weins (per Barcode, Foto oder Handeingabe) landet er heute nur „irgendwo“ im Keller und muss in einem zweiten Schritt über die Regalseite von Hand einsortiert werden – Fach für Fach. Das ist mühsam, und ohne System entsteht im Regal schnell Durcheinander. Wer ein Weinregal führt, will die neue Flasche gleich einsortieren können und dabei einen Vorschlag bekommen, der zur bisherigen Ordnung passt (gleiche Region, gleicher Erzeuger, ähnliches Alter), damit der Keller strukturiert bleibt.

## What Changes

- Neu: Nach dem Anlegen eines Weins und nach „Flaschen hinzufügen“ bietet die App direkt **„Einlagern“** an, sofern der Benutzer mindestens ein Regal mit freien Fächern hat. „Später“ überspringt den Schritt; die Flaschen bleiben dann wie bisher nicht eingelagert.
- Neu: Die App macht einen **Einlagerungsvorschlag** für alle neu hinzugekommenen Flaschen: konkrete Fächer (Regal, Reihe, Spalte) und eine kurze Begründung („neben deinen anderen Weinen aus Toskana“). Der Vorschlag richtet sich nach den bereits eingelagerten Weinen: gleicher Wein, gleicher Erzeuger, gleiche Region, gleiches Land, gleicher Typ und ähnlicher Jahrgang bzw. ähnliches Trinkfenster liegen nah beieinander. Mehrere Flaschen desselben Weins liegen zusammen.
- Neu: Der Benutzer kann den Vorschlag **mit einem Tipp übernehmen**, ein anderes Fach von Hand wählen (bestehende Regalansicht im Einlagern-Modus) oder den Schritt zurückstellen.
- Neu: Der Vorschlag steht auch auf der Weinseite für alle nicht eingelagerten Flaschen eines Weins bereit („Einlagerung vorschlagen“).
- Neu: Das Einlagern mehrerer Flaschen geschieht **als eine Aktion** (alles oder nichts), auch über mehrere Regale hinweg.
- Der Vorschlag wird **regelbasiert auf dem Server berechnet** (keine KI, keine Kosten, keine Datenweitergabe, jederzeit nachvollziehbar). Bei unveränderter Belegung ist das Ergebnis immer dasselbe.
- Kein Breaking Change; bestehende Endpunkte zum Einlagern bleiben unverändert.

## Capabilities

### New Capabilities
- `rack-placement-suggestion`: Regelbasierter Einlagerungsvorschlag anhand der vorhandenen Belegung (Region, Erzeuger, Typ, Alter), Übernehmen des Vorschlags für eine oder mehrere Flaschen und der Einlagern-Schritt nach dem Hinzufügen eines Weins.

### Modified Capabilities
<!-- Keine: `wine-racks` bleibt unverändert; das gezielte Einlagern einzelner Flaschen und die Regalansicht werden nur wiederverwendet. -->

## Impact

- **Application**: neuer `PlacementSuggestionService` (Bewertung freier Fächer anhand der Nachbarschaft), neue Verträge (`PlacementSuggestionDto`, `PlaceBottlesRequest`), `RackService` bekommt das gemeinsame Einlagern mehrerer Flaschen in einer Transaktion.
- **Api**: `GET /api/wines/{id}/placement-suggestion?count=n`, `POST /api/racks/placements` (mehrere Fächer in einem Aufruf).
- **Domain/Infrastruktur**: keine Schemaänderung (Region, Land, Erzeuger, Typ, Jahrgang, Trinkfenster sind vorhanden).
- **Frontend**: neuer Einlagern-Schritt nach dem Speichern in `wine-new` und `draft-review`, Aktion auf `wine-detail`, `api.service.ts`, `models.ts`.
- **Tests**: Unit-Tests der Bewertung, SpecFlow-Feature `Einlagerungsvorschlag.feature`, Frontend-Tests des Ablaufs.
- **Berührungspunkte**: `combine-barcode-and-photo-capture` ändert ebenfalls `wine-new`; der Einlagern-Schritt hängt nur am Ergebnis des Speicherns und ist davon unabhängig. `improve-3d-rack-bottles` ändert `RackWineDto`; dieser Change ergänzt nur neue Verträge.
- **Außerhalb des Umfangs**: automatisches Einlagern ohne Bestätigung, Umsortieren bestehender Flaschen („Keller aufräumen“), Temperatur- und Lichtzonen der Regale, KI-gestützte Vorschläge, Vorschlag beim Umlagern.
