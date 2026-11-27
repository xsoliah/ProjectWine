# Tasks

## 1. Backend

- [x] 1.1 `ConsumptionRecord.EnsureValidRating` in `src/WineCellar.Domain/ConsumptionRecord.cs` anpassen: erlaubt 0,5–5 in Halbschritten sowie 6 (Top) und 7 (Hammer); Fehlermeldung und XML-Kommentar an `Rating` aktualisieren
- [x] 1.2 Gherkin in `tests/WineCellar.Specs/Features/Bewertungen.feature` ergänzen (Top, Hammer, ungültige Zwischenwerte wie 5,5 bzw. 6,5 und 8) und das Schritt-Parsing (`CommonSteps.ParseStars`) für „Top“/„Hammer“ erweitern

## 2. Frontend-Logik

- [x] 2.1 `web/src/app/shared/star-rating.logic.ts`: Konstanten für Top/Hammer, geordnete Stufenliste, `stepRating` über die Stufenliste, `ratingLabel` und `isTier`
- [x] 2.2 `star-rating.logic.spec.ts` um die neuen Stufen, die Schrittfolge 5 → Top → Hammer und die Labels erweitern

## 3. Frontend-UI

- [x] 3.1 Icons für Top und Hammer in `web/src/app/shared/icon.ts` hinzufügen
- [x] 3.2 `star-rating.ts`: Eingabefelder für Top und Hammer, Tastatursteuerung (`aria-valuemax`/`valuetext`), readonly-Darstellung mit Icon und Beschriftung statt Sternen, „Bewertung entfernen“ weiter funktionsfähig
- [x] 3.3 Archivkachel, Einzelansicht und Dialoge (`archive-entry-item`, `consume-dialog`, `entry-edit-dialog`) prüfen und anpassen
- [x] 3.4 `web/src/app/pages/archive/archive.views.ts`: Tabellenspalte, Pivot-Beschriftung, Filter „Bewertung ab“ (Auswahl inkl. Top/Hammer) und Ø-Anzeige an die neuen Stufen anpassen

## 4. Dokumentation und Verifikation

- [x] 4.1 README: Bewertungsskala inkl. Kodierung (6 = Top, 7 = Hammer) im API-Abschnitt ergänzen
- [x] 4.2 Tests ausführen (dotnet test, Vitest) und die Oberfläche in allen Themes im Browser prüfen (Eingabe, Kachel, Tabelle, Filter, Pivot)
