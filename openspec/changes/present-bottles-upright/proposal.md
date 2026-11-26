# Proposal

## Why

Weißweinflaschen erscheinen in der 3D-Ansicht noch gelbgrün statt „weiß“. Außerdem kippen ausgefahrene Flaschen bisher nur schräg heraus; die Etiketten sind dadurch angeschnitten und nicht wirklich zum Betrachter gewandt. Die Flaschen sollen sich beim Herausfahren so drehen, dass sie am Ende aufrecht mit dem Etikett zum Betrachter stehen.

## What Changes

- Die Glasfarbe von Weißwein wird deutlich heller und weißlicher (nur ein leichter Grünstich, kaum Gelb).
- Beim Ausfahren einer Reihe drehen sich die Flaschen um ihre Längsachse und richten sich auf: am Ende stehen sie aufrecht (Hals oben), das Etikett zeigt frontal zum Betrachter und ist lesbar. Beim Einfahren läuft die Bewegung rückwärts.
- Die Kamera lässt oben und unten genug Platz für die aufrecht stehenden Flaschen der obersten und untersten Reihe.

Nicht Teil dieser Änderung: Zoomen auf eine einzelne Flasche und die Weinbeschreibung (Änderung `focus-bottle-label`), neue Flaschenformen.

## Capabilities

### New Capabilities

### Modified Capabilities
- `wine-racks`: Die Anforderung „Reihe antippen zeigt ihre Weine“ ändert sich (Flaschen drehen sich auf und stehen aufrecht mit Etikett nach vorn statt schräg zu kippen); neue Anforderung zur hellen Glasfarbe von Weißwein.

## Impact

- Frontend: `web/src/app/shared/rack-3d-look.ts` (Palette Weißwein, Pose mit Drehung und Aufrichten, Tests) und `web/src/app/shared/rack-3d.ts` (Matrixberechnung, Kamerarand).
- Keine API- oder Datenbankänderung.
- Reihenfolge: baut auf `improve-3d-rack-bottles` auf (dessen Anforderungstexte werden hier weiterentwickelt); diese Änderung erst nach dessen Archivierung archivieren.
