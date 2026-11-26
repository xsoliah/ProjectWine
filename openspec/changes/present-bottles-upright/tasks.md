# Tasks

## 1. Weißwein heller

- [x] 1.1 In `rack-3d-look.ts` `GLASS_BY_TYPE.White` (und `Rose`) neu festlegen und die Palettentests anpassen: Weißwein hell, niedrig gesättigt, Grün ≥ Gelb; die übrigen Typen bleiben natürlich (`npm test` grün)
- [x] 1.2 Im Browser prüfen, dass Weißweinflaschen weißlich, Rosé noch erkennbar rosa und Dessertwein weiter bernsteinfarben ist (Screenshot)

## 2. Drehen und Aufrichten beim Ausfahren

- [x] 2.1 `slidePose(progress)` in `rack-3d-look.ts` auf `{ z, roll, pitch }` mit gestaffelten Phasen umstellen; Unit-Test: Ruhelage bei 0, bei 1 Roll 180° und Pitch 90°, Verlauf monoton, Werte außerhalb 0…1 werden begrenzt
- [x] 2.2 `placeSlot` in `rack-3d.ts` auf die Quaternion `Rx(−pitch) · Rz(roll)` umstellen, die aufrechte Flasche so versetzen, dass das Etikett auf Fachhöhe liegt, und `PULL_OVERHANG` anpassen; im Browser prüfen, dass die Flaschen am Ende aufrecht stehen und das Etikett (z. B. „SASSICAIA“) frontal und lesbar ist
- [x] 2.3 Einfahren, Reihenwechsel und „Bewegung reduzieren“ prüfen: Flaschen legen sich beim Einfahren wieder hin, ohne Animation springen sie direkt in die Endpose, nach dem Wechsel aufs Raster laufen keine Frames mehr (Skript/Browser)
- [x] 2.4 Oberste und unterste Reihe in einem 10 × 12 Regal prüfen: aufrecht stehende Flaschen sind nicht abgeschnitten, Antippen und Fach-Aktionen funktionieren weiter

## 3. Abschluss

- [ ] 3.1 `openspec validate present-bottles-upright` ausführen (Warnungen zur Anforderungslänge bei MODIFIED sind bekannt) und die Anforderungstexte mit dem Stand nach Archivierung von `improve-3d-rack-bottles` abgleichen

## Workflow follow-up

- Erst `improve-3d-rack-bottles` archivieren, danach diese Änderung.
