# Tasks

## 1. Rahmenberechnung und Treffergeometrie

- [x] 1.1 Reine Funktion `frameLabel(fov, labelHeight, freeFraction)` (Abstand, bei dem das Etikett den gewünschten Anteil der freien Bildhöhe füllt) und Fokus-Zielpunkt aus `slidePose(1)` in `rack-3d-look.ts` anlegen; Unit-Tests für Abstand bei verschiedenen Sichtfeldern und freien Anteilen sowie für den Zielpunkt
- [x] 1.2 In `rack-3d.ts` ein unsichtbares Treffer-`InstancedMesh` für ausgefahrene Flaschen ergänzen (Matrizen in `placeSlot`, nur für die gewählte Reihe sichtbar) und den Tipp-Treffertest erweitern; im Browser prüfen, dass Tippen auf Etikett, Hals und Flaschenrand den richtigen Slot liefert und Tippen auf andere Reihen weiter die Reihe wählt

## 2. Kamerafahrt

- [x] 2.1 In `rack-3d.ts` Inputs `focusedSlot` und `bottomInset`, Outputs `bottleTapped` und `emptyTapped` ergänzen und die Kamerafahrt (Zielpunkt und Abstand, ≈ 450 ms, nur laufende Schleife bei Bewegung) samt `setViewOffset` für den freien Bereich über der Leiste umsetzen; im Browser prüfen, dass die Kamera weich zur Flasche fährt und das Etikett lesbar ist
- [ ] 2.2 Rückfahrt (Zielpunkt/Abstand der Reihenansicht, `minDistance` wiederherstellen), Wechsel zu anderer Flasche und anderer Reihe, „Ansicht zurücksetzen“ und `prefers-reduced-motion` (Sprung) umsetzen und im Browser prüfen; nach dem Wechsel aufs Raster laufen keine Frames mehr

## 3. Weinbeschreibung unten

- [ ] 3.1 In `rack-detail` Zustand `focused` mit sofortigen Kurzangaben und Nachladen über `ApiService.getWine` (Fehlerfall, verworfene veraltete Antworten) anlegen und per Unit-Test absichern (schneller Wechsel zeigt nur die letzte Antwort, Fehler lässt Kurzangaben stehen)
- [ ] 3.2 Beschreibungsleiste (unten in der 3D-Fläche, höchstens etwa ein Viertel der Höhe, scrollbarer Inhalt, feste Aktionen „Fach-Aktionen“, „Zum Wein“, „Zurück zur Reihe“) und das Ausblenden der Reihenliste im Fokus bauen; im Browser auf Desktop-Breite und Handy-Breite prüfen, dass die Flasche vollständig über der Leiste sichtbar ist
- [ ] 3.3 Zugänglichkeit: Region mit Beschriftung und `aria-live`, Fokus auf die Überschrift beim Öffnen, Escape schließt den Fokus, zweite Schaltfläche „Weinbeschreibung“ je Listeneintrag; per Tastatur vollständig durchbedienen und prüfen

## 4. Abschluss

- [ ] 4.1 Gesamtprüfung im 10 × 12 Regal: Reihe wählen, Flasche antippen, andere Flasche, zurück, Reihe wechseln, Fach-Aktionen aus der Leiste, „Zum Wein“; keine Konsolenfehler, `npm test` und `openspec validate focus-bottle-label` laufen durch

## Workflow follow-up

- Zuletzt archivieren, nach `improve-3d-rack-bottles` und `present-bottles-upright`.
