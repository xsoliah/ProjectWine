# Proposal

## Why

Die Rebsorten eines Weins sind heute ein einziges Freitextfeld („Cabernet Sauvignon, Cabernet Franc“). Damit lässt sich weder sauber erfassen, aus welchen Rebsorten ein Wein besteht und zu welchen Anteilen, noch kann man auswerten, ob man eher rebsortenreine Weine oder Cuvées im Keller hat und welche Rebsorten dominieren. Tippvarianten wie „Spätburgunder“/„spätburgunder “ würden außerdem jede Auswertung verfälschen.

## What Changes

- Neu: Rebsorten werden wie Länder und Regionen als Stammdaten pro Benutzer gepflegt (anlegen, umbenennen, zusammenführen, löschen).
- Neu: Ein Wein hat 0 bis n Rebsorten in einer festen Reihenfolge, jeweils optional mit einem Anteil in Prozent (Summe höchstens 100 %). Jede Rebsorte darf pro Wein nur einmal vorkommen.
- Neu: Ein Wein mit genau einer Rebsorte gilt als **rebsortenrein**, ein Wein mit zwei oder mehr Rebsorten als **Cuvée**. Das wird beim Wein angezeigt.
- Neu: Im Wein-Formular werden Rebsorten aus der eigenen Liste gewählt, fehlende direkt angelegt, sortiert und mit optionalem Anteil versehen.
- Neu: Die Übersicht bekommt die Gruppierung **Rebsorte**: Rebsortenreine Weine zählen bei ihrer Rebsorte, alle Cuvées gemeinsam im Segment „Cuvée“. Antippen von „Cuvée“ zeigt die Verteilung nach Zusammensetzung (z. B. „Cabernet Sauvignon, Cabernet Franc“).
- Geändert: Die Kellersuche findet Weine auch über Rebsortennamen. Die Barcode-Vorbelegung ordnet gefundene Rebsorten vorhandenen Einträgen zu oder schlägt sie als neu vor.
- **BREAKING**: `grapes` ist in der API kein String mehr. `WineDto.grapes` wird eine Liste aus `{ id, name, percent }`, `SaveWineRequest.grapes` eine Liste aus `{ grapeId, percent }`. Vorhandene Freitexte werden per Migration übernommen.

## Capabilities

### New Capabilities
- `grape-varieties`: Stammdaten Rebsorte pro Benutzer, Zuordnung von 0..n Rebsorten mit optionalen Anteilen zu einem Wein, Einordnung rebsortenrein/Cuvée.

### Modified Capabilities
- `cellar-statistics`: zusätzliche Gruppierung „Rebsorte“ mit Segment „Cuvée“ und Drill-down nach Zusammensetzung.

## Impact

- **Domain**: neue Entitäten `GrapeVariety` und `WineGrape` (Zuordnung mit Position und Anteil); `Wine.Grapes` (string) entfällt.
- **Application**: neuer `GrapeService`; `WineService` (Speichern, Suche, Barcode-Abgleich), `Mapping`, `WineDto`, `SaveWineRequest`, `WineDraft`-Abgleich; `StatisticsService` um Gruppierung `Grape` und Cuvée-Drill-down.
- **Infrastructure**: Tabellen `grape_varieties` und `wine_grapes`, Spalte `wines.Grapes` entfällt; EF-Migration `AddGrapeVarieties` mit Übernahme der Freitexte (dein Konto enthält bereits Testweine mit Rebsorten).
- **API**: neue Endpunkte `/api/grapes`, `GET /api/statistics?groupBy=Grape[&cuvee=true]`.
- **Frontend**: Rebsorten-Auswahl im Wein-Formular, Anzeige im Wein-Detail, Pflegeseite „Rebsorten“ (aus den Einstellungen), neuer Chip „Rebsorte“ in der Übersicht.
- **Tests**: neues Feature `Rebsorten.feature`, Ergänzungen in `Statistik.feature`.
- **Zusammenspiel**: Der offene Change `add-wine-racks` ändert ebenfalls `WineDto`; wer später umgesetzt wird, übernimmt die Änderungen des anderen.
