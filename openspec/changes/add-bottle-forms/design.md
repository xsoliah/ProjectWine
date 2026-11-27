# Design

## Context

Beobachtet im Code:
- `web/src/app/core/bottle.ts`: Ein einziges Wandprofil `STANDARD_WALL` (Bordeaux, Länge 2,9, Radius 0,36). `standardShape(type)` skaliert für Schaumwein nur den Radius mit 1,12 – deshalb wirkt er komisch (Bordeaux-Schultern, kurze Kapsel). `bottleScale(ml)` = ∛(ml/750), begrenzt auf 0,6–1,6, existiert bereits.
- `shared/bottle-3d.ts` (Einzelansicht): Länge = `BOTTLE_LENGTH * bottleScale`, aber `fitCamera` passt die Kamera auf genau diese Länge an. Dadurch füllt auch eine Halbflasche das Bild und sieht „normal“ aus. Kapsel: feste 15,5 % der Länge.
- `shared/rack-3d.ts` (Regal): Eine Geometrie `bordeauxBottle()` in einem `InstancedMesh` für alle Weine, keine Skalierung je Wein, keine Form.
- Backend: `BottleShape.Standard(type)` (Bottle.cs) spiegelt die Webzahlen; `BottleAnalyzer`/`CaptureProcessor` nutzen sie als Rückfall. `Wine.BottleSizeMl` existiert; der Profilradius ist validiert auf 0,02–0,35 der Flaschenlänge.

## Goals / Non-Goals

**Goals:** mehrere Formen mit eigenem Profil und eigener Kapsel; Form am Wein (optional, sonst nach Typ); Halbflasche/Magnum sichtbar kleiner/größer in Einzelansicht und Regal.

**Non-Goals:** Formerkennung per Foto, weitere Formen, Änderung der Fachgröße, 2D-Darstellungen.

## Decisions

1. **Form als Enum `BottleForm { Bordeaux, Burgundy, Champagne, Flute }`, am Wein nullable.** `null` = automatisch (Schaumwein → Champagne, sonst Bordeaux). Alternative „Form aus Typ, Region und Rebsorte ableiten“ verworfen: unzuverlässig und nicht korrigierbar. Speicherung wie die anderen Enums im Projekt; EF-Migration mit nullable Spalte, alte Weine bleiben `null`.
2. **Profile als Tabelle je Form, auf Web- und Serverseite identisch** (wie bisher bei Bordeaux; die Zahlen bleiben doppelt, weil `Standard` serverseitig die Rückfallform im Entwurf liefert). Zahlen sind Näherungen und werden per Sichtprüfung nachgezogen: Burgunder Radius ≈ 0,37 mit sanfter Schulter ab ≈ 1,6; Champagner Radius ≈ 0,42, Schulter ab ≈ 1,5, langer konischer Hals, Mündungsring; Schlegel Radius ≈ 0,31, Schulter bei ≈ 1,7, langer Hals. Alle Radien bleiben innerhalb der bestehenden Validierung (≤ 0,35 relativ zur Länge). `STANDARD_WALL` bleibt für Bordeaux erhalten.
3. **Kapsel je Form:** Länge und Starthöhe gehören zur Formdefinition (Bordeaux 15,5 %, Burgunder ≈ 17 %, Champagner ≈ 26 % mit etwas größerem Radius, Schlegel ≈ 16 %).
4. **Größenfaktor:** Wiederverwendung von `bottleScale`. Einzelansicht: `fitCamera` nutzt `max(Referenzlänge, aktuelle Länge)` – Normal und kleiner behalten dieselbe Kamera, die Magnum entfernt sie passend. So erscheint die Halbflasche (Faktor ≈ 0,79) kleiner bei unverändertem Zoombereich.
5. **Regal:** Je Form ein `InstancedMesh` (vier Geometrien, geteilte Materialien) statt eines; die Instanzmatrix trägt den Größenfaktor, begrenzt auf das Fach (Länge ≤ Fachtiefe, Radius ≤ Fachbreite/2). Kapseln und Etiketten bekommen dieselbe Skalierung und die Formkapsel. Skaliert wird um die Auflage unten im Fach, nicht um die Mitte, sonst schweben Halbflaschen.
6. **Standardform im Backend:** `BottleShape.Standard(type, form?)` löst die Form selbst auf (`form ?? (type == Sparkling ? Champagne : Bordeaux)`); die bisherige 1,12-Skalierung entfällt.
7. **API:** `bottleForm` als optionales Feld in Wein-DTOs und Anlegen/Ändern; ein fehlender Wert ändert nichts, unbekannte Werte führen zu einem Validierungsfehler wie bei anderen Enums.

## Risks / Trade-offs

- Profilzahlen sind geschätzt; die Sichtprüfung ist Teil der Aufgaben, Nachjustieren ist erwartet.
- ∛(ml/750) macht Halbflaschen nur ≈ 21 % kürzer; das entspricht echten Flaschen (Halbflasche ≈ 0,85× Höhe). Soll der Unterschied deutlicher sein, ist das ein Exponent in `bottleScale`.
- Mehrere `InstancedMesh`: Aufbau und Trefferprüfung im Regal müssen je Form verwaltet werden; Tests für die Zuordnung Instanz ↔ Fach decken das ab.
- Dieselben Profilzahlen an zwei Orten (Web/Server); Unit-Tests auf beiden Seiten prüfen dieselben Eckwerte.

## Assumptions

- Die Formen Bordeaux, Burgunder, Champagner und Schlegel genügen; weitere kommen später.
- Die Automatik richtet sich nur nach dem Weintyp; Erkennung aus dem Foto ist nicht Teil.
- Die Regalansicht gehört zum Wunsch („Halbflaschen sollten kleiner aussehen“).
