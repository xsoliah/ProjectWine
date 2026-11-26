# Tasks

## 1. Gemeinsame Logik (ohne UI)

- [x] 1.1 In `core/` reine Funktionen anlegen: Spaltendefinition (Schlüssel, Titel, Typ, Getter), Sortierung (leere Werte zuletzt), Filter (Mehrfachauswahl „oder“, Filter „und“), Pivot (Zeilen/Spalten/Kennzahl, Summen, „Ohne Angabe“, Mehrwert-Dimension Rebsorte) und CSV-Erzeugung (BOM, Semikolon, Formelschutz). Prüfen: Unit-Tests (`ng test`) für alle Szenarien dieser Funktionen sind grün, u. a. Land × Weinart, Durchschnittsbewertung ohne Leerwerte, Cuvée-Summe, Formelzeichen.
- [x] 1.2 Ansicht, Filter, Sortierung und Pivot-Konfiguration aus/in Query-Parameter übertragen; zuletzt gewählte Ansicht und Spalten im `StorageService` je Liste ablegen. Prüfen: Unit-Tests für Parsen/Serialisieren inkl. ungültiger Werte (fallen auf Standard zurück).

## 2. Gemeinsame Oberfläche

- [x] 2.1 Komponenten unter `shared/`: Ansichtsumschalter (`aria-pressed`), Datentabelle (`<table>`, `aria-sort`, feste erste Spalte, horizontales Scrollen, Spaltenwahl), Filterleiste mit aktiven Filtern und „Zurücksetzen“, Pivot-Tabelle mit Konfiguration und klickbaren Zellen, CSV-Download-Knopf. Prüfen: `ng build` grün; Sichtprüfung im Browser bei 375 px und Desktop, hell und dunkel.

## 3. Keller

- [x] 3.1 `Cellar` auf lokale Filterung umstellen (Suche und Weinart bleiben in der URL, Rückkehr aus 3D unverändert), Umschalter, Tabelle, Filter und Pivot anbinden, Kachelansicht unverändert lassen. Prüfen: alle Keller-Szenarien der Spec im Browser durchgespielt (Sortieren, Spaltenwahl, Filter kombinieren, Pivot Land × Weinart, Zelle → gefilterte Tabelle, Export); bestehende Tests grün.

## 4. Archiv

- [x] 4.1 `Archive` um Umschalter, Tabelle, Filter (Abgangsart, Weinart, Zeitraum, Bewertung ab) und Pivot (Jahr, Monat, Abgangsart, Weinart, Winzer, Jahrgang, Bewertung) erweitern; die Abgangsart-Chips bleiben. Prüfen: Szenarien „Archiv nach Zeitraum“ und „Durchschnittsbewertung“ im Browser durchgespielt.

## 5. Regale

- [x] 5.1 `Racks` um Umschalter, Tabelle, Filter (Name, Belegung) und Pivot „Regal × Weinart“ bzw. „Regal × Belegung“ erweitern; Regaldetails bei Bedarf nachladen (Ladehinweis, Fehler mit „Erneut laden“, Regal ohne Flaschen mit Summe 0). Prüfen: Szenarien aus „Regale in Tabelle und Pivot“ im Browser durchgespielt.

## 6. Abschluss

- [x] 6.1 README/Hilfetexte ergänzen, falls Ansichten dort beschrieben sind; `ng build` und `ng test` prüfen, Backend unverändert. Prüfen: alle Befehle ohne Fehler.
