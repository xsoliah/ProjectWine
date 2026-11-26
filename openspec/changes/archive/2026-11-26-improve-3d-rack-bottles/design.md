# Design

## Context

- `web/src/app/shared/rack-3d.ts` (three.js) zeichnet Regal, Flaschen (`InstancedMesh` mit `LatheGeometry`), Kapseln und einen goldenen Rahmen. Die Farbe je Flasche stammt aus den CSS-Variablen `--t-*` der Typ-Abzeichen, daher die leuchtenden Töne. Gerendert wird nur bei Bedarf (`requestRender`), nicht in einer Dauerschleife.
- Die Flaschen liegen mit dem Hals zum Betrachter (+Z). Von vorne sieht man also nur Boden bzw. Hals – die Längsseite mit einem Etikett ist nicht zu sehen. Die Kamera lässt sich nur um ±45° (Azimut) und ±25° (Neigung) bewegen.
- Etikettenbilder (3:4, geschützt) kommen aus `add-photo-capture` (`Wine.labelImageId`) und werden über `ImageCache`/`ApiService.getImage` mit Bearer-Token geladen. `RackWine` (Regal-API) enthält bisher keine Bild-ID.
- Treffer beim Antippen laufen über unsichtbare Boxen je Fach (`hits`), nicht über die Flaschen.

Motivation: `proposal.md`. Anforderungen: `specs/wine-racks/spec.md`.

## Goals / Non-Goals

**Goals:**
- Natürlich wirkende Flaschen und Etiketten, die bei der ausgewählten Reihe wirklich lesbar sind.
- Weiches Herausfahren ohne Dauer-Render-Schleife und ohne spürbare Ruckler bei großen Regalen (bis 50 × 50 Fächer).
- Der Ausfall einzelner Etikettenbilder darf die 3D-Ansicht nie stören.

**Non-Goals:**
- Echtes Glas mit Transmission/Brechung (`MeshPhysicalMaterial.transmission`): zu teuer für viele Instanzen auf Mobilgeräten.
- Verschiedene Flaschenmodelle je Weintyp oder Flaschengröße.
- Etikettenbilder in hoher Auflösung; ein kleiner Atlas reicht für die Regalansicht.

## Decisions

### D1: Feste, realistische Glaspalette statt Typ-Abzeichenfarben
Eine Konstante `GLASS_BY_TYPE` in einer neuen, reinen Datei `rack-3d-look.ts` (ohne three.js-Zustand, daher testbar): Rot sehr dunkles Antikgrün (fast schwarz), Weiß helleres Gelbgrün, Rosé klares, blasses Glas, Schaumwein dunkles, schweres Grün, Dessert Bernstein, Fortified dunkles Braun, Sonstige gedecktes Grün. Glas: `MeshStandardMaterial` mit niedriger Rauheit (≈ 0,12), `metalness ≈ 0`, erhöhter `envMapIntensity`. Kapselfarbe je Typ (Rot: dunkles Bordeaux/Schwarz, Weiß: Gold/Silber) über `setColorAt` auf der Kapsel-Instanz. Die Hervorhebung färbt die Flaschen nicht mehr ein, nur noch der Rahmen.
*Alternative*: Farben aus den CSS-Variablen ableiten und abdunkeln → bleibt an das UI-Theme gekoppelt und wirkt weiter künstlich. Verworfen.

### D2: Spiegelungen über Umgebungskarte
`RoomEnvironment` (`three/examples/jsm/environments/RoomEnvironment.js`) wird einmal per `PMREMGenerator` zur `scene.environment` (ohne Hintergrund, der Canvas bleibt transparent). Das gibt Glas und Holz glaubhafte Reflexe ohne zusätzliche Lichter. Hemisphere-/Directional-Licht werden etwas zurückgenommen. Die Karte wird beim Aufräumen freigegeben.

### D3: Etiketten über einen Atlas und eine Instanz je Flasche
- Ein zweites `InstancedMesh` `labels` mit einer leicht gewölbten Fläche (Zylindersegment knapp über dem Flaschenradius, etwa 110° Bogen) liegt auf der Flaschenoberseite (+Y) im Bereich des Flaschenkörpers, mit gemeinsamem Material und Atlas-Textur.
- **Atlas**: ein `CanvasTexture` (2048 × 2048, Kachel 128 × 171 px, also 16 × 11 = 176 Kacheln). Kachel 0 ist das neutrale Etikett (cremefarbenes Papier, feiner Rand). Jedem verschiedenen `labelImageId` im Regal wird eine Kachel zugewiesen; die Bilder werden über `ImageCache.url` geladen, dekodiert und in ihre Kachel gezeichnet (3:4 wie das gespeicherte Etikett). Danach `needsUpdate` und neu rendern. Gibt es mehr Bilder als Kacheln oder schlägt ein Laden fehl, bleibt Kachel 0.
- **Zuordnung je Instanz**: ein `InstancedBufferAttribute` `labelTile` (Kachelindex), im Material per `onBeforeCompile` in den Vertex-Shader eingehängt, der die UV-Verschiebung berechnet.
  *Alternative*: je Kachel ein eigenes `InstancedMesh` → bis zu 176 Draw-Calls. Verworfen.
  *Alternative*: je Flasche ein eigenes `Mesh` mit eigener Textur → bis 2500 Meshes und Texturen. Verworfen.
- Etiketten teilen Matrix und Pose mit der Flasche (siehe D4), fahren also mit heraus.
- Aufräumen: Atlas-Textur und Canvas beim Zerstören bzw. Neuaufbau freigeben; Ergebnisse veralteter Ladevorgänge (Regal gewechselt) werden verworfen.

### D4: Ausfahren mit Neigung, damit das Etikett sichtbar wird
Weil das Etikett oben auf der liegenden Flasche sitzt und der Hals zum Betrachter zeigt, reicht reines Herausschieben nicht. Die Flaschen der ausgewählten Reihe werden deshalb zusätzlich um die X-Achse gekippt (ca. 55–65°, Hals nach unten zum Betrachter, Drehpunkt in Flaschenmitte), sodass die Etiketten dem Betrachter zugewandt sind, und fahren dabei etwa eine halbe Flaschenlänge nach vorn (+Z), damit sie nicht im Regalboden stecken. Ein Fortschritt `pullProgress` (0…1) je Reihe steuert beides; die Pose ist eine reine Funktion `slidePose(progress)` (Verschiebung, Kippwinkel).
- **Animation**: eine `requestAnimationFrame`-Schleife läuft nur, solange mindestens eine Reihe nicht am Zielwert ist (≈ 350 ms, Ease-out); danach wieder Render nur bei Bedarf. Beim Reihenwechsel laufen alter und neuer Fortschritt gleichzeitig.
- Nur die Matrizen von Flaschen, Kapseln und Etiketten der betroffenen Reihen werden neu geschrieben, `instanceMatrix.needsUpdate` einmal je Frame.
- `prefers-reduced-motion: reduce` → Fortschritt springt direkt auf den Zielwert.
- Die Trefferboxen bleiben im Fach, die Flaschen selbst sind nicht anklickbar; die Reihe bleibt über ihre Fachboxen und die Liste bedienbar. Der Rahmen bleibt an der Vorderkante des Regals.
*Alternative*: nur herausschieben und die Kamera zur Reihe schwenken → wegen der Kamerabegrenzung (±25° Neigung) sieht man die Etiketten von oben kaum. Verworfen.
*Alternative*: Flasche um die eigene Längsachse drehen → bringt das Etikett zur Seite, nicht zum Betrachter. Verworfen.

### D5: Etikett-ID in der Regal-API
`RackWineDto` (und `RackWine` im Frontend) bekommt `LabelImageId : Guid?` als letztes Feld; `Mapping.ToRackWine` füllt es aus `Wine.LabelImageId`. Kein neuer Endpunkt, keine Migration. Alte Clients ignorieren das Feld.

## Risks / Trade-offs

- [Bei großen Regalen (2500 Flaschen) sind drei Instanz-Meshes plus Atlas teuer] → Es werden nur belegte Fächer gezeichnet (`count`), der Atlas ist klein, Render auf Anfrage; die Animation betrifft nur eine Reihe.
- [Gekippte Flaschen könnten Regalteile durchdringen] → Verschiebung so gewählt, dass die Flasche nach vorn aus dem Regal ragt; im manuellen Test mit der obersten und untersten Reihe des höchsten Regals prüfen.
- [Kleine Kacheln (128 × 171) wirken beim Hineinzoomen unscharf] → Für die Regalansicht ausreichend; die Kachelgröße ist eine Konstante.
- [`onBeforeCompile` ist an three.js-Interna gekoppelt] → Auf einen kleinen, kommentierten Block begrenzt; fällt er aus, bleibt das neutrale Etikett sichtbar.
- [Glasfarben sind Geschmackssache] → In einer Konstante gebündelt, leicht nachzujustieren; Aussehen per Screenshot prüfen.

## Migration Plan

Reine Erweiterung: Backend und Frontend gemeinsam ausliefern; ein neues Frontend mit altem Backend zeigt nur neutrale Etiketten. Kein Datenbankschritt, Rollback durch Zurücksetzen der Version.
