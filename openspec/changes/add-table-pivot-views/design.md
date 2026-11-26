# Design

## Kontext

Beobachtet: `Cellar` lädt per `resource` die Weine (`api.listWines` mit `search`/`type`), `Archive` die Einträge (`listArchive(kind)`), `Racks` die Regalübersichten. Suche und Weinart stehen im Keller schon in der URL (`?q=`, `?type=`). `Wine` enthält Land, Region, Rebsorten, Jahrgang, Trinkfenster, Preis und Flaschenzahl; `ArchiveEntry` enthält Weinname, Winzer, Jahrgang, Art, Abgangsart, Datum, Preis, Bewertung; `RackSummary` Maße und Belegung, `Rack` zusätzlich die belegten Fächer mit Wein. Bestände eines Benutzers sind klein bis mittel (Hunderte bis wenige Tausend Zeilen).

## Entscheidungen

1. **Alles im Frontend.** Die Listen werden ohnehin vollständig geladen; Sortieren, Filtern und Pivotieren sind lokal schnell und brauchen keine neuen Endpunkte. Der Keller lädt künftig ohne serverseitige Suche/Weinart und filtert lokal, damit alle Filter einheitlich wirken (Suche bleibt in der URL). Alternative (serverseitig) verworfen: viel Aufwand, kein Nutzen bei dieser Datenmenge.
2. **Eine gemeinsame Spaltendefinition je Liste.** Jede Liste beschreibt ihre Felder einmal (Schlüssel, Titel, Typ Text/Zahl/Datum/Auswahl, Werte-Getter). Tabelle, Filter, Pivot-Dimensionen und CSV leiten sich daraus ab. So bleiben die Ansichten konsistent.
3. **Pivot als reine Funktion.** `pivot(rows, rowDim, colDim, measure)` liefert Zeilen-/Spaltenschlüssel, Zellwerte und Summen; ohne Angular testbar (Muster wie `overview.logic.ts`). Mehrwertige Felder (Rebsorten) zählen eine Flasche je Rebsorte mehrfach; die Summen zählen jede Flasche nur einmal, und die Oberfläche weist darauf hin.
4. **Dimensionen.** Keller: Weinart, Land, Region, Rebsorte, Winzer, Jahrgang, Trinkfenster-Status, Regal. Archiv: Weinart, Abgangsart, Winzer, Jahrgang, Jahr, Monat, Bewertung. Regale: Regal × Weinart (Flaschen im Regal) und Regal × Belegung. Das Archiv bietet kein Land/Region/Rebsorte, weil `ArchiveEntry` sie nicht enthält; Nachliefern wäre ein Backend-Change und ist ausgeklammert.
5. **Regale-Pivot braucht Regaldetails.** `RackSummary` kennt die Weinarten nicht; für das Pivot lädt die Ansicht beim ersten Wechsel jedes Regal einzeln (`getRack`) und zeigt währenddessen einen Ladehinweis. Tabelle und Kacheln brauchen das nicht.
6. **Zustand in der URL, Wahl im Gerät.** Ansicht, Filter, Sortierung und Pivot-Konfiguration stehen als Query-Parameter, damit die Rückkehr aus der Einzelansicht den Zustand erhält (wie `?q=`/`?type=` im Keller). Die zuletzt gewählte Ansicht je Liste wird im `StorageService` gemerkt und gilt, wenn die URL keine Ansicht nennt; ebenso die gewählten Spalten.
7. **Mobil.** Tabellen scrollen horizontal, die erste Spalte (Name) bleibt stehen. Das Pivot scrollt ebenfalls. Kacheln bleiben Standard.
8. **Barrierefreiheit.** Echte `<table>` mit `<th scope>`, Sortierung per Button im Spaltenkopf mit `aria-sort`, Umschalter als Gruppe mit `aria-pressed`, Pivotzellen als Buttons.
9. **CSV.** UTF-8 mit BOM, Semikolon als Trenner (deutsches Excel), exportiert die aktuell gefilterte und sortierte Ansicht; Zellen, die mit `=`, `+`, `-` oder `@` beginnen, werden gegen Formelinjektion mit führendem Apostroph entschärft.

## Risiken

- Lokales Filtern macht die serverseitige Suche im Keller überflüssig; die Suche muss dieselben Felder abdecken wie bisher (Name, Weingut, Region, Rebsorte).
- Viele Spalten auf kleinen Displays: Standardspalten bewusst knapp halten.
