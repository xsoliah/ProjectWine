# Spec Delta

## Purpose

Getrunkene Weine werden auf einer persönlichen Skala bewertet, die von 0,5 Sternen bis zu den Spitzenstufen „Top“ und „Hammer“ reicht. So lassen sich auch herausragende Weine über 5 Sternen voneinander unterscheiden und später auswerten.

## ADDED Requirements

### Requirement: Bewertungsskala
Das System SHALL für getrunkene Weine folgende Bewertungsstufen anbieten, aufsteigend: 0,5 bis 5 Sterne in Halbschritten, darüber „Top“ und darüber „Hammer“. „Top“ und „Hammer“ MUST ganze Stufen ohne Zwischenwerte sein. Jeder andere Wert MUST abgelehnt werden.

#### Scenario: Hammer vergeben
- **GIVEN** mein Keller enthält 2 Flaschen „Barolo“
- **WHEN** ich 1 Flasche „Barolo“ trinke und mit „Hammer“ bewerte
- **THEN** hat der Archiveintrag für „Barolo“ die Bewertung „Hammer“

#### Scenario: Top vergeben
- **GIVEN** ich habe eine Flasche „Riesling“ getrunken
- **WHEN** ich den Archiveintrag nachträglich mit „Top“ bewerte
- **THEN** hat der Archiveintrag die Bewertung „Top“

#### Scenario: Wert zwischen den Stufen
- **WHEN** ich eine Bewertung zwischen 5 Sternen und „Top“ oder über „Hammer“ vergeben will
- **THEN** wird die Aktion abgelehnt mit „Bewertung“

#### Scenario: Bestehende Bewertung
- **GIVEN** ein Archiveintrag mit 4,5 Sternen aus der Zeit vor dieser Änderung
- **WHEN** ich ihn öffne
- **THEN** zeigt er unverändert 4,5 Sterne

### Requirement: Rangfolge der Stufen
Das System SHALL „Top“ höher einstufen als 5 Sterne und „Hammer“ höher als „Top“. Diese Rangfolge MUST für Sortierung, den Filter „Bewertung ab“ und das Pivot gelten.

#### Scenario: Filter ab Top
- **GIVEN** das Archiv enthält Einträge mit 5 Sternen, „Top“ und „Hammer“
- **WHEN** ich nach Bewertung ab „Top“ filtere
- **THEN** erscheinen nur die Einträge mit „Top“ und „Hammer“

#### Scenario: Sortierung
- **WHEN** ich die Archivtabelle absteigend nach Bewertung sortiere
- **THEN** stehen „Hammer“-Einträge vor „Top“ und diese vor 5-Sterne-Einträgen

### Requirement: Darstellung mit Icons
Das System SHALL „Top“ und „Hammer“ überall, wo Bewertungen angezeigt werden (Archivkachel, Einzelansicht, Tabelle, Pivot), mit je einem eigenen Icon und einer Textbeschriftung darstellen, die sich klar von den Sternen unterscheidet. Die Bewertung MUST für Screenreader als Text zugänglich sein, zum Beispiel „Hammer“ oder „Top“ statt einer Sternzahl.

#### Scenario: Anzeige in der Kachel
- **GIVEN** ein Archiveintrag mit „Hammer“
- **WHEN** ich das Archiv in der Kachelansicht öffne
- **THEN** zeigt die Kachel das Hammer-Icon statt fünf Sternen

#### Scenario: Zugängliche Beschriftung
- **GIVEN** ein Archiveintrag mit „Top“
- **WHEN** ein Screenreader die Bewertung vorliest
- **THEN** lautet sie „Top“

### Requirement: Eingabe von Top und Hammer
Das System SHALL im Bewertungsfeld nach den fünf Sternen zwei zusätzliche Auswahlfelder für „Top“ und „Hammer“ anbieten. Die Tastatursteuerung MUST die Stufen in der Rangfolge durchlaufen, sodass der Schritt nach oben von 5 Sternen zu „Top“ und von „Top“ zu „Hammer“ führt, und der Schritt nach unten umgekehrt. Die Bewertung MUST weiterhin entfernbar sein.

#### Scenario: Per Antippen wählen
- **WHEN** ich beim Trinken das Hammer-Feld antippe
- **THEN** ist „Hammer“ ausgewählt und die Sterne erscheinen voll

#### Scenario: Per Tastatur steigern
- **GIVEN** das Bewertungsfeld steht auf 5 Sternen
- **WHEN** ich die Pfeil-nach-oben-Taste drücke
- **THEN** wechselt die Auswahl auf „Top“, mit einem weiteren Druck auf „Hammer“

#### Scenario: Bewertung entfernen
- **GIVEN** die Bewertung steht auf „Top“
- **WHEN** ich „Bewertung entfernen“ wähle
- **THEN** hat der Eintrag keine Bewertung

### Requirement: Durchschnittsbewertung
Das System SHALL „Top“ und „Hammer“ in der Durchschnittsbewertung des Archivs mitzählen, wobei „Top“ als 6 und „Hammer“ als 7 Stufenpunkte gilt. Der Durchschnitt MUST als Zahl angezeigt werden.

#### Scenario: Durchschnitt mit Top
- **GIVEN** das Archiv hat zwei getrunkene Einträge mit 5 Sternen und „Top“
- **WHEN** ich die Kennzahl „Durchschnittsbewertung“ wähle
- **THEN** zeigt die Zelle 5,5
