# Tasks

Voraussetzung: `focus-bottle-label` ist umgesetzt (Flaschenzoom, Beschreibungsleiste).

## 1. Nachbarflasche

- [x] 1.1 Reine Funktion `neighborSlot(slots, current, direction)` in `rack-3d-look.ts` anlegen (nächste belegte Flasche links/rechts, `null` am Rand, leere Fächer übersprungen) und mit Unit-Tests absichern (Mitte, Rand, Lücken, einzelne Flasche)

## 2. Kamera und Wischen

- [x] 2.1 In `rack-3d.ts` die Kamerafahrt von Flasche zu Flasche (nur Zielpunkt; Abstand und Blickrichtung bleiben; ≈ 300 ms; Neustart ab aktueller Position; Sprung bei `prefers-reduced-motion`) umsetzen und im Browser prüfen, dass schnelles Durchblättern flüssig bleibt
- [ ] 2.2 Im Flaschenzoom `OrbitControls.enableRotate` ausschalten und eine horizontale Wischgeste auf der Canvas erkennen (Schwelle ≈ 40 px, überwiegend horizontal, < 500 ms) als Output `swipe`; Tipp-Erkennung unverändert lassen; im Browser prüfen, dass Tippen, Wischen und Pinch-Zoom sich nicht stören und das Drehen nach „Zurück zur Reihe“ wieder aktiv ist

## 3. Oberfläche

- [ ] 3.1 In `rack-detail` `focusedSlot` über `neighborSlot` auf „Vorherige“/„Nächste“, Pfeiltasten (nicht bei Eingabefeld oder Modal) und `swipe` umschalten; Weindaten über die vorhandene Nachladelogik laden (veraltete Antworten verwerfen); per Unit-Test absichern
- [ ] 3.2 Schaltflächen „Vorherige“/„Nächste“ am Rand der 3D-Fläche über der Leiste bauen (deaktiviert am Reihenende, `aria-label`) und die Positionsanzeige „Spalte x von y“ / „Flasche n von m“ in der Leiste ergänzen; im Browser auf Desktop- und Handybreite prüfen, dass nichts das Etikett verdeckt
- [ ] 3.3 Zugänglichkeit: neue Flasche und Position in der `aria-live`-Region, Fokus bleibt auf der gedrückten Schaltfläche; per Tastatur und Screenreader durchbedienen

## 4. Abschluss

- [ ] 4.1 Gesamtprüfung im 10 × 12 Regal: Reihe mit Lücken wählen, auf Flasche zoomen, mit Schaltflächen, Pfeiltasten und Wischen bis zum Rand navigieren, Rand prüfen, zurück zur Reihe; keine Konsolenfehler, `npm test` und `openspec validate navigate-focused-bottles` laufen durch

## Workflow follow-up

- Zuletzt archivieren, nach `focus-bottle-label`.
