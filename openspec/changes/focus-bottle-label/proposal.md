# Proposal

## Why

Auch wenn die Flaschen einer Reihe aufrecht mit dem Etikett nach vorn vor dem Regal stehen, ist das Etikett in der Gesamtansicht klein. Man möchte eine einzelne Flasche genauer ansehen: die Kamera soll zu ihr fahren, damit das Etikett gut lesbar ist, und der Wein soll beschrieben werden, ohne dass die Beschreibung die 3D-Ansicht großflächig überdeckt.

## What Changes

- Ein Tipp auf eine ausgefahrene (aufrecht stehende) Flasche zoomt die Kamera weich auf diese Flasche, sodass ihr Etikett den nutzbaren Bildausschnitt gut ausfüllt und lesbar ist.
- Gleichzeitig öffnet sich unten eine niedrige Beschreibungsleiste (Bottom-Sheet) mit Name, Erzeuger, Jahrgang, Typ, Herkunft (Land, Region), Rebsorten, Trinkfenster und Notiz des Weins sowie den Aktionen „Fach-Aktionen“ und „Zum Wein“. Die Leiste belegt höchstens etwa ein Viertel der 3D-Fläche; die Kamera rahmt die Flasche im freien Bereich darüber.
- Ein Tipp auf eine andere ausgefahrene Flasche der Reihe fährt die Kamera dorthin. Mit „Zurück zur Reihe“ (Schaltfläche, Escape, Tipp auf leere Fläche) oder „Ansicht zurücksetzen“ fährt die Kamera in die Reihenansicht zurück; die Reihe bleibt ausgewählt.
- Die Weindaten für die Leiste werden beim Zoomen über den vorhandenen Weg zum Laden eines Weins nachgeladen (keine API-Änderung).

Nicht Teil dieser Änderung: Aufrechtes Ausfahren der Reihe (Änderung `present-bottles-upright`), Etikett im Vollbild, Bearbeiten des Weins in der Leiste.

## Capabilities

### New Capabilities

### Modified Capabilities
- `wine-racks`: Neue Anforderungen zum Zoomen auf eine Flasche und zur Weinbeschreibung als niedrige Leiste unten in der 3D-Ansicht.

## Impact

- Frontend: `web/src/app/shared/rack-3d.ts` (Treffertest auf ausgefahrene Flaschen, Kamerafahrt mit Zielpunkt und Bildversatz, neuer Ausgabe-Event `bottleFocused`), `rack-3d-look.ts` (reine Rahmenberechnung), `web/src/app/pages/rack-detail/` (Leiste, Wein nachladen, Zustand „fokussierte Flasche“, Layout).
- Keine API- oder Datenbankänderung.
- Reihenfolge: baut auf `present-bottles-upright` auf (aufrechte Flaschen) und danach auf `improve-3d-rack-bottles`; zuletzt archivieren.
