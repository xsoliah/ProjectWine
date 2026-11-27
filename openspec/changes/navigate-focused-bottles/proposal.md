# Proposal

## Why

Fährt eine Reihe aus, stehen die Flaschen nebeneinander vor dem Regal. Bei breiten Regalen (z. B. 10 oder mehr Spalten) sind die Flaschen in der Gesamtansicht so klein, dass man nicht erkennt, um welche Weine es sich handelt. Die geplante Änderung `focus-bottle-label` zoomt zwar auf eine angetippte Flasche, doch um die Nachbarflasche zu sehen, müsste man jedes Mal zurück zur Reihe und erneut tippen. Man möchte stattdessen die Flaschen einer Reihe im Zoom bequem von links nach rechts durchgehen und so inspizieren.

## What Changes

- Im Zoom auf eine Flasche lässt sich horizontal zur Nachbarflasche derselben Reihe navigieren: Schaltflächen „Vorherige“ / „Nächste“ (links/rechts) in der 3D-Fläche, Pfeiltasten links/rechts und Wischen nach links/rechts. Die Kamera fährt dabei weich seitlich zur nächsten Flasche, ohne die Reihenansicht zu verlassen; die Beschreibungsleiste wechselt mit.
- Leere Fächer werden übersprungen; am Reihenanfang bzw. -ende sind die jeweilige Schaltfläche und der Wisch deaktiviert (kein Umbruch in die nächste Reihe).
- Die Leiste zeigt die Position in der Reihe („Spalte 3 von 10“, Rang unter den belegten Fächern), damit man sich in breiten Regalen orientiert.
- Ein Tipp auf eine Flasche in der Gesamtansicht bleibt der Einstieg; das Wechseln per Tipp auf eine Nachbarflasche funktioniert weiter.

Nicht Teil dieser Änderung: Wechsel in die Nachbarreihe (hoch/runter), Vollbild des Etiketts, Bearbeiten des Weins in der Leiste, Umbruch am Reihenende.

## Capabilities

### New Capabilities

### Modified Capabilities
- `wine-racks`: Neue Anforderung zur horizontalen Navigation zwischen den Flaschen einer Reihe im Flaschenzoom.

## Impact

- Frontend: `web/src/app/shared/rack-3d.ts` (Kamerafahrt von Flasche zu Flasche, Wisch-Erkennung auf der Canvas), `rack-3d-look.ts` (reine Funktion für die Nachbarflasche), `web/src/app/pages/rack-detail/` (Schaltflächen, Pfeiltasten, Positionsanzeige, Zustand `focused`).
- Keine API- oder Datenbankänderung.
- Reihenfolge: baut auf `focus-bottle-label` auf (Flaschenzoom, Beschreibungsleiste) und muss danach umgesetzt werden; ohne sie gibt es keinen Zoomzustand zum Navigieren.
