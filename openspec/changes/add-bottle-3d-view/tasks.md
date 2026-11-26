# Tasks

## 1. Domäne und Flaschenmaß

- [x] 1.1 Typen für Flaschenmaß (Profil, Etikettenlage) samt JSON-Serialisierung und Plausibilitätsprüfung in Domain/Application anlegen; `Wine.BottleShapeJson`, `Wine.BottleImageId`, `CaptureDraft`-Felder, Migration `AddBottleShape`, `WineDto` um `bottleImageId` und `bottleShape` erweitern. Prüfen: Unit-Tests für Ableitung des Profils aus dem Umriss (Symmetrie, Glättung, Ablehnung unplausibler Umrisse) sind grün; `dotnet build` ohne Fehler.

## 2. Erkennung in der Recherche

- [x] 2.1 `ResearchPrompt` und JSON-Schema um `bottle` (Umriss, `isComplete`) erweitern, `ResearchResponseReader` validiert es; Auswertung im `CaptureProcessor`, Rückfall auf Standardflasche mit Hinweis „Flasche prüfen“. Prüfen: Reqnroll-Szenarien in `FotoErfassung.feature` mit simuliertem Agenten (vollständig, abgeschnitten, kein Umriss) sind grün; Limit steigt nur um 1.
- [x] 2.2 `IBottleImageExtractor` mit SkiaSharp (Polygonmaske, Alpha-PNG, höchstens 1600 px) und Anbindung im Entwurf. Prüfen: Test mit Beispielfoto ergibt transparenten Hintergrund und unveränderte Etikettengröße.
- [x] 2.3 Übernahme im `CaptureService.AcceptAsync`: Flaschenmaß und Flaschenbild gehen an den Wein, Löschen mit dem Wein. Prüfen: Szenarien „Übernehmen“ und „Wein löschen“ grün.

## 3. Anpassen und nachträglich erkennen

- [x] 3.1 `PUT /api/wines/{id}/bottle-shape` (anpassen, kein Limit) und `POST /api/wines/{id}/bottle-shape/detect` (zählt aufs Limit, abgelehnt bei erreichtem Limit oder ohne Originalfoto), plus Anpassen im Entwurf. Prüfen: neues Feature `Flaschenerkennung.feature` deckt Anpassen, Nachträglich erkennen, Limit, fremdes Bild ab und ist grün.

## 4. Frontend

- [x] 4.1 Gemeinsames Modul für Flaschenprofil und Konstanten aus `rack-3d` auslagern; `Wine`-Modell und `ApiService` erweitern. Prüfen: `ng build` und `ng test` grün, Regalansicht unverändert (Sichtprüfung).
- [x] 4.2 Komponente `bottle-3d` mit Profil aus dem Flaschenmaß, gewölbtem Etikett in echter Größe/Lage, begrenzter Drehung, Tastatursteuerung, WebGL-Rückfall und Aufräumen. Prüfen: Logiktests für Etikettenwinkel und -höhe aus dem Flaschenmaß (inkl. Begrenzung auf Umfang); Sichtprüfung im Browser mit schmalem, breitem und außermittigem Etikett.
- [x] 4.3 Detailansicht: Umschalter zwischen Etikettenbild und 3D-Ansicht, Aktion „Flasche erkennen“; Editor für Umriss und Etikettenlage im Entwurf und in der Detailansicht; Hinweis „Flasche prüfen“. Prüfen: Sichtprüfung im Browser, Anpassen wirkt ohne Neuladen.
- [x] 4.4 Kellerliste zeigt das Flaschenbild, sonst wie bisher. Prüfen: Sichtprüfung mit und ohne Flaschenbild, Textersatz vorhanden.

## 5. Abschluss

- [ ] 5.1 Live-Test mit echtem API-Schlüssel nach Rückfrage (verursacht Kosten): 3–5 Flaschenfotos, Treffsicherheit von Umriss und Etikettenlage, Dauer und Kosten je Recherche messen und in der README notieren; README um Hinweis zum Fotografieren (Flasche aufrecht, ganz im Bild) ergänzen.
- [ ] 5.2 Durchgängig im Browser: erfassen, übernehmen, 3D-Ansicht prüfen, anpassen, „Flasche erkennen“ bei bestehendem Wein, Limit erreichen, WebGL deaktiviert.
