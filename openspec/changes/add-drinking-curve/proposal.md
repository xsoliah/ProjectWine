# Proposal

## Why

Die Einzelansicht zeigt heute nur ein grobes Trinkfenster („Trinkreif bis 2032“). Für einen Weinkenner ist entscheidend, **wann ein Wein am besten schmeckt** und wie lange er davor und danach noch gut ist: Ein Barolo hat einen scharfen Höhepunkt, ein einfacher Weißwein ein schmales Fenster, ein robuster Riesling ein sehr breites. Dieses Wissen steckt in Weinführern und Händlerseiten; die Foto-Erfassung recherchiert das Web ohnehin und kann es mit erfassen.

## What Changes

- Neu: **Trinkkurve.** Jeder Wein kann einen **optimalen Trinkzeitpunkt** (Jahr) und eine **Streuung** (Standardabweichung in Jahren) haben. Daraus entsteht eine Glockenkurve (Normalverteilung): Je größer die Streuung, desto länger schmeckt der Wein rund um den Höhepunkt gut.
- Neu: **Diagramm in der Einzelansicht.** Eine Kurve über die Jahre mit Markierung von „heute“, Höhepunkt und einer Einordnung in Worten (z. B. „Noch zu jung – Höhepunkt 2031“, „Nahe am Höhepunkt“, „Über den Höhepunkt hinaus“). Ohne Angaben wird nichts gezeigt.
- Neu: **Schätzung bei der Erfassung.** Der Recherche-Agent der Foto-Erfassung ermittelt Höhepunkt und Streuung auf Basis von Webquellen (Verkostungsnotizen, Trinkfenster-Empfehlungen, Rebsorte, Region, Jahrgang) und kennzeichnet sie als „aus dem Web“ oder – wenn aus Erfahrungswerten abgeleitet – als „geschätzt“. Ist nur ein Trinkfenster gefunden worden, wird die Kurve daraus abgeleitet (Mitte = Höhepunkt, Streuung = Viertel der Breite) und als „abgeleitet“ gekennzeichnet.
- Neu: **Manuell pflegen und nachschätzen.** Höhepunkt und Streuung sind im Wein-Formular editierbar. In der Einzelansicht kann der Benutzer für Weine ohne Kurve eine Schätzung anstoßen (eine Recherche des Tageslimits, mit Bestätigung).
- Geändert: Das bestehende Trinkfenster (von/bis) bleibt unverändert nutzbar für Liste, Filter, Pivot und Einlagerungsvorschlag.

## Capabilities

### New Capabilities
- `drinking-curve`: Optimaler Trinkzeitpunkt und Streuung eines Weins, Darstellung als Kurve in der Einzelansicht, Ableitung aus dem Trinkfenster, manuelle Pflege und Nachschätzung.

### Modified Capabilities
- `photo-capture`: Der Inhalt der Recherche umfasst zusätzlich Höhepunkt und Streuung samt Herkunftskennzeichnung; der Entwurf speichert sie, die Übernahme in den Wein überträgt sie.

## Impact

- **Domain/Infrastruktur**: `Wine.DrinkPeak` (int?) und `Wine.DrinkSpread` (double?, Jahre), Validierung in `EnsureValid`; Migration `AddDrinkingCurve`; entsprechende Felder am Erfassungsentwurf samt Herkunftskennzeichnung.
- **Recherche**: `ResearchPrompt` (Anweisung, Schema um `drinkPeak`, `drinkSpread`, Quelle `estimate`), `ResearchResponseReader`, `CaptureProcessor` (Plausibilisierung, Ableitung aus dem Fenster).
- **Application/API**: `Contracts` (`WineDto`, `SaveWineRequest`, Entwurfs-DTO), `Mapping`, `WineService`, `CaptureService`; neuer Aufruf `POST /api/wines/{id}/estimate-drinking-curve` (nutzt das Tageslimit).
- **Frontend**: `models.ts`, `capture.ts`, `wine-form`, `wine-detail` (neues Diagramm als eigene Komponente, SVG ohne Zusatzbibliothek), reine Kurvenlogik mit Tests.
- **Tests**: neue `Trinkkurve.feature`, Unit-Tests für Kurvenmathematik und Reader/Prompt, Komponententests im Frontend.
- **Nicht Teil**: Filter/Pivot/Spalten auf Basis der Kurve, Benachrichtigungen („Wein erreicht Höhepunkt“), Berücksichtigung von Lagerbedingungen oder Flaschengröße (Magnum reift langsamer), schiefe Verteilungen (die Kurve ist symmetrisch), automatische Nachschätzung des gesamten Bestands.
