## 1. Application: Bewertung und Vorschlag

- [x] 1.1 Verträge in `Contracts.cs`: `PlacementSuggestionDto`, `SuggestedSlotDto`, `PlaceBottlesRequest`/`PlaceBottleTarget`
- [x] 1.2 `PlacementSuggestionService`: Ähnlichkeit zweier Weine (Punktetabelle als Konstanten) und Fachwert aus der Nachbarschaft (Abzug für fremde, Bonus für leere Nachbarn)
- [x] 1.3 Auswahl des besten zusammenhängenden Abschnitts je Reihe, Fortsetzung in angrenzender Reihe bzw. anderem Regal, deterministischer Tiebreak
- [x] 1.4 Leeres Regal bzw. keine ähnlichen Weine, zu wenig Platz (`Unplaceable`), Begründungstext auf Deutsch
- [x] 1.5 Registrierung in `DependencyInjection.cs`

## 2. Application: Mehrere Flaschen einlagern

- [x] 2.1 `RackService.PlaceManyAsync`: eine Transaktion; Prüfung von Besitz, Fachgrenzen, freien und doppelten Fächern, Anzahl ≤ nicht eingelagerte Flaschen; Konflikt mit verständlicher Meldung
- [x] 2.2 Prüfungen mit `PlaceAsync` teilen (kein doppelter Regeltext)

## 3. Api

- [x] 3.1 `GET /api/wines/{id}/placement-suggestion?count=n` (privat, fremder Wein → 404)
- [x] 3.2 `POST /api/racks/placements`

## 4. Tests (Backend)

- [x] 4.1 Unit-Tests der Bewertung: gleiche Region, Erzeuger vor Region, ähnlicher Jahrgang, gleicher Wein, Exot in freier Ecke
- [x] 4.2 Unit-Tests: mehrere Flaschen (Abschnitt, Reihe zu kurz, mehrere Regale), leeres Regal, zu wenig Platz, Determinismus
- [x] 4.3 `Einlagerungsvorschlag.feature` (SpecFlow): Vorschlag übernehmen, Fach inzwischen belegt (nichts eingelagert), zu viele Flaschen, fremder Wein

## 5. Frontend

- [x] 5.1 `models.ts`, `api.service.ts`: `getPlacementSuggestion`, `placeBottles`
- [x] 5.2 `placement-step` (Vorschlag, Begründung, Mini-Raster, „Einlagern“ / „Selbst wählen“ / „Später“, neuer Vorschlag bei Konflikt)
- [x] 5.3 `wine-new` und `draft-review`: nach Speichern bzw. „Flaschen hinzufügen“ den Schritt zeigen (nur bei freien Fächern; Hinweis „Regal anlegen“ ohne Regal), danach zur Weinseite
- [x] 5.4 `wine-detail`: „Einlagerung vorschlagen“ bei nicht eingelagerten Flaschen
- [x] 5.5 Frontend-Tests der Ablaufentscheidung (Schritt anzeigen ja/nein, Anzahl der Flaschen)

## 6. Abschluss

- [x] 6.1 `README.md` ergänzen (Funktion „Einlagerungsvorschlag“, Bewertungsregeln kurz)
- [x] 6.2 Manuelle Prüfung: Wein per Hand, per Foto und „Flaschen hinzufügen“ einlagern; zweites Gerät belegt ein Fach
