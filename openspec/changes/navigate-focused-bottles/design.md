# Design

## Context

- `focus-bottle-label` (noch nicht umgesetzt) führt den Zustand `focused` (Slot, Wein) in `RackDetail`, die Kamerafahrt zu `{ target, distance }` in `Rack3d`, Treffergeometrie für ausgefahrene Flaschen und die Beschreibungsleiste ein. Die Flaschen der gewählten Reihe stehen aufrecht nebeneinander; ihre Position folgt deterministisch aus `slidePose(1)`.
- Die Slots einer Reihe sind nach Spalte geordnet; leere Fächer haben keine Flasche.
- Wischen auf der Canvas kollidiert mit `OrbitControls` (Ziehen dreht das Regal).

Motivation: `proposal.md`. Anforderungen: `specs/wine-racks/spec.md`.

## Goals / Non-Goals

**Goals:**
- Von Flasche zu Flasche seitlich fahren, ohne zurück in die Reihenansicht zu müssen.
- Orientierung in breiten Reihen (Position in der Reihe).
- Bedienbar per Schaltfläche, Pfeiltasten, Wischen und Screenreader.

**Non-Goals:**
- Navigation in andere Reihen, Umbruch am Reihenende, Vollbild, Bearbeiten.

## Decisions

### D1: Nachbarflasche als reine Funktion
`neighborSlot(slots, current, direction)` in `rack-3d-look.ts` liefert aus den belegten Slots der Reihe (nach Spalte sortiert) die nächste Flasche links bzw. rechts oder `null` am Rand. Leere Fächer kommen nicht vor, sind also übersprungen. Unit-getestet (Mitte, Rand, Lücken, einzelne Flasche).
*Alternative*: Spaltenindex ±1 und leere Fächer anhalten → führt zu toten Schritten in lückenhaften Reihen. Verworfen.

### D2: Kamera fährt nur seitlich
Der Wechsel nutzt die Kamerafahrt aus `focus-bottle-label` mit neuem Zielpunkt; Abstand, Blickrichtung und Bildversatz bleiben, die Dauer ist kürzer (≈ 300 ms, `easeOutCubic`), damit schnelles Durchblättern flüssig bleibt. Wird währenddessen erneut navigiert, startet die Fahrt ab der aktuellen Kameraposition zum neuen Ziel (keine Warteschlange). `prefers-reduced-motion`: Sprung.

### D3: Bedienung
- **Schaltflächen** „Vorherige“/„Nächste“ als Pfeile links und rechts mittig am Rand der 3D-Fläche (oberhalb der Leiste), deaktiviert am Rand, mit `aria-label`.
- **Pfeiltasten** links/rechts, solange der Zoom aktiv ist und kein Eingabefeld oder Modal den Fokus hat.
- **Wischen**: horizontale Wischgeste auf der Canvas (Schwelle ≈ 40 px, überwiegend horizontal, Dauer < 500 ms) wechselt zur Nachbarflasche. Damit sich Wischen und Drehen nicht ins Gehege kommen, ist im Flaschenzoom das Drehen per Ziehen ausgeschaltet (`OrbitControls.enableRotate = false`); Zoom per Pinch/Rad bleibt. Gedreht wird nur in der Reihenansicht.
*Alternative*: Drehen im Zoom behalten und nur Schaltflächen/Tasten anbieten → auf dem Handy fehlt die natürliche Geste, und breite Reihen wären mühsam. Verworfen. Das ersetzt die Aussage „Fokus bleibt drehbar“ aus `focus-bottle-label`.

### D4: Orientierung
Die Leiste zeigt unter dem Namen „Spalte 3 von 10“ (Spaltennummer des Slots, Spaltenzahl des Regals) und „Flasche 2 von 6“ (Rang unter den belegten Fächern). Beide Angaben gehören in die `aria-live`-Region der Leiste. Das Nachladen der Weindaten beim Wechsel nutzt dieselbe Logik wie der erste Zoom (veraltete Antworten verwerfen).

### D5: Schnittstellen
`Rack3d`: Output `bottleTapped` bleibt; neuer Output `swipe: 'prev' | 'next'`. `RackDetail` berechnet über `neighborSlot` den Zielslot und setzt `focusedSlot`; `Rack3d` animiert nur. So bleibt die Logik an einer Stelle (Seite) und die Komponente reine Darstellung.

## Risks / Trade-offs

- [Wisch- und Tippgeste verwechselt] → Tipp gilt weiter nur bei kleiner Bewegung (bestehende Schwelle in `onPointerUp`); Wisch erst oberhalb der Wischschwelle.
- [Drehen im Zoom entfällt] → Zurück in die Reihenansicht gibt das Drehen wieder; auf Rückmeldung prüfen.
- [Schaltflächen verdecken Flaschen/Etikett] → Platzierung am äußeren Rand, halbtransparent, im Browser auf Desktop- und Handybreite prüfen.

## Open Questions

- Soll am Reihenende später in die nächste Reihe weitergeblättert werden? Bleibt außerhalb dieser Änderung.
