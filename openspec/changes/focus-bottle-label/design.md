# Design

## Context

- `Rack3d` rendert auf Anfrage, hat `OrbitControls` (Zielpunkt fest bei 0,0,0, kein Schwenken, Azimut ±45°, Neigung ±25°, Zoomgrenzen `minDistance`/`maxDistance`) und `fitCamera`. Getroffen wird nur über unsichtbare Fachboxen (`hits`); ausgefahrene Flaschen sind nicht anklickbar.
- `RackDetail` zeigt die Reihenliste als Seitenleiste (Desktop ab 900 px) bzw. als Bottom-Sheet (Handy, `max-height: 45dvh`, `position: fixed`). Das Antippen eines Listeneintrags öffnet das Modal der Fach-Aktionen.
- `RackWine` enthält Name, Erzeuger, Jahrgang, Typ, `labelImageId`; Herkunft, Rebsorten, Trinkfenster und Notiz stehen nur in `Wine` (`ApiService.getWine(id)`).
- Nach `present-bottles-upright` stehen die Flaschen der gewählten Reihe aufrecht, Etikett nach vorn, ihre Position ist deterministisch aus `slidePose(1)` berechenbar.

Motivation: `proposal.md`. Anforderungen: `specs/wine-racks/spec.md`.

## Goals / Non-Goals

**Goals:**
- Zuverlässiges Antippen der ausgefahrenen Flaschen, weiche Kamerafahrt, gut lesbares Etikett.
- Beschreibung, die höchstens etwa ein Viertel der 3D-Fläche belegt, ohne dass die Flasche dahinter verschwindet.
- Zugänglich per Tastatur und Screenreader.

**Non-Goals:**
- Etikettenbild als Vollbild, Bearbeiten des Weins in der Leiste, Gesten wie Wischen zur nächsten Flasche.
- Änderungen an API oder Datenbank.

## Decisions

### D1: Treffertest für ausgefahrene Flaschen
Beim Antippen wird zuerst gegen eine einfache Treffergeometrie der ausgefahrenen Flaschen geprüft, danach gegen die Fachboxen. Die Treffergeometrie ist ein unsichtbares `InstancedMesh` aus Quadern (Breite = Flaschendurchmesser, Höhe = Flaschenlänge), dessen Matrizen in `placeSlot` zusammen mit der Flasche geschrieben werden (nur für Flaschen der ausgewählten Reihe sichtbar, sonst ausgeblendet). Ein Treffer liefert die Instanznummer → Slot. So müssen keine 20-Segment-Flaschen per Raycast getestet werden.
Antippen einer Fachbox oder einer Flasche einer *anderen* Reihe wählt weiter die Reihe (bisheriges Verhalten); Antippen einer ausgefahrenen Flasche der gewählten Reihe fokussiert sie; Antippen einer leeren Fläche im Fokus verlässt ihn.
*Alternative*: Raycast direkt gegen die Flaschengeometrie → genauer, aber teurer und nur für die Reihe nötig. Quader reichen.

### D2: Kamerafahrt
Die Kamera fährt per kurzer Animation (≈ 450 ms, `easeOutCubic`) zu einem Fokuszustand `{ target, distance }`: `controls.target` wird auf die Etikettmitte der Flasche gesetzt (Weltposition aus `slidePose(1)`), `distance` so gewählt, dass die Etikettenhöhe etwa 60 % der freien Bildhöhe ausfüllt (`frameLabel(fov, labelHeight, freeFraction)` als reine, testbare Funktion in `rack-3d-look.ts`). Die Azimut-/Neigungsgrenzen bleiben; `minDistance` wird für den Fokus gesenkt und beim Verlassen wiederhergestellt. Der Fokus bleibt drehbar im bisherigen Rahmen.
Zurück: Zielpunkt und Abstand der Reihenansicht werden vor der Fahrt gemerkt und wieder angesteuert; „Ansicht zurücksetzen“ führt wie bisher in die Startansicht und beendet den Fokus.
`prefers-reduced-motion`: Sprung ohne Animation. Die Animation nutzt dieselbe Schleife wie das Ausfahren (nur aktiv, solange etwas in Bewegung ist).
*Alternative*: Kamera fest lassen und Flasche heranfahren → die Flasche würde Regal und andere Flaschen verdecken und das Etikett bliebe perspektivisch klein. Verworfen.

### D3: Platz für die Leiste: Bildversatz statt Überdeckung
Die Leiste liegt unten **innerhalb** der 3D-Fläche (`position: absolute`, volle Breite, `max-height: 28 %` der Fläche, auf Handys zusätzlich Mindesthöhe für die Aktionen) und überdeckt damit nur den unteren Rand. Damit die Flasche nicht dahinter liegt, setzt `Rack3d` beim Fokus `camera.setViewOffset(...)` so, dass der Bildmittelpunkt in der Mitte des freien Bereichs über der Leiste liegt (Input `bottomInset` in Pixeln, von der Seite aus der gemessenen Leistenhöhe gesetzt), und `frameLabel` rechnet mit der freien Höhe. Beim Verlassen wird der Versatz entfernt (`clearViewOffset`).
Die Reihenliste (Seitenleiste bzw. Handy-Sheet) wird im Fokus ausgeblendet, damit nicht zwei Sheets übereinanderliegen; „Zurück zur Reihe“ bringt sie zurück.
*Alternative*: Leiste außerhalb unter der Canvas → verkleinert die 3D-Fläche und verschiebt das Layout beim Öffnen. Verworfen.

### D4: Weindaten nachladen, Leiste und Zugänglichkeit
`RackDetail` hält `focused = signal<{ slot, wine: Wine | null } | null>`. Beim Fokus werden Name, Erzeuger, Jahrgang, Typ sofort aus dem Slot angezeigt; `ApiService.getWine(id)` lädt Herkunft, Rebsorten, Trinkfenster und Notiz nach (Fehler → nur die Kurzangaben, kein Abbruch; veraltete Antworten bei schnellem Wechsel werden verworfen). Die Leiste ist ein Bereich mit `role="region"` und Beschriftung, `aria-live="polite"` für den Inhaltswechsel, der Fokus springt beim Öffnen auf die Überschrift; Escape schließt den Fokus.
Tastaturbedienung: Jeder Eintrag der Reihenliste bekommt neben der bisherigen Schaltfläche (Fach-Aktionen) eine zweite „Weinbeschreibung“, die den Fokus für dieses Fach auslöst. Die Leiste hat „Fach-Aktionen“ (öffnet das bestehende Modal), „Zum Wein“ (Link) und „Zurück zur Reihe“.

### D5: Neue Schnittstellen von `Rack3d`
Input `focusedSlot: number | null` (Slot-Id) und `bottomInset: number`; Output `bottleTapped: RackSlot` (Antippen einer ausgefahrenen Flasche) und `emptyTapped` (leere Fläche im Fokus). Die Seite hält den Zustand, `Rack3d` setzt ihn nur in Kameraanimation um.

## Risks / Trade-offs

- [Bildversatz und OrbitControls vertragen sich schlecht beim Drehen] → Versatz nur zur Darstellung (`setViewOffset`), Zielpunkt bleibt das Etikett; im Test mit Drehen und Zoomen prüfen, notfalls Drehen im Fokus auf kleinen Winkel begrenzen.
- [Leiste auf kleinen Handys zu hoch, Flasche zu klein] → Maximalhöhe ca. ein Viertel; Beschreibung scrollt in der Leiste, Aktionen bleiben fest sichtbar.
- [Treffergeometrie weicht von der sichtbaren Flasche ab] → Quader mit Flaschenabmessungen; per Test mit Tippen auf Etikett, Hals und Rand prüfen.
- [Zwei Änderungen am selben Bereich] → `present-bottles-upright` zuerst umsetzen und archivieren; die Fokuslage hängt von `slidePose(1)` ab.

## Open Questions

- Soll ein Doppeltippen auf das Etikett später ein Vollbild öffnen? Bleibt außerhalb dieser Änderung.
