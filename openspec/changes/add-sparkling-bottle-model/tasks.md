# Tasks

## 1. Modell

- [x] 1.1 In `core/bottle.ts` das Champagner-Wandprofil um einen Punt (Eindellung am Boden), kräftigeren Mündungswulst und passende Folien-Maße ergänzen; Rückfall und Etikettrechnung (`standardShape`, `labelFrame`) bleiben gültig
- [x] 1.2 Neue Datei `shared/sparkling-bottle.ts`: erzeugt Folie (gerillt), Drahtkorb (Ring, Schlaufen, Plättchen) und Korkkopf als Geometrien aus den Formmaßen; nur für Champagner, sonst keine Teile
- [x] 1.3 Unit-Tests für Maße (Wulst über Hals, Drahtkorb im Folienbereich, Etikett nicht überlappt, andere Formen ohne Teile)

## 2. Einzelansicht

- [x] 2.1 `shared/bottle-3d.ts`: für Champagner Folie, Drahtkorb und Kork statt des Zylinders einsetzen, Materialien für Metall und Kork ergänzen, Geometrien beim Neuaufbau und Verlassen freigeben
- [x] 2.2 Mit gemessenem Flaschenprofil prüfen, dass der Körper dem Profil folgt und die Teile am Hals sitzen

## 3. Regal

- [x] 3.1 `shared/rack-3d.ts`: für die Form Champagner zusätzliche `InstancedMesh`-Sätze für Folie, Drahtkorb und Kork; gleiche Matrix wie der Körper (`placeSlot`), Zähler, Dispose und Frustum-Culling wie bei den vorhandenen Meshes
- [ ] 3.2 Prüfen: gemischtes Regal, Herausziehen der Reihe, Antippen, Magnum bleibt im Fach

## 4. Prüfung

- [x] 4.1 Bestehende Tests (`bottle.spec.ts`, `rack-3d-look.spec.ts` u. a.) und Web-Build ausführen
- [ ] 4.2 Sichtprüfung im Browser: Einzelansicht (inkl. Blick von unten auf den Punt) und Regal, Maße nachjustieren

