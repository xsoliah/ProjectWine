# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
