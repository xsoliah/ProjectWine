# Design

## Context

`app-bottle-3d` baut Glas, Kapsel und ein gewölbtes Vorderetikett (`labelGeometry`, Winkelbereich um `shape.label.centerAngle`, Textur im 3:4-Format mit Papierrand). Die Drehung ist über `MAX_AZIMUTH` (±110°) und `stepView` begrenzt, damit man nicht hinter die Flasche kommt. Das Rückseitenbild (`Wine.backImageId`) ist ein unbearbeitetes ganzes Foto beliebigen Seitenverhältnisses; die Detailansicht zeigt es bisher nur flach.

## Goals / Non-Goals

**Goals:** Rückenetikett auf der Rückseite der 3D-Flasche, Rückseite erreichbar (Drehen und Schaltfläche).

**Non-Goals:** Zuschnitt/Entzerren des Rückseitenfotos, Änderungen an API oder Datenmodell, Rückseite im Regal.

## Decisions

- **Lage:** Das Rückenetikett sitzt bei `centerAngle + π`, mit derselben Unter- und Oberkante wie das Vorderetikett. Die Höhe entspricht dem Vorderetikett; die Breite ergibt sich aus dem Seitenverhältnis des Fotos (Bogen = Breite / Radius), begrenzt auf die Lücke zum Vorderetikett (`2π − Vorderbogen`, abzüglich eines kleinen Abstands), damit sich beide nie überlappen. Ist das Foto breiter, wird es auf die Lücke verkleinert (Proportionen bleiben, zentriert in der Etikettenhöhe). Reine Berechnung in `core/bottle.ts` (`backLabelFrame`), testbar ohne WebGL. Alternative: Foto immer auf die volle Etikettenhöhe zwingen – würde breite Fotos verzerren oder beschneiden.
- **Geometrie wiederverwenden:** `labelGeometry` bekommt Winkelbereich, Höhenbereich und UV-Ausschnitt als Parameter (heute fest aus `labelFrame`); das Rückenetikett nutzt dieselbe Gittererzeugung mit UV über das ganze Foto. Eigenes Material und eigene Textur, geladen wie `loadLabel` über `ImageCache`, mit Anforderungszähler gegen Überholen.
- **Drehgrenzen:** Neue Eingabe `backImageId` an `app-bottle-3d`. Mit Rückseitenbild entfallen `minAzimuthAngle`/`maxAzimuthAngle` (±Infinity), die Neigung bleibt bei ±`MAX_TILT`. `stepView` bekommt einen Parameter für den Azimut-Spielraum (unbegrenzt bzw. `MAX_AZIMUTH`), damit die Pfeiltasten über 180° hinaus drehen.
- **Schaltfläche:** „Rückseite zeigen“ / „Vorderseite zeigen“ neben „Ansicht zurücksetzen“; fährt den Azimut in etwa 400 ms auf π bzw. 0 (kürzester Weg) über `requestAnimationFrame` mit Rendern auf Anforderung; bei `prefers-reduced-motion` ohne Animation. Welche Seite „vorn“ ist, folgt dem aktuellen Azimut (näher an 0 oder an π). `resetView` setzt den Azimut auf 0 zurück.
- **Rückseite entfernt:** Der Effekt baut die Meshes neu, wenn `backImageId` wechselt; die Grenzen werden mitgesetzt und der Azimut wird zurück in ±`MAX_AZIMUTH` geholt.

## Risks / Trade-offs

- [Das Rückseitenfoto ist nicht zugeschnitten und kann Hintergrund zeigen] → wird trotzdem als Etikett aufgebracht; Zuschnitt später möglich (Non-Goal), das flache Bild bleibt über den Umschalter erreichbar.
- [Breites Foto wird auf der Rückseite klein] → Proportionen haben Vorrang vor Größe.
- [Freie Drehung kann die Orientierung kosten] → Schaltfläche und „Ansicht zurücksetzen“ führen zur Vorderseite zurück.

## Migration Plan

Keine Daten- oder API-Änderung; reine Frontend-Änderung, Rollback durch Zurücknehmen des Commits.
