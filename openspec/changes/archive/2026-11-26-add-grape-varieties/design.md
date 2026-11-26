# Design

## Context

- `Wine.Grapes` ist ein Freitext (max. 300 Zeichen), wird in der Kellersuche per `Contains` durchsucht und vom Barcode-Lookup als `WineDraft.Grapes` vorbelegt.
- Länder und Regionen wurden gerade mit demselben Muster als Stammdaten umgesetzt (`Country`/`Region` mit `NormalizedName`, `OriginService`, Pflegeseite `/origins`, Abgleich per Name im Formular). Dieser Change folgt diesem Muster, damit sich Rebsorten genauso bedienen lassen.
- `StatisticsService` lädt eine schmale Projektion der Kellerweine und gruppiert im Speicher; Drill-down gibt es bisher nur Land → Region (`groupBy=Region&countryId=…`).
- Die Datenbank enthält bereits Weine mit Rebsorten-Freitexten (Testdaten im Konto des Benutzers), die Übernahme muss also wirklich funktionieren.

Anforderungen: `specs/grape-varieties/spec.md`, `specs/cellar-statistics/spec.md`.

## Goals / Non-Goals

**Goals:**
- Rebsorten als saubere, benutzereigene Stammdaten mit einer geordneten n:m-Zuordnung zum Wein.
- Statistik, in der jede Flasche genau einmal zählt (passt zum Tortendiagramm).
- Bedienung im Formular, die auch auf dem Handy mit wenigen Taps auskommt.

**Non-Goals:**
- Mitgelieferte Rebsortenlisten, Synonyme (z. B. „Spätburgunder = Pinot Noir“ automatisch) oder Farbe der Rebsorte.
- Gewichtung der Statistik nach Prozentanteilen.
- Statistik „Wie oft kommt eine Rebsorte vor“ (Summe über 100 %); kann später als Balkendiagramm folgen.

## Decisions

### D1: Tabellen `grape_varieties` und `wine_grapes`
- `grape_varieties` (`Id`, `OwnerId`, `Name`, `NormalizedName`), eindeutiger Index (`OwnerId`, `NormalizedName`), FK zu `AspNetUsers` mit Cascade – analog zu `countries`.
- `wine_grapes` (`WineId`, `GrapeVarietyId`, `Position`, `Percent`), Primärschlüssel (`WineId`, `GrapeVarietyId`) → dieselbe Rebsorte kann pro Wein nur einmal vorkommen. FK Wein → Cascade (Wein löschen entfernt die Zuordnung), FK Rebsorte → Restrict (verwendete Rebsorte kann nicht gelöscht werden).
- `Position` (0-basiert) speichert die Reihenfolge; `Percent` ist `tinyint?`.
- In der Domain: `Wine.Grapes` wird `List<WineGrape>`; `Wine.SetGrapes(IReadOnlyList<(GrapeVariety, int?)>)` prüft Dubletten, Anteile 1–100 und Summe ≤ 100 und vergibt die Positionen. `Wine.IsCuvee => Grapes.Count >= 2`.
- *Alternative*: Rebsorten als JSON-Spalte am Wein → keine referenzielle Integrität, keine Abfrage „welche Weine nutzen Merlot“. Verworfen.

### D2: API-Vertrag
- `WineDto.Grapes: IReadOnlyList<WineGrapeDto>` mit `WineGrapeDto(Guid Id, string Name, int? Percent)` in gespeicherter Reihenfolge, plus `bool IsCuvee`.
- `SaveWineRequest.Grapes: IReadOnlyList<WineGrapeRequest>?` mit `WineGrapeRequest(Guid GrapeId, int? Percent)`; Reihenfolge = Listenreihenfolge; `null` = keine Rebsorten.
- `WineDraft.Grapes` bleibt Text. `BarcodeLookupResult` bekommt `DraftGrapes: IReadOnlyList<DraftGrapeDto>` mit `(string Name, Guid? GrapeId)`; der Service teilt den Text auf (gleiche Trennregel wie die Migration) und ordnet vorhandene Rebsorten zu.
- `/api/grapes`: `GET` (Liste mit Weinanzahl), `POST`, `PUT {id}`, `DELETE {id}`, `POST {id}/merge-into/{targetId}`.

### D3: `GrapeService`
Analog zu `OriginService`. Zusammenführen in einer Transaktion: Für jeden Wein mit der Quelle wird, wenn er die Ziel-Rebsorte schon hat, nur ein Eintrag an der kleineren Position behalten (Anteil = Summe, wenn mindestens einer angegeben ist; sonst leer), sonst die Zuordnung umgehängt; danach werden die Positionen lückenlos neu nummeriert und die Quelle gelöscht. Liegt die Summe danach über 100 (nur möglich bei inkonsistenten Altdaten), wird sie auf 100 gekappt.

### D4: Statistik
- `StatisticsGrouping.Grape`. Projektion um die sortierten Rebsorten-IDs/-Namen je Wein erweitert (ein zusätzlicher Join, weiterhin eine Abfrage).
- Gruppierung: 0 Rebsorten → `none` „Ohne Angabe“ (letztes Segment), 1 → Schlüssel = Rebsorten-ID, ≥ 2 → Schlüssel `cuvee`, Label „Cuvée“. „Cuvée“ ist ein normales, farbiges Segment und unterliegt der bestehenden Sortier- und „Sonstige“-Regel.
- Drill-down: `GET /api/statistics?groupBy=Grape&cuvee=true` → nur Cuvées, Schlüssel = sortierte Rebsorten-IDs (`id1+id2`), Label = Namen alphabetisch mit „, “. Antwort setzt `drillDown: "cuvee"`; das bisherige Feld `country` bleibt für Land → Region.
- `cuvee=true` mit einer anderen Gruppierung → 400.

### D5: Migration `AddGrapeVarieties` mit Datenübernahme
Neue Tabellen anlegen, dann per SQL: Separatoren `;`, `/`, `&` und ` und ` durch `,` ersetzen und den Text per `OPENJSON` (über `STRING_ESCAPE` in ein JSON-Array umgewandelt) mit Reihenfolge aufteilen. Das funktioniert ab SQL Server 2016; die Frage nach der Version des Produktionsservers entfällt damit. Teile trimmen, leere verwerfen, auf 100 Zeichen kürzen; je (`OwnerId`, `UPPER(name)`) eine Rebsorte anlegen (bei Schreibvarianten gewinnt die binär kleinste, also z. B. „Merlot“ vor „merlot“); `wine_grapes` in Ordinal-Reihenfolge füllen (Dubletten innerhalb eines Weins nur einmal). Danach Spalte `Grapes` löschen. `Down()` setzt den Text aus den Namen in Positionsreihenfolge (mit Anteilen als „ 85 %“), getrennt durch „, “, wieder zusammen.

### D5b: Gemeinsame Trennregel
Die Trennregel für Texte (Migration und Barcode-Vorbelegung) steht einmal im Application-Layer (`GrapeText.Split`) und ist per Reqnroll-Szenario abgesichert; die SQL-Variante in der Migration bildet sie nach und wird gegen Testdaten geprüft.

### D6: Frontend
- `shared/grape-picker.ts`: Liste der gewählten Rebsorten (Name, optionales Prozentfeld, Buttons ↑/↓/Entfernen) und darunter ein Eingabefeld mit `datalist` der noch nicht gewählten Rebsorten. Enter oder „Hinzufügen“ fügt eine vorhandene Rebsorte hinzu; ist der Name unbekannt, erscheint „„<Name>“ als Rebsorte anlegen“. Anzeige „Rebsortenrein“/„Cuvée“ und Summe der Anteile mit Warnung über 100 %.
- Vorschläge aus dem Barcode erscheinen als vorgemerkte Einträge mit Hinweis „neu“; erst beim Speichern des Weins werden sie angelegt (eine Bestätigung „neue Rebsorten anlegen?“ im Formular).
- Wein-Detail: „Rebsorten“ als Liste mit Anteilen plus Badge „Cuvée“/„Rebsortenrein“.
- Pflegeseite `pages/grapes` (Einstellungen → „Rebsorten“), Aufbau wie `/origins`.
- Übersicht: Chip „Rebsorte“; Segment „Cuvée“ ist antippbar (gleiche Mechanik wie Länder), Überschrift „Cuvées“, „Zurück zu den Rebsorten“.

## Risks / Trade-offs

- [Freitexte lassen sich nicht immer eindeutig aufteilen, z. B. „Cabernet Sauvignon 85%“] → Prozentangaben im Text werden nicht erkannt und landen im Namen; das ist selten und lässt sich in der Pflegeseite per Umbenennen/Zusammenführen bereinigen. Im Migrationstest mit genau solchen Texten prüfen und im Ergebnis berichten.
- [Breaking Change an `grapes` im Wein-Vertrag] → Frontend und Backend werden gemeinsam geändert, keine weiteren Clients.
- [Konflikt mit `add-wine-racks` (ebenfalls `WineDto`, `wine-form`)] → wer später umgesetzt wird, übernimmt die Änderungen des anderen.
- [`STRING_SPLIT` mit Ordinal erst ab SQL Server 2022] → Versionsprüfung vor der Umsetzung, Fallback per rekursiver CTE.

## Migration Plan

1. SQL-Server-Version prüfen, Domain/Infrastructure ändern, Migration `AddGrapeVarieties` erzeugen und um die Datenübernahme ergänzen.
2. In einer Wegwerf-Datenbank mit typischen Texten testen (Komma, Schrägstrich, „und“, Dubletten, Groß-/Kleinschreibung, leere Werte), dann zurück auf `AddWineOrigins` und wieder hoch.
3. Beim nächsten Start spielt die API die Migration in die echte Datenbank ein; danach die Rebsorten der Testweine stichprobenartig prüfen.
4. Rollback: `dotnet ef database update AddWineOrigins` stellt das Textfeld wieder her.
