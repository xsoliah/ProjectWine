# Proposal

## Why

Die 3D-Darstellung kennt bisher nur eine Flaschenform: die Bordeaux-Flasche. Schaumweine sehen damit unpassend aus (nur etwas breiter skaliert, aber mit Bordeaux-Schultern und -Hals). Außerdem bleibt eine Halbflasche in der Einzelansicht optisch gleich groß wie eine normale, weil die Kamera immer auf die Flasche einpasst, und im 3D-Regal sind alle Flaschen gleich groß.

## What Changes

- Neue **Flaschenformen**: Bordeaux (Standard), Burgunder, Champagner/Schaumwein und Schlegel (schlanke Flöte, z. B. Riesling/Mosel). Jede Form hat ein eigenes Profil (Schulter, Hals, Boden) und eine passende Kapsel (bei Schaumwein deutlich längere Folie über dem Hals).
- Ein Wein hat eine optionale **Flaschenform**. Ohne Angabe richtet sie sich nach dem Weintyp: Schaumwein → Champagner, sonst Bordeaux. Der Benutzer kann sie im Weinformular ändern.
- Ein gemessenes Flaschenmaß (aus dem Foto erkannt oder angepasst) behält Vorrang; die Form bestimmt nur die Standardflasche und den Rückfall.
- **Größenrichtige Darstellung**: Die Höhe einer Flasche folgt der Flaschengröße (Halbflasche kleiner, Magnum größer als 0,75 l) – in der Einzelansicht (Kamera passt sich an die Normalflasche an, nicht an die jeweilige Flasche) und im 3D-Regal (Flaschen pro Fach skaliert, innerhalb des Fachs).
- Kellerliste, Archiv und Pivot bleiben unverändert; die Flaschenform erscheint als zusätzliches, optionales Feld in Detail und Formular.

## Capabilities

### New Capabilities
- `bottle-forms`: Flaschenformen, ihre Wahl am Wein und die größenrichtige Darstellung in Einzelansicht und 3D-Regal.

### Modified Capabilities
<!-- Keine. Die Anforderung „3D-Ansicht des Regals“ (wine-racks, „dasselbe Modell einer Bordeaux-Flasche“) und der offene Change add-bottle-3d-view (Standardflasche nach Weintyp und Flaschengröße) werden durch bottle-forms präzisiert; beim Archivieren ist der Satz „Alle Weine verwenden dasselbe Modell“ in wine-racks anzupassen. -->

## Impact

- **Backend**: `Wine` (neues optionales Feld `BottleForm`), EF-Migration, Contracts/Mapping, `BottleShape.Standard(type, form)`, `BottleAnalyzer`/`CaptureProcessor` (Rückfall nach Form); Validierung des Enums.
- **Frontend**: `core/bottle.ts` (Formen, Standardprofil, Kapsellänge, Größenfaktor), `shared/bottle-3d.ts` (Kamera auf Referenzgröße), `shared/rack-3d.ts` (Geometrie je Form, Skalierung je Flaschengröße), `models.ts`, `wine-form` (Auswahl), `wine-detail` (Anzeige), ggf. `bottle-shape-editor`.
- **Tests**: Unit-Tests für Formprofile, Standardform nach Weintyp und Größenfaktor; Specs/Features für Speichern der Form; Sichtprüfung im Browser.
- **Abhängigkeit**: baut auf `add-bottle-3d-view` auf (Komponente `bottle-3d`, Flaschenmaß).
- **Nicht Teil**: Automatische Erkennung der Form aus dem Foto, weitere Formen (Bocksbeutel, Portwein), Änderungen an Regalabmessungen oder Kellerliste.
