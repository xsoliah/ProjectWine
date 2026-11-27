# Proposal

## Why

Schaumweinflaschen sehen in der 3D-Ansicht nicht wie Schaumwein aus: Die Form „Champagner“ ist nur ein abgewandeltes Wandprofil der Bordeauxflasche (gleiche Drehkörper-Technik, nur andere Zahlen). Es fehlen die typischen Merkmale – eingedellter Boden (Punt), Mündungswulst, Drahtkorb (Agraffe) und Folie. Das Ergebnis wirkt wie eine dicke Bordeauxflasche mit langer Kapsel.

## What Changes

- Schaumwein bekommt ein **eigenes, prozedural gebautes 3D-Modell** (kein Zusatz-Asset): Flaschenkörper mit Punt, kräftigem Glas, ausgeprägtem Mündungswulst, darüber Folie, Drahtkorb mit Plättchen (Agraffe) und Korkkopf.
- Das Modell wird in der Einzelansicht und im 3D-Regal verwendet, überall dort, wo die aufgelöste Flaschenform „Champagner“ ist (gewählt oder automatisch bei Weintyp Schaumwein).
- Die Form „Schlegel“ (Flöte) bleibt ein Drehkörper wie bisher; Bordeaux und Burgunder bleiben unverändert.
- Etikett, Skalierung nach Flaschengröße, Herausziehen im Regal und Trefferprüfung funktionieren mit dem neuen Modell wie bisher.
- Das bisherige Champagner-Wandprofil dient weiter als Grundkörper (Profil, Etikettlage, Rückfall im Backend); das Detailmodell kommt nur in der Darstellung dazu.

## Capabilities

### New Capabilities
- `sparkling-bottle-model`: Aussehen der Schaumweinflasche in den 3D-Ansichten (eigenes Modell mit Punt, Mündungswulst, Folie, Drahtkorb, Korken).

### Modified Capabilities

## Impact

- Web: `web/src/app/core/bottle.ts` (Modelldaten für Schaumwein), `web/src/app/shared/bottle-3d.ts` (Einzelansicht), `web/src/app/shared/rack-3d.ts` (Regal, Instancing), ggf. `rack-3d-look.ts`; Unit-Tests dazu.
- Kein Backend, keine API-Änderung, keine Migration. Keine neuen Abhängigkeiten.
- Hinweis: Die Änderung `add-bottle-forms` ist noch nicht archiviert, daher kein Delta auf deren Spec, sondern eine eigene Capability.
