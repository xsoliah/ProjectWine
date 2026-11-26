# Proposal

## Why

Nach dem Login sieht man heute direkt die Weinliste, aber keinen Überblick: Wie viele Flaschen liegen im Keller, wie verteilen sie sich auf Rot- und Weißwein, Länder, Regionen oder Winzer? Diese Auswertung ist außerdem unzuverlässig, weil Land und Region freie Textfelder ohne Verbindung sind. Tippvarianten wie „Toskana“/„Toscana“ oder „Italien“/„Italy“ zählen als verschiedene Werte, und eine Region kann keinem Land zugeordnet werden.

## What Changes

- Neu: Startseite „Übersicht“ nach dem Login mit Kennzahlen (Flaschen im Keller, Anzahl Weine, Gesamtwert nach Einkaufspreis) und einem Tortendiagramm der Flaschen.
- Neu: Die Verteilung lässt sich umschalten nach **Weintyp** (Rot, Weiß, Rosé, …), **Land**, **Region** oder **Winzer**. Beim Land kann man in die Regionen dieses Landes hineinklicken.
- Neu: Länder und Regionen werden als Stammdaten pro Benutzer gepflegt. Jede Region gehört zu genau einem Land. Beim Wein wählt man Land und Region aus der Liste und kann fehlende Einträge direkt dort anlegen. Eine eigene Seite erlaubt Umbenennen, Zusammenführen von Dubletten und Löschen.
- Geändert: Die Region eines Weins muss zum gewählten Land gehören. Ein Wein kann nur ein Land, nur ein Land mit Region oder gar keine Herkunft haben.
- Geändert: Die Vorbelegung per Barcode ordnet das gefundene Land einem vorhandenen Land zu (Name ohne Beachtung von Groß- und Kleinschreibung) oder schlägt es als neues Land vor.
- Geändert: Der Keller ist nicht mehr Startseite, sondern ein eigener Menüpunkt „Keller“.
- **BREAKING**: In der API ersetzen `countryId`/`regionId` die Freitextfelder `country`/`region` in `SaveWineRequest`. `WineDto` liefert Land und Region als Objekt mit Id und Name.

## Capabilities

### New Capabilities
- `wine-origins`: Stammdaten Land und Region pro Benutzer (anlegen, umbenennen, zusammenführen, löschen), die Verknüpfung Region → Land und die Zuordnung der Herkunft zu einem Wein.
- `cellar-statistics`: Startseite mit Kennzahlen zum Keller und Verteilung der Flaschen nach Weintyp, Land, Region oder Winzer als Tortendiagramm, mit Drill-down von Land zu Region.

### Modified Capabilities
<!-- Es gibt noch keine Spezifikationen unter openspec/specs/. -->

## Impact

- **Domain**: neue Entitäten `Country` und `Region`; `Wine.Country`/`Wine.Region` (string) werden zu `CountryId`/`RegionId`.
- **Application**: neuer `OriginService` (Länder/Regionen), neuer `StatisticsService`; `WineService` prüft die Herkunft, die Suche nutzt Länder- und Regionsnamen; `Mapping`, `WineDto`, `SaveWineRequest` und `WineDraft`-Abgleich werden angepasst.
- **Infrastructure**: Tabellen `countries` und `regions`, Fremdschlüssel in `wines`; EF-Migration `AddWineOrigins`.
- **API**: neue Endpunkte `/api/origins/...` und `/api/statistics`.
- **Frontend**: neue Startseite „Übersicht“ mit eigenem Tortendiagramm (SVG, keine neue Bibliothek), Auswahlfelder für Land/Region im Wein-Formular, Seite zur Pflege der Herkunft, Navigation und Routen angepasst.
- **Tests**: neue Reqnroll-Features `Herkunft.feature` und `Statistik.feature`; bestehende Steps, die Land/Region als Text setzen, werden angepasst.
- **Zusammenspiel**: unabhängig vom offenen Change `add-wine-racks`. Beide ändern `WineDto` und die Navigation; wer später umgesetzt wird, muss das berücksichtigen.
