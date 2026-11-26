# Design

## Context

- `rack-3d-look.ts` enthält Palette, Etikettenatlas und `slidePose(progress)`; `rack-3d.ts` schreibt je Flasche eine Matrix aus Verschiebung `z` und Kippwinkel um die X-Achse (50°). Das Etikett sitzt oben (+Y) auf der liegenden Flasche, der Hals zeigt zum Betrachter (+Z).
- Weißwein ist bisher `#8a9a52` (gelbgrün); der Test prüft nur Höchstwerte (kein leuchtendes Rot, Sättigung < 0,8).
- Aufgestellte Flaschen sind 2,9 Einheiten lang, ein Fach ist 1 hoch: Eine aufrechte Flasche ragt über ihre Reihe hinaus.

Motivation: `proposal.md`. Anforderungen: `specs/wine-racks/spec.md`.

## Goals / Non-Goals

**Goals:**
- Aufrechte Flasche mit frontalem, lesbarem Etikett als Endpose, eine stimmige Bewegung dorthin.
- Weißwein erkennbar weiß, ohne dass er mit Rosé verwechselt wird.

**Non-Goals:**
- Zoomen und Beschreibung (eigene Änderung `focus-bottle-label`).
- Kollisionsfreie Darstellung aufrechter Flaschen gegenüber den Flaschen anderer Reihen (siehe Risiken).

## Decisions

### D1: Weißwein: heller Glasfarbton
`GLASS_BY_TYPE.White` wird auf ein sehr helles, leicht grünliches Weiß (um `#dfe6cf`) gesetzt, Rosé bleibt blasser Rosaton und rückt farblich ab (um `#d9b4b0`), damit beide unterscheidbar bleiben. Die Palettentests werden angepasst: die Obergrenze für den größten Kanal (0xc8) gilt nicht mehr pauschal, sondern es gilt „keine leuchtende Farbe“ über Sättigung; Weißwein bekommt eine eigene Prüfung (Helligkeit hoch, Sättigung niedrig, Grünanteil ≥ Gelbanteil).
*Alternative*: nur Glas aufhellen über Material-Einstellung (Transmission/Opacity) → teurer, schwer pro Typ zu steuern. Verworfen.

### D2: Pose: Rollen, Aufrichten, Herausfahren
Die Matrix je Flasche wird aus drei Teilen komponiert (Fortschritt `p`, drei zeitlich gestaffelte Phasen mit `smoothstep`-Fenstern):
1. **Herausfahren** entlang +Z (wie bisher, `PULL_DISTANCE`), Phase ≈ 0–0,7.
2. **Rollen** um die eigene Längsachse (Z) um 180°, damit das Etikett von oben (+Y) nach unten (−Y) wandert; Phase ≈ 0,1–0,6.
3. **Aufrichten** um die X-Achse um −90° (Hals nach oben); nach dem Rollen zeigt das Etikett dabei nach vorn (+Z). Phase ≈ 0,45–1,0.
Die Quaternion ist `Rx(−pitch) · Rz(roll)` (erst rollen, dann aufrichten). `slidePose(p)` liefert `{ z, roll, pitch }` und bleibt eine reine, testbare Funktion (Endwerte, Monotonie, Anfang = Ruhelage). Beim Einfahren läuft dieselbe Funktion rückwärts.
Die Hochachse der aufrechten Flasche wird so verschoben, dass ihr Etikett (Mitte bei ≈ 0,95 vom Boden) etwa auf Höhe der Fachmitte liegt; der Hals ragt nach oben, der Boden nach unten über die Reihe hinaus.
*Alternative*: nur um die Längsachse rollen und liegen lassen → das Etikett zeigt dann nach vorn-unten, bleibt aber im Verhältnis zur Kamera stark verkürzt. Verworfen.
*Alternative*: Flasche aufrecht auf dem Regalboden vor dem Regal „abstellen“ → braucht mehr Platz nach vorn und wirkt nicht wie Herausziehen. Verworfen.

### D3: Kamerarand
`PULL_OVERHANG` steigt von 0,9 auf etwa 1,1 (halbe Flaschenlänge − halbe Fachhöhe − Etikettversatz), damit die Flaschen der obersten und untersten Reihe nicht am Rand abgeschnitten werden; die Zahl wird per Screenshot an den größten Regalen geprüft.

## Risks / Trade-offs

- [Aufrechte Flaschen überdecken Teile der Nachbarreihen] → Gewollt (die Flaschen stehen vor dem Regal); der goldene Rahmen und die Reihenliste zeigen weiter, welche Reihe gemeint ist. Falls es stört, ist `PULL_DISTANCE` einfach vergrößerbar.
- [Phasen wirken ruckartig] → Fenster und Dauer (`PULL_DURATION_MS`, ggf. 450 ms) per Sichtprüfung nachjustieren.
- [Hellere Weißweinflaschen verschwinden vor dem hellen Holz] → Per Screenshot prüfen; notfalls etwas Grün/Grau im Farbton beibehalten.
