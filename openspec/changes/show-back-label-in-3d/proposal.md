# Proposal

## Why

Die 3D-Ansicht in der Einzelansicht eines Weins zeigt nur das Vorderetikett. Das Rückenetikett (Rebsorten, Trinkfenster, Importeur) ist als Foto am Wein gespeichert, lässt sich aber nur über den Umschalter „Rückseite“ als flaches Bild ansehen. Außerdem ist die Drehung der 3D-Flasche auf ±110° begrenzt, die Rückseite der Flasche ist also gar nicht erreichbar. Wer die Flasche dreht, erwartet auf der Rückseite das Rückenetikett zu sehen.

## What Changes

- Neu: Hat ein Wein ein Rückseitenbild, wird es in der 3D-Ansicht als gewölbtes Etikett auf die **Rückseite der Flasche** (gegenüber dem Vorderetikett) gelegt, auf gleicher Höhe wie das Vorderetikett.
- Geändert: Hat ein Wein ein Rückseitenbild, lässt sich die Flasche **ganz herumdrehen** (Maus, Finger, Pfeiltasten). Ohne Rückseitenbild bleibt die Drehung wie bisher begrenzt.
- Neu: Eine Schaltfläche „Rückseite zeigen“ / „Vorderseite zeigen“ in der 3D-Ansicht dreht die Flasche weich auf die jeweils andere Seite; „Ansicht zurücksetzen“ zeigt wieder die Vorderseite.
- Das Rückseitenbild bleibt unbearbeitet (kein Zuschnitt); es wird mit seinem eigenen Seitenverhältnis aufgebracht und nicht verzerrt.
- Keine Änderung an API, Datenmodell, Kellerliste oder am flachen Umschalter „Rückseite“.

## Capabilities

### New Capabilities
<!-- Keine -->

### Modified Capabilities
- `wine-bottle-3d-view`: neue Anforderungen „Rückenetikett in 3D“, „Volle Drehung mit Rückseite“ und „Rückseite per Schaltfläche zeigen“. Die Capability liegt noch in den offenen Changes `add-bottle-3d-view` und `default-3d-wine-view`, nicht in `openspec/specs`; dieser Change wird deshalb nach beiden umgesetzt und archiviert.

## Impact

- **Frontend**: `web/src/app/shared/bottle-3d.ts` (zweites Etikett-Mesh, Textur, freie Drehung, Dreh-Schaltfläche), `web/src/app/core/bottle.ts` (Lage und Größe des Rückenetiketts, Drehgrenzen, Tastensteuerung), `web/src/app/pages/wine-detail/wine-detail.html` (Eingabe `backImageId` an die Komponente); Tests in `bottle.spec.ts`.
- **Abhängigkeit**: `add-wine-back-label` (Rückseitenbild), `add-bottle-3d-view`, `default-3d-wine-view`; berührt dieselbe Datei wie `add-bottle-forms` (bereits gemergt).
- **Nicht Teil**: Zuschnitt oder Entzerren der Rückseite, Rückseite in Regal- oder Kellerliste, Texterkennung.
