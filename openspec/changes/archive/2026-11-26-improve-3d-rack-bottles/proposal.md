# Proposal

## Why

Die 3D-Ansicht des Regals zeigt die Flaschen bisher als knallbunte, einfarbige Körper in den Farben der Weintypen (z. B. leuchtendes Rot). Das wirkt unnatürlich, und man erkennt nicht, welcher Wein wo liegt, obwohl für viele Weine bereits ein Etikettenbild vorhanden ist (siehe `add-photo-capture`). Die Auswahl einer Reihe hebt sie nur durch einen goldenen Rahmen hervor – die Etiketten bleiben auch dann verborgen.

## What Changes

- Flaschen sehen fotorealistischer aus: Glasfarben wie bei echten Flaschen (sehr dunkles Grün/Braun für Rotwein, helleres Grün für Weißwein usw.) statt der Farben der Typ-Abzeichen, glänzendes Glas mit Spiegelungen der Umgebung, Kapsel in passender Farbe.
- Auf jeder Flasche, deren Wein ein Etikettenbild hat, ist das Etikett sichtbar; Weine ohne Etikettenbild bekommen ein neutrales Papieretikett.
- Wird eine Reihe ausgewählt, fahren ihre Flaschen weich ein Stück aus dem Regal heraus und kippen dabei leicht dem Betrachter zu, sodass die Etiketten lesbar sind. Beim Abwählen oder beim Wechsel der Reihe fahren sie wieder hinein. Mit der Systemeinstellung „Bewegung reduzieren“ springen sie ohne Animation.
- Die Regal-API liefert pro Flasche die Etikettenbild-ID des Weins (`labelImageId`, kann leer sein).
- Der goldene Rahmen als Hervorhebung bleibt erhalten.

Nicht Teil dieser Änderung: Etiketten zum Lesen vergrößern/anzeigen, andere Flaschenformen je Weintyp, Änderungen an Raster- oder Listenansicht.

## Capabilities

### New Capabilities

### Modified Capabilities
- `wine-racks`: Die Anforderungen „3D-Ansicht des Regals“ (realistische Glasfarben, Etiketten auf den Flaschen) und „Reihe antippen zeigt ihre Weine“ (ausfahrende Reihe) ändern sich.

## Impact

- Frontend: `web/src/app/shared/rack-3d.ts` (Materialien, Etiketten, Animation), neue Hilfsdatei für Farbpalette, Etiketten-Atlas und Ausfahr-Pose, `web/src/app/core/models.ts` (`RackWine.labelImageId`).
- Backend: `RackWineDto` in `WineCellar.Application/Contracts.cs` und `Mapping.ToRackWine` um `LabelImageId` erweitert (rückwärtskompatibel, zusätzliches Feld).
- Abhängigkeit: setzt die Etikettenbilder aus `add-photo-capture` (Capability `wine-label-image`) voraus; ohne sie erscheinen überall die neutralen Etiketten.
- Keine neuen Pakete: three.js bringt `RoomEnvironment` für die Spiegelungen mit.
