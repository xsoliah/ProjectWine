# Design

## Context

Beobachtet im Code:
- `core/bottle.ts`: `BOTTLE_FORM_SPECS` hat je Form ein Wandprofil und `capsuleStart`; Champagner ist nur ein anderes Profil. `capsuleDimensions` liefert einen schlanken Kegelstumpf.
- `shared/bottle-3d.ts` (Einzelansicht) baut `LatheGeometry` (Körper) + `CylinderGeometry` (Kapsel) + Etikett aus dem (ggf. gemessenen) Profil.
- `shared/rack-3d.ts` (Regal) hat je Form ein Set aus drei `InstancedMesh` (Körper, Kapsel, Etikett) mit geteilten Materialien; Matrizen werden in `placeSlot` geschrieben, das Etikett nutzt ein Atlas-Attribut `labelRect`.
- Beide Ansichten rufen `capsuleDimensions`/`standardShape` auf; die Kapsel ist ein Zylinder, daher fehlt dem Hals jede Detailzeichnung.

## Goals / Non-Goals

**Goals:** erkennbare Sektflasche (Punt, Mündungswulst, Folie, Drahtkorb mit Plättchen, Korkkopf) in Einzelansicht und Regal; unveränderte Darstellung der anderen Formen; gleiche Bedienung und Performance.

**Non-Goals:** externe 3D-Dateien (glTF), neue Flaschenformen, Änderung von Backend, API oder Datenmodell, fotorealistische Materialien.

## Decisions

1. **Prozedural statt Asset.** Das Modell besteht aus einigen Teilgeometrien in three.js, die aus der Formdefinition erzeugt werden. Keine Ladezeit, keine Lizenzfrage, Etikettlage bleibt aus dem Profil berechenbar. Alternative glTF verworfen (Nutzerentscheidung), weil Dateibeschaffung und Etikett-Mapping zusätzlichen Aufwand bedeuten.
2. **Eine Funktion baut das Modell** (z. B. `sparklingParts(length)` in einer eigenen Datei `shared/sparkling-bottle.ts`) und liefert Geometrien nach Material gruppiert: `foil` (Folie vom Hals bis Mündungswulst, leicht gerillt), `wire` (Drahtkorb: Ring unter dem Wulst, Schlaufen als dünne Tori, Plättchen als flache Scheibe oben; metallisches Material) und `cork` (kurzer heller Korkkopf über dem Plättchen). Der Glaskörper bleibt ein Drehkörper.
3. **Punt über das Profil.** `BOTTLE_FORM_SPECS.Champagne.wall` bekommt am Anfang eine nach innen ragende Eindellung (kleinerer Radius, größere Höhe als der Standring). Es bleibt ein Drehkörper; `lathePoints` schließt weiter auf der Achse. Bei gemessenen Flaschen (`shape.profile`) wird kein Punt ergänzt.
4. **Materialien teilen.** `glass` und `foil` werden wiederverwendet, für Drahtkorb und Kork je ein weiteres Material. Im Regal bekommt die Form Champagner zusätzliche `InstancedMesh`-Sätze (Draht, Kork) mit derselben Instanzmatrix wie Körper/Kapsel. Die übrigen Formen behalten genau die bisherigen drei Meshes.
5. **Kapsel ersetzt.** Für Champagner ersetzt die gerillte Folie den Zylinder; `capsuleDimensions` bleibt für die anderen Formen und liefert Start-/Endhöhe und Radien als Maßgabe für Folie, Wulst und Drahtkorb.
6. **Etikett bleibt wie es ist.** Lage und Bogen kommen weiter aus `labelFrame`; der Drahtkorb sitzt am Hals oberhalb des Etiketts (Oberkante 0,5), keine Überschneidung.
7. **Tests.** Unit-Tests prüfen die Maße (Punt, Wulst über Hals, Drahtkorb im Folienbereich, Etikett außerhalb) und dass für andere Formen keine Teile entstehen. Das Aussehen wird per Sichtprüfung im Browser nachjustiert.

## Risks / Trade-offs

- Mehr Dreiecke je Sektflasche (Tori, Rillen): im Regal sind es Instanzen mit wenigen Segmenten (≤ 16); bei sehr vollem Regal messen.
- Die Maße sind geschätzt; Sichtprüfung und Nachjustieren sind Teil der Aufgaben.
- Zusätzliche Meshes im Regal vergrößern `FormMeshes`; Dispose und Zähler müssen alle neuen Meshes umfassen (der Hit-Test nutzt nur `hits`).

## Assumptions

- „Eigenes Modell“ heißt: deutlich detailliertere, eigens gebaute Geometrie, nicht Import einer Datei (vom Nutzer bestätigt).
- Gilt für die aufgelöste Form Champagner; „Schlegel“ bleibt eine Weinflasche.
