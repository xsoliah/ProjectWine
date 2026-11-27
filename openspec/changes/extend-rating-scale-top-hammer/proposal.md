# Proposal

## Why

Die Bewertung mit 0,5 bis 5 Sternen reicht für unsere persönliche Skala nicht aus: Wir kennen darüber noch zwei Stufen – „Top“ (etwas ganz Feines, über 5 Sternen) und „Hammer“ (die oberste Klasse). Diese Weine lassen sich heute nicht von „nur“ sehr guten 5-Sterne-Weinen unterscheiden.

## What Changes

- Die Bewertungsskala wird um zwei Stufen über 5 Sternen erweitert: **Top** und **Hammer** (Hammer > Top > 5 Sterne).
- Top und Hammer sind eigene Stufen ohne Halbschritte; bis 5 Sterne bleibt die Skala in Halbschritten unverändert.
- Die Oberfläche zeigt Top und Hammer mit eigenen Icons (statt Sternen) und Beschriftung; die Eingabe erlaubt, nach den fünf Sternen auf Top bzw. Hammer zu wechseln (Maus/Touch und Tastatur).
- Die Validierung im Backend akzeptiert die neuen Stufen und lehnt weiterhin alles andere ab.
- Bestehende Bewertungen bleiben unverändert gültig (keine Datenmigration).
- Anzeige, Filter „Bewertung ab“, Sortierung, Pivot und Durchschnitt im Archiv berücksichtigen die neuen Stufen.

Außerhalb des Umfangs: weitere Stufen, frei konfigurierbare Skalen, Bewertung nicht getrunkener Weine.

## Capabilities

### New Capabilities
- `wine-rating`: Bewertungsskala getrunkener Weine (0,5–5 Sterne in Halbschritten plus „Top“ und „Hammer“), ihre Eingabe, Darstellung und Auswertung. Bisher nur implizit im Code und in Gherkin-Specs vorhanden, kein Eintrag unter `openspec/specs/`.

### Modified Capabilities
<!-- keine: list-table-pivot-views nennt „Bewertung“/„Durchschnittsbewertung“ nur als Spalte bzw. Kennzahl; deren Anforderungen ändern sich nicht -->

## Impact

- Backend: `ConsumptionRecord.EnsureValidRating` (Domain), Fehlermeldung; Contracts bleiben `double?`.
- Frontend: `star-rating.ts` / `star-rating.logic.ts` (+ Spec), `consume-dialog`, `entry-edit-dialog`, `archive-entry-item`, `archive.views.ts` (Filter, Spalte, Pivot, Durchschnitt), `icon.ts`.
- Tests: `Bewertungen.feature` (Gherkin) und Schritt `ParseStars`, Vitest-Spec der Rating-Logik.
- Keine DB-Migration; API-Feld `rating` bleibt eine Zahl.
