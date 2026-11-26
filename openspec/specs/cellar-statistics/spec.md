# cellar-statistics Specification

## Purpose

Die Startseite gibt nach dem Login einen schnellen Überblick über den eigenen Keller: Kennzahlen und die Verteilung der Flaschen nach Weintyp, Land, Region oder Winzer als Tortendiagramm.

## Requirements

### Requirement: Übersicht ist die Startseite
Nach dem Login und beim Aufruf der App-Startadresse SHALL der angemeldete Benutzer die Seite „Übersicht“ sehen. Der Keller MUST als eigener Menüpunkt „Keller“ erreichbar bleiben.

#### Scenario: Einstieg nach Login
- **WHEN** ich mich anmelde
- **THEN** sehe ich die Seite „Übersicht“
- **AND** die Navigation enthält „Übersicht“, „Keller“, „Archiv“ und „Einstellungen“

### Requirement: Kennzahlen
Die Übersicht SHALL die Anzahl der Flaschen im Keller, die Anzahl der Weine mit mindestens einer Flasche im Keller und den Gesamtwert (Summe aus Flaschenanzahl × Einkaufspreis) anzeigen. Weine ohne Einkaufspreis MUST beim Gesamtwert unberücksichtigt bleiben, und ihre Anzahl MUST als Hinweis genannt werden. Nur eigene Weine und nur Flaschen im Keller (nicht im Archiv) zählen.

#### Scenario: Kennzahlen berechnen
- **GIVEN** mein Keller enthält 6 Flaschen „Zweigelt“ zu 12,00 €, 2 Flaschen „Sassicaia“ zu 250,00 € und 3 Flaschen „Hauswein“ ohne Preis
- **AND** ein Wein „Merlot“ hat 0 Flaschen im Keller
- **WHEN** ich die Übersicht öffne
- **THEN** sehe ich 11 Flaschen, 3 Weine und einen Gesamtwert von 572,00 €
- **AND** einen Hinweis, dass 1 Wein keinen Einkaufspreis hat

#### Scenario: Fremde Weine zählen nicht
- **GIVEN** Benutzerin „anna“ hat 5 Flaschen und Benutzer „ben“ hat 2 Flaschen
- **WHEN** „ben“ die Übersicht öffnet
- **THEN** sieht er 2 Flaschen

### Requirement: Verteilung nach wählbarer Gruppierung
Die Übersicht SHALL die Flaschen im Keller als Tortendiagramm mit Legende verteilen. Der Benutzer MUST zwischen den Gruppierungen Weintyp, Land, Region, Winzer und Rebsorte umschalten können; Standard ist Weintyp. Jedes Segment MUST Bezeichnung, Flaschenanzahl und Anteil in Prozent (ganzzahlig gerundet) zeigen. Segmente sind absteigend nach Flaschenanzahl, bei Gleichstand alphabetisch sortiert.

#### Scenario: Nach Weintyp
- **GIVEN** mein Keller enthält 6 Flaschen Rotwein, 3 Flaschen Weißwein und 1 Flasche Schaumwein
- **WHEN** ich die Übersicht öffne
- **THEN** zeigt das Diagramm „Rotwein“ 6 (60 %), „Weißwein“ 3 (30 %) und „Schaumwein“ 1 (10 %)

#### Scenario: Nach Land
- **GIVEN** 5 Flaschen aus „Italien“ und 3 aus „Österreich“
- **WHEN** ich die Gruppierung „Land“ wähle
- **THEN** zeigt das Diagramm „Italien“ 5 und „Österreich“ 3

#### Scenario: Nach Region
- **GIVEN** 4 Flaschen aus „Toskana, Italien“, 1 aus „Piemont, Italien“ und 3 aus „Wachau, Österreich“
- **WHEN** ich die Gruppierung „Region“ wähle
- **THEN** zeigt das Diagramm „Toskana (Italien)“ 4, „Wachau (Österreich)“ 3 und „Piemont (Italien)“ 1

#### Scenario: Nach Winzer
- **GIVEN** 2 Flaschen von „Tenuta San Guido“, 3 von „tenuta san guido “ und 1 von „Weingut Bründlmayer“
- **WHEN** ich die Gruppierung „Winzer“ wähle
- **THEN** zeigt das Diagramm „Tenuta San Guido“ 5 und „Weingut Bründlmayer“ 1

#### Scenario: Gruppierung Rebsorte ist wählbar
- **WHEN** ich die Übersicht öffne
- **THEN** kann ich zwischen „Weintyp“, „Land“, „Region“, „Winzer“ und „Rebsorte“ wählen

### Requirement: Weine ohne Angabe
Flaschen, deren Wein für die gewählte Gruppierung keinen Wert hat, SHALL das System in einem eigenen Segment „Ohne Angabe“ zusammenfassen, das immer als letztes Segment erscheint. In der Gruppierung Region MUST ein Wein mit Land, aber ohne Region als „Ohne Region (Land)“ erscheinen.

#### Scenario: Ohne Land
- **GIVEN** 4 Flaschen haben ein Land, 2 Flaschen haben keins
- **WHEN** ich die Gruppierung „Land“ wähle
- **THEN** zeigt das Diagramm als letztes Segment „Ohne Angabe“ mit 2 Flaschen

#### Scenario: Land ohne Region
- **GIVEN** 2 Flaschen haben das Land „Italien“, aber keine Region
- **WHEN** ich die Gruppierung „Region“ wähle
- **THEN** zeigt das Diagramm ein Segment „Ohne Region (Italien)“ mit 2 Flaschen

### Requirement: Viele Segmente zusammenfassen
Ergeben sich mehr als 8 Segmente (ohne „Ohne Angabe“), SHALL das Diagramm die 7 größten einzeln zeigen und alle übrigen als „Sonstige“ zusammenfassen. Die Legende MUST die zusammengefassten Einträge aufklappbar einzeln auflisten.

#### Scenario: Zwölf Winzer
- **GIVEN** mein Keller enthält Weine von 12 verschiedenen Winzern
- **WHEN** ich die Gruppierung „Winzer“ wähle
- **THEN** zeigt das Diagramm 7 Winzer und ein Segment „Sonstige“ mit den Flaschen der übrigen 5
- **AND** die Legende kann die 5 übrigen Winzer einzeln anzeigen

### Requirement: Drill-down vom Land zu den Regionen
In der Gruppierung Land SHALL das Antippen eines Landes (Segment oder Legende) die Verteilung auf die Regionen dieses Landes zeigen, einschließlich „Ohne Region“. Eine Zurück-Aktion MUST zur Länderverteilung führen.

#### Scenario: Italien aufklappen
- **GIVEN** von 5 Flaschen aus „Italien“ sind 4 aus „Toskana“ und 1 ohne Region
- **WHEN** ich in der Gruppierung „Land“ auf „Italien“ tippe
- **THEN** zeigt das Diagramm „Toskana“ 4 (80 %) und „Ohne Region“ 1 (20 %) mit der Überschrift „Italien“
- **AND** über „Zurück“ sehe ich wieder alle Länder

### Requirement: Leerer Keller
Hat der Benutzer keine Flasche im Keller, SHALL die Übersicht statt Kennzahlen und Diagramm einen Hinweis und eine Aktion „Wein hinzufügen“ zeigen.

#### Scenario: Neuer Benutzer
- **GIVEN** mein Keller ist leer
- **WHEN** ich die Übersicht öffne
- **THEN** sehe ich den Hinweis, dass der Keller leer ist, und die Aktion „Wein hinzufügen“

### Requirement: Barrierefreie Darstellung
Das Diagramm MUST einen Textersatz haben: Die Legende SHALL alle Segmente mit Bezeichnung, Anzahl und Prozent als Text enthalten und per Tastatur bedienbar sein; Segmentfarben MUST im hellen und dunklen Design unterscheidbar sein.

#### Scenario: Bedienung ohne Diagramm
- **WHEN** ich die Übersicht mit einem Screenreader oder nur per Tastatur nutze
- **THEN** kann ich alle Werte aus der Legende lesen und den Drill-down zu einem Land per Tastatur auslösen

### Requirement: Verteilung nach Rebsorte
In der Gruppierung Rebsorte SHALL jede Flasche genau einmal zählen: Flaschen rebsortenreiner Weine bei ihrer Rebsorte, Flaschen aller Cuvées gemeinsam im Segment „Cuvée“, Flaschen von Weinen ohne Rebsorte im Segment „Ohne Angabe“ (als letztes Segment). Die Prozentwerte MUST sich damit auf alle Flaschen im Keller beziehen.

#### Scenario: Rebsortenrein und Cuvées
- **GIVEN** 5 Flaschen nur „Riesling“, 1 Flasche nur „Pinot Noir“, 3 Flaschen „Cabernet Sauvignon, Merlot“ und 1 Flasche „Zweigelt, Blaufränkisch“
- **WHEN** ich die Gruppierung „Rebsorte“ wähle
- **THEN** zeigt das Diagramm „Riesling“ 5 (50 %), „Cuvée“ 4 (40 %) und „Pinot Noir“ 1 (10 %)

#### Scenario: Weine ohne Rebsorte
- **GIVEN** 3 Flaschen nur „Riesling“ und 1 Flasche ohne Rebsorte
- **WHEN** ich die Gruppierung „Rebsorte“ wähle
- **THEN** zeigt das Diagramm „Riesling“ 3 und als letztes Segment „Ohne Angabe“ 1

#### Scenario: Cuvée zählt nicht bei ihren Rebsorten
- **GIVEN** 2 Flaschen nur „Merlot“ und 5 Flaschen „Merlot, Cabernet Franc“
- **WHEN** ich die Gruppierung „Rebsorte“ wähle
- **THEN** zeigt das Diagramm „Cuvée“ 5 und „Merlot“ 2

### Requirement: Drill-down von Cuvée zur Zusammensetzung
In der Gruppierung Rebsorte SHALL das Antippen des Segments „Cuvée“ (im Diagramm oder in der Legende) die Cuvée-Flaschen nach ihrer Zusammensetzung verteilen. Weine mit denselben Rebsorten MUST unabhängig von Reihenfolge und Anteilen zusammengefasst werden; die Bezeichnung nennt die Rebsorten alphabetisch, getrennt durch Komma. Eine Zurück-Aktion MUST zur Rebsortenverteilung führen.

#### Scenario: Cuvée aufklappen
- **GIVEN** 3 Flaschen „Cabernet Sauvignon 85 %, Cabernet Franc 15 %“, 2 Flaschen „Cabernet Franc, Cabernet Sauvignon“ und 1 Flasche „Zweigelt, Blaufränkisch“
- **WHEN** ich in der Gruppierung „Rebsorte“ auf „Cuvée“ tippe
- **THEN** zeigt das Diagramm mit der Überschrift „Cuvées“ „Cabernet Franc, Cabernet Sauvignon“ 5 (83 %) und „Blaufränkisch, Zweigelt“ 1 (17 %)
- **AND** über „Zurück“ sehe ich wieder die Verteilung nach Rebsorte

#### Scenario: Viele Zusammensetzungen
- **GIVEN** mein Keller enthält Cuvées in 10 verschiedenen Zusammensetzungen
- **WHEN** ich auf „Cuvée“ tippe
- **THEN** zeigt das Diagramm die 7 häufigsten Zusammensetzungen und „Sonstige“ mit den übrigen
