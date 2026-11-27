# Tasks

## 1. Kurvenlogik (rein)

- [x] 1.1 Frontend `drinking-curve.logic.ts`: Dichte (Höhepunkt = 100 %), Ableitung aus dem Fenster, Einordnung (80-%-Schwelle), Achsenbereich und Teilstriche, Punkte für den SVG-Pfad. Prüfen: Vitest für Höhepunkt = 100 %, Breite wächst mit σ, Ableitung 2024–2032 → 2028/σ 2, Mindest-σ 0,5, Einordnungstexte für die drei Szenarien sind grün.

## 2. Daten und Domäne

- [x] 2.1 `Wine.DrinkPeak`/`DrinkSpread` samt Validierung in `EnsureValid` (gemeinsam oder gar nicht, σ 0 < σ ≤ 50, Jahr 1800 … aktuell + 100), Quelle `Estimate`/`Derived` im Recherche-Ergebnis des Entwurfs. Prüfen: `dotnet build` ohne Fehler.
- [x] 2.2 Migration `AddDrinkingCurve` (nullable Spalten am Wein; der Entwurf nutzt sein Ergebnis-JSON). Prüfen: Migration läuft auf einer Kopie der Entwicklungsdatenbank, Bestand bleibt unverändert.

## 3. Recherche und Erfassung

- [x] 3.1 `ResearchPrompt`/`ResearchSchema`: Anweisung zu Trinkzeitpunkt und Streuung (Orientierungswerte, Quelle `estimate` nur bei Ableitung, `null` ohne belastbare Basis), Felder `drinkPeak`, `drinkSpread` im Schema; `ResearchResponseReader` liest sie. Prüfen: Unit-Tests `ResearchPromptTests`/`ResearchResponseReaderTests` für Lesen, fehlende Felder und Quelle `estimate`.
- [x] 3.2 `CaptureProcessor`: Plausibilisierung (gemeinsam, Bereiche, Jahrgang), Ableitung aus dem Fenster mit Quelle `derived`, Übernahme in Entwurf. Prüfen: Szenarien „Entwurf mit Trinkkurve“, „Geschätzt statt belegt“, „Aus dem Fenster abgeleitet“, „Unplausible Werte“ in `FotoErfassung.feature` sind grün.
- [x] 3.3 `CaptureService` und `WineService`: Entwurfs-DTO mit den neuen Feldern und Quellen, Übernahme als Wein, Speichern über `SaveWineRequest`, `Mapping`/`WineDto`. Prüfen: Szenarien „Werte speichern“, „Unvollständige Angabe“, „Ungültige Streuung“ in der neuen `Trinkkurve.feature` sind grün.

## 4. Nachschätzung

- [x] 4.1 Agentenaufruf nur mit Text (Name, Winzer, Jahrgang, Art, Region, Rebsorten) über die bestehende Recherche-Abstraktion, `WineService.EstimateDrinkingCurveAsync` und `POST /api/wines/{id}/estimate-drinking-curve` mit Tageslimit, Besitzerprüfung und Meldung bei „nichts gefunden“ (Wein unverändert, Fenster unberührt). Prüfen: Szenarien „Schätzung für Bestandswein“, „Tageslimit erreicht“, „Nichts gefunden“ sind grün (mit Fake-Agent).

## 5. Frontend

- [x] 5.1 `models.ts`, `capture.ts`, `ApiService`: neue Felder, Quellenkennzeichnung (inkl. „geschätzt“/„abgeleitet“), `estimateDrinkingCurve`. Prüfen: `ng build` ohne Fehler, `capture.spec.ts` um die neuen Felder ergänzt und grün.
- [x] 5.2 Komponente `drinking-curve-chart` (SVG, Fläche, „heute“-Linie, Höhepunktpunkt, Jahresachse, Textalternative, Kennzeichnung „Schätzung“/„abgeleitet“). Prüfen: Logik-Tests (Pfad, Marker, Achse) in `drinking-curve.logic.spec.ts` statt Komponententest (im Projekt nicht üblich); Sichtprüfung im Browser in hellem und dunklem Theme sowie schmal.
- [x] 5.3 `wine-detail`: Diagramm mit Einordnung, Schaltfläche „Trinkzeitpunkt schätzen“ mit Bestätigung (Limit-Hinweis; Überschreiben bei vorhandener Kurve), Meldungen bei Limit/„nichts gefunden“. Prüfen: Szenarien „Kurve mit Höhepunkt und heute“, „Keine Angaben“, „Ableitung für Bestandswein“ im Browser nachvollzogen, Komponententest grün.
- [x] 5.4 `wine-form`: Felder Trinkzeitpunkt und Streuung mit Kurvenvorschau und Quellenmarke aus dem Entwurf; Leeren beider Felder entfernt die Kurve; Validierungsmeldung bei unvollständiger Angabe. Prüfen: Komponententest und Sichtprüfung für „Werte korrigieren“.

## 6. Abschluss

- [x] 6.1 Integrationsprüfung: Wein per Foto-Erfassung (mit Fake- oder echtem Agenten) erfassen, Entwurf prüfen, übernehmen, Kurve in der Einzelansicht sehen; Bestandswein nachschätzen; `dotnet test` und `ng test` grün; `drinking-curve`- und `photo-capture`-Spec stimmen mit dem Verhalten überein.
