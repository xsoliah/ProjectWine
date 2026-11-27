# Tasks

## 1. Berechnung

- [x] 1.1 In `web/src/app/core/bottle.ts` `backLabelFrame(shape, length, photoAspect)` ergänzen: Mitte bei `centerAngle + π`, Höhe wie vorn, Bogen aus dem Seitenverhältnis, begrenzt auf die Lücke zum Vorderetikett, Proportionen erhalten. Prüfen: Tests in `bottle.spec.ts` für normales, breites und hochformatiges Foto sowie ein Vorderetikett mit sehr großem Bogen; keine Überlappung.
- [x] 1.2 `stepView` um einen Parameter für den Azimut-Spielraum erweitern (unbegrenzt bei Rückseite). Prüfen: Tests, dass ohne Rückseite bei ±110° gestoppt wird und mit Rückseite darüber hinaus gedreht wird.

## 2. 3D-Komponente

- [x] 2.1 `app-bottle-3d`: Eingabe `backImageId`; `labelGeometry` für beliebigen Winkel-, Höhen- und UV-Bereich verallgemeinern; zweites Etikett-Mesh mit eigener Textur, Laden über `ImageCache`, Aufräumen in `dispose`. Prüfen: `ng build`; im Browser sitzt das Rückenetikett gegenüber dem Vorderetikett, ohne Rückseite fehlt es.
- [x] 2.2 Drehgrenzen: mit `backImageId` keine Azimutgrenzen (Maus, Finger, Pfeiltasten), ohne wie bisher; beim Wechsel zurück in den begrenzten Bereich holen. Prüfen: Sichtprüfung im Browser, beide Fälle.
- [x] 2.3 Schaltfläche „Rückseite zeigen“ / „Vorderseite zeigen“ mit weicher Drehung und Sprung bei „Bewegung reduzieren“; „Ansicht zurücksetzen“ zeigt die Vorderseite; Hilfetext anpassen. Prüfen: Sichtprüfung inkl. Tastatur und schmaler Breite.

## 3. Einbindung

- [x] 3.1 `wine-detail.html`: `[backImageId]="w.backImageId"` an `app-bottle-3d` übergeben. Prüfen: Rückseite hinzufügen, ersetzen und entfernen wirkt ohne Neuladen in der 3D-Ansicht.
- [x] 3.2 Integrationsprüfung im Browser (Wein mit und ohne Rückseite, breites Foto); `ng test` und `ng build` grün.
