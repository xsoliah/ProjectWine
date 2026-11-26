# Tasks

## 1. Etikett-ID in der Regal-API

- [x] 1.1 `LabelImageId` zu `RackWineDto` und `Mapping.ToRackWine` hinzufügen und per Backend-Test prüfen, dass ein Regal mit einem Wein mit Etikett die ID liefert und ohne Etikett `null`
- [x] 1.2 `labelImageId?: string | null` in `RackWine` (`web/src/app/core/models.ts`) ergänzen und prüfen, dass die bestehenden Frontend-Tests (`racks.spec.ts`) weiter grün sind (`npm test`)

## 2. Realistische Flaschen

- [x] 2.1 Reine Hilfsdatei `web/src/app/shared/rack-3d-look.ts` mit Glas- und Kapselpalette je `WineType` anlegen; Unit-Test stellt sicher, dass jeder Typ eine Farbe hat und keine Farbe leuchtend ist (Helligkeits- und Sättigungsgrenzen)
- [x] 2.2 In `rack-3d.ts` die Farben aus `TYPE_VARS`/CSS durch die Palette ersetzen, Glas-Material mit niedriger Rauheit und Kapselfarbe je Typ verwenden, die Einfärbung der Hervorhebung entfernen; per Screenshot im Browser prüfen, dass Rotweinflaschen dunkel statt leuchtend rot erscheinen
- [x] 2.3 `RoomEnvironment` per `PMREMGenerator` als `scene.environment` einrichten, Lichtstärken anpassen und Ressourcen in `dispose()` freigeben; per Screenshot prüfen, dass Glas und Holz Reflexe zeigen, und dass beim Verlassen der Seite keine Fehler in der Konsole stehen

## 3. Etiketten auf den Flaschen

- [x] 3.1 Etikettenatlas in `rack-3d-look.ts` (Kachelzuteilung je `labelImageId`, Überlauf → neutrale Kachel 0) implementieren und per Unit-Test absichern: gleiche ID → gleiche Kachel, mehr IDs als Kacheln → Kachel 0, `null` → Kachel 0
- [x] 3.2 Gewölbtes Etikett-`InstancedMesh` mit Atlas-Material und Kachel-Attribut in `rack-3d.ts` ergänzen; im Browser prüfen, dass Flaschen mit Etikettenbild dieses und Flaschen ohne das neutrale Etikett zeigen
- [x] 3.3 Etikettenbilder über `ImageCache` laden, in den Atlas zeichnen und neu rendern; Fehlschlag eines Bildes und Regalwechsel während des Ladens behandeln; manuell prüfen, dass bei blockiertem Bild-Endpunkt (Netzwerk-Tab) die neutralen Etiketten erscheinen und die Ansicht bedienbar bleibt

## 4. Reihe fährt aus

- [x] 4.1 Reine Funktion `slidePose(progress)` (Verschiebung und Kippwinkel) samt Easing in `rack-3d-look.ts` anlegen; Unit-Test: Fortschritt 0 = Ruhelage, 1 = ausgefahren, Verlauf monoton
- [x] 4.2 In `rack-3d.ts` den Fortschritt je Reihe verwalten, Matrizen von Flaschen, Kapseln und Etiketten der betroffenen Reihen schreiben und eine nur bei Bedarf laufende Animationsschleife (≈ 350 ms) einbauen; im Browser prüfen: Reihe wählen → fährt heraus, andere Reihe wählen → alte fährt ein und neue heraus, Schließen → fährt ein
- [x] 4.3 `prefers-reduced-motion` berücksichtigen (ohne Animation direkt umschalten) und prüfen, dass nach Zerstören der Komponente keine Animationsschleife weiterläuft (keine weiteren Frames nach dem Wechsel auf das Raster)
- [x] 4.4 Mit dem höchsten und breitesten Testregal manuell prüfen: Flaschen der obersten und untersten Reihe kippen ohne Durchdringen von Regalteilen heraus, Antippen und Fach-Aktionen funktionieren weiter, die Bedienung bleibt flüssig

## 5. Spezifikation und Dokumentation

- [ ] 5.1 Beschreibung der 3D-Ansicht in der README (falls vorhanden) an Etiketten und Ausfahr-Animation anpassen und `openspec validate improve-3d-rack-bottles --strict` ausführen; der Befehl läuft fehlerfrei durch

## Workflow follow-up

- Nach `add-photo-capture` archivieren, damit die Capability `wine-label-image` vorliegt, danach diese Änderung archivieren.
