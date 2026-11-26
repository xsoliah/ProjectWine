# Design

## Context

- `Wine` hat heute `Country` und `Region` als freie Strings (max. 100/200 Zeichen); die Suche in `WineService.ListAsync` durchsucht `Region` per `Contains`. Der Barcode-Lookup (`OpenFoodFactsBarcodeLookup`) liefert ein Land als englischen Namen (z. B. „Italy“) und keine Region.
- Schichten und Muster wie in `add-wine-racks/design.md`: Besitzerfilter über `ICurrentUser`, Fehler über `DomainException`/`ConflictException`/`NotFoundException` → 400/409/404.
- Datenbankschema per EF-Migrationen (`src/WineCellar.Infrastructure/Migrations`), die API spielt sie beim Start ein.
- Frontend: Angular 22, Standalone-Komponenten, Signals, keine Chart-Bibliothek; Farben über CSS-Variablen mit hellem und dunklem Design. Die Startroute `''` zeigt heute `Cellar`.
- Die Datenbank enthält zurzeit keine Weine; Freitextwerte müssen trotzdem migriert werden können (andere Installationen, z. B. auf dem IIS-Server).

Anforderungen: `specs/wine-origins/spec.md` und `specs/cellar-statistics/spec.md`.

## Goals / Non-Goals

**Goals:**
- Herkunft als saubere, benutzereigene Stammdaten mit referenzieller Integrität.
- Statistik serverseitig in einer Abfrage pro Gruppierung berechnen, damit sie auch mit vielen Weinen schnell ist und auf dem Handy wenig Daten überträgt.
- Tortendiagramm ohne neue Abhängigkeit, passend zu hellem/dunklem Design.

**Non-Goals:**
- Globale bzw. mitgelieferte Länder-/Regionslisten, Übersetzungen von Ländernamen oder ISO-Codes.
- Winzer als Stammdaten (bleibt Freitext; Gruppierung normalisiert nur Groß-/Kleinschreibung und Leerzeichen).
- Statistiken über das Archiv (Getrunkenes, Ausgaben über Zeit), Zeitverläufe oder Export.
- Filtern der Kellerliste durch Klick auf ein Segment.

## Decisions

### D1: Länder und Regionen als eigene Tabellen pro Benutzer
`countries` (`Id`, `OwnerId`, `Name`) und `regions` (`Id`, `CountryId`, `OwnerId`, `Name`). `wines` bekommt `CountryId` und `RegionId` (beide nullable).
- Eindeutige Indizes auf (`OwnerId`, `NormalizedName`) bzw. (`CountryId`, `NormalizedName`) mit einer Spalte `NormalizedName = Trim().ToUpperInvariant()` (vom Domain-Modell gesetzt). So greift die Eindeutigkeit auch unter Groß-/Kleinschreibung, unabhängig von der Collation.
- FK `Wine.CountryId → Country` und `Wine.RegionId → Region` mit `Restrict`, damit verwendete Einträge nicht gelöscht werden können; FK `Region.CountryId → Country` mit `Cascade`.
- Die Regel „Region gehört zum Land des Weins“ prüft `WineService` (beim Speichern) bzw. `OriginService` (beim Zusammenführen). Ein zusammengesetzter FK (`RegionId`, `CountryId`) wurde verworfen: `CountryId` wäre Teil zweier FKs, und EF Core setzt beim Lösen einer Beziehung alle FK-Spalten auf null, also auch das Land.
- *Alternative*: nur `RegionId` am Wein speichern und das Land daraus ableiten → „nur Land ohne Region“ wäre nicht möglich. Verworfen.
- *Alternative*: globale gemeinsame Liste → Benutzer würden Einträge anderer sehen und ändern. Verworfen (alles andere in der App ist privat).

### D2: Datenmigration der Freitexte in der EF-Migration
Die Migration `AddWineOrigins` legt die Tabellen an und übernimmt per SQL alle vorhandenen `(OwnerId, Country, Region)`-Werte: pro Benutzer je ein Land pro getrimmtem, normalisiertem Ländernamen, je eine Region pro Land und Regionsname. Danach werden `CountryId`/`RegionId` gesetzt und die alten Spalten gelöscht. Hat ein Wein eine Region ohne Land, wird ein Land „Unbekannt“ angelegt, damit keine Information verloren geht. `Down()` stellt die Textspalten aus den Namen wieder her.

### D3: `OriginService` und API `/api/origins`
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/origins` | Länder mit Regionen und Anzahl Weine |
| POST | `/api/origins/countries` | Land anlegen |
| PUT | `/api/origins/countries/{id}` | Umbenennen |
| POST | `/api/origins/countries/{id}/merge-into/{targetId}` | Zusammenführen |
| DELETE | `/api/origins/countries/{id}` | Löschen |
| POST | `/api/origins/countries/{id}/regions` | Region anlegen |
| PUT / DELETE | `/api/origins/regions/{id}` | Umbenennen / Löschen |
| POST | `/api/origins/regions/{id}/merge-into/{targetId}` | Zusammenführen |

Zusammenführen läuft in einer Transaktion: Weine umhängen, beim Land gleichnamige Regionen zuerst zusammenführen, restliche Regionen verschieben, Quelle löschen.

### D4: Änderungen am Wein-Vertrag
- `SaveWineRequest`: `Country`/`Region` (string) → `CountryId`/`RegionId` (Guid?).
- `WineDto`: `Country`/`Region` → `Country: OriginRefDto?`, `Region: OriginRefDto?` (`Id`, `Name`).
- `WineDraft` bleibt mit `Country` als String; `WineService.LookupBarcodeAsync` ergänzt `DraftCountryId`, wenn ein eigenes Land gleichen Namens existiert. Das Frontend schlägt sonst „neues Land anlegen“ vor.
- Suche in `ListAsync`: durchsucht `Country.Name` und `Region.Name` per Join statt der Textspalten.

### D5: `StatisticsService` und API `GET /api/statistics?groupBy=type|country|region|producer[&countryId=…]`
Antwort: `{ totals: { bottles, wines, totalValue, winesWithoutPrice }, groupBy, countryId?, segments: [{ key, label, bottles, percent, isUnknown }] }`.
- Gruppierung per LINQ `GroupBy` über `Wines.Where(Owner && Quantity > 0)`; Sortierung, Prozentrundung, „Sonstige“-Bildung (> 8 Segmente → Top 7 + Sonstige, mit Liste der zusammengefassten Einträge) und die Position von „Ohne Angabe“ im Service, nicht im Client, damit sie testbar sind.
- Winzer: Schlüssel `Producer.Trim().ToUpper()`, Anzeige = alphabetisch erste vorkommende Schreibweise (getrimmt).
- Region: Schlüssel `RegionId` bzw. `none:{CountryId}`; Label „Region (Land)“ bzw. „Ohne Region (Land)“.
- Drill-down: `groupBy=region&countryId=…` liefert nur Regionen dieses Landes, Labels ohne Landesnamen.
- Prozent: `Math.Round(100.0 * bottles / total, MidpointRounding.AwayFromZero)`; die Summe darf durch Rundung von 100 abweichen.
- Weintyp-Labels (Rotwein, Weißwein, …) liefert das Frontend aus der vorhandenen `labels.ts`; die API gibt den Enum-Namen als `key` zurück.

### D6: Tortendiagramm als eigene SVG-Komponente
`shared/donut-chart.ts`: Ringdiagramm aus `<path>`-Bögen, Gesamtzahl in der Mitte, Segmente als `<button>`-artige Ziele (`role="button"`, `tabindex`) nur im Drill-down-fähigen Modus. Farben aus einer festen Palette von 8 CSS-Variablen (`--chart-1` … `--chart-8`, plus `--chart-muted` für „Ohne Angabe“/„Sonstige“), für beide Designs definiert.
- *Alternative*: Chart.js/ECharts → +60–300 KB im Bundle und eigenes Theming, für ein einzelnes Ringdiagramm unverhältnismäßig. Verworfen.

### D7: Frontend-Struktur
- Neue Seite `pages/overview` an Route `''`; `Cellar` wandert nach `/cellar`. Navigation: Übersicht, Keller, Archiv, Einstellungen. Interne Links auf `/` (z. B. „Zurück zum Keller“ nach dem Speichern) werden auf `/cellar` geändert.
- Gruppierungsauswahl als Segmented Control; die zuletzt gewählte Gruppierung wird im `localStorage` gemerkt (reine Komfortfunktion).
- Wein-Formular: zwei Comboboxen (Eingabe mit Vorschlagsliste) für Land und Region; ist der eingegebene Text kein vorhandener Eintrag, erscheint die Option „„<Text>“ anlegen“, die den Eintrag per API anlegt und auswählt.
- Neue Seite `pages/origins` (aus Einstellungen verlinkt): Länder mit aufklappbaren Regionen, Aktionen Umbenennen, Zusammenführen (Zielauswahl), Löschen (deaktiviert mit Hinweis, wenn verwendet).

## Risks / Trade-offs

- [Breaking Change am Wein-API-Vertrag] → Frontend und Backend werden gemeinsam geändert, keine weiteren Clients.
- [Migration fasst Freitexte nur bei exakt gleichem Namen (ohne Groß-/Kleinschreibung) zusammen; „Toskana“ und „Toscana“ bleiben getrennt] → Zusammenführen-Funktion in der Herkunftspflege.
- [Region passt nicht zum Land, wenn Daten an den Services vorbei geändert werden] → nur die Services schreiben; Wein-FKs mit `Restrict`, nur Land→Region kaskadiert (SQL-Server-Cascade-Pfade).
- [Konflikt mit dem offenen Change `add-wine-racks`, der ebenfalls `WineDto` und die Navigation ändert] → wer später umgesetzt wird, übernimmt die Änderungen des anderen; Navigation dann: Übersicht, Keller, Regale, Archiv, Einstellungen.
- [Statistikabfrage bei sehr vielen Weinen] → es wird nur eine schmale Projektion (Typ, Anzahl, Preis, Winzer, Land, Region) geladen und im Speicher gruppiert; bei Bedarf Index auf (`OwnerId`, `Quantity`).

## Migration Plan

1. Domain/Infrastructure ändern, Migration `AddWineOrigins` inklusive Datenübernahme erzeugen.
2. Migration lokal gegen eine Datenbank mit Testdaten in Freitextform prüfen (vorher Weine mit `Country`/`Region` anlegen, danach Ergebnis prüfen).
3. Beim nächsten Start spielt die API die Migration automatisch ein.
4. Rollback: `dotnet ef database update Initial` (bzw. die vorherige Migration) stellt die Textspalten wieder her.
