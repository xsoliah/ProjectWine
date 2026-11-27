# Spec Delta

## Purpose

Schaumweine werden in den 3D-Ansichten mit einem eigenen, erkennbaren Flaschenmodell dargestellt, das sich in Boden, Mündung und Verschluss deutlich von Stillweinflaschen unterscheidet.

## ADDED Requirements

### Requirement: Eigenes Schaumweinmodell
Das System SHALL Flaschen mit der aufgelösten Form „Champagner“ (gewählt oder automatisch bei Weintyp Schaumwein) mit einem eigenen Modell darstellen, das mindestens einen eingedellten Boden (Punt), einen ausgeprägten Mündungswulst, eine Folie über dem Hals, einen Drahtkorb (Agraffe) mit Plättchen und einen Korkkopf zeigt. Das Modell MUST sich auf den ersten Blick von der Bordeaux-, Burgunder- und Schlegelflasche unterscheiden.

#### Scenario: Schaumwein in der Einzelansicht
- **GIVEN** „Crémant“ ist ein Schaumwein ohne gewählte Flaschenform
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** sehe ich eine Sektflasche mit Folie, Drahtkorb und Mündungswulst
- **AND** beim Drehen von unten ist der eingedellte Boden zu sehen

#### Scenario: Gewählte Form Champagner
- **GIVEN** „Riesling Sekt“ ist ein Weißwein mit der Flaschenform Champagner
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** wird dasselbe Schaumweinmodell gezeigt

#### Scenario: Andere Formen unverändert
- **GIVEN** „Sassicaia“ hat die Form Bordeaux und „Spätburgunder“ die Form Burgunder
- **WHEN** ich ihre 3D-Ansichten öffne
- **THEN** sehen beide aus wie bisher, ohne Drahtkorb und Punt

### Requirement: Schaumweinmodell im 3D-Regal
Im 3D-Regal SHALL jede Schaumweinflasche mit demselben Modell wie in der Einzelansicht liegen, in der Größe ihrer Flaschengröße und im Fach. Etikett, Herausziehen der Reihe und Antippen MUST wie bei anderen Formen funktionieren.

#### Scenario: Gemischtes Regal
- **GIVEN** im Regal liegen eine Bordeauxflasche und eine Schaumweinflasche
- **WHEN** ich das Regal in 3D ansehe
- **THEN** hat die Schaumweinflasche Drahtkorb und Mündungswulst
- **AND** das Antippen ihrer Reihe schiebt sie wie die anderen Flaschen heraus

#### Scenario: Magnum-Schaumwein im Regal
- **GIVEN** im Regal liegt ein Schaumwein mit 1500 ml
- **WHEN** ich das Regal in 3D ansehe
- **THEN** ist die Flasche größer als eine Normalflasche und bleibt dennoch im Fach

### Requirement: Etikett auf dem Schaumweinmodell
Das Etikett SHALL auf dem Schaumweinmodell an der bisherigen Stelle und in den bisherigen Proportionen sitzen und MUST weder vom Drahtkorb noch von der Folie verdeckt werden. Hat der Wein ein gemessenes Flaschenmaß, MUST dessen Profil für Körper und Etikett Vorrang vor dem Standardprofil haben; Punt, Drahtkorb, Folie und Korken richten sich nach der Form.

#### Scenario: Etikett sichtbar
- **GIVEN** „Crémant“ hat ein Etikettfoto
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** ist das Etikett vollständig sichtbar und proportional

#### Scenario: Gemessene Schaumweinflasche
- **GIVEN** „Crémant“ hat ein erkanntes Flaschenmaß
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** folgt der Flaschenkörper dem erkannten Profil
- **AND** Drahtkorb, Folie und Korken sitzen am Flaschenhals

### Requirement: Darstellung bleibt robust
Das Schaumweinmodell MUST ohne zusätzliche Dateien geladen werden und die Bedienung (Drehen, Zoomen, Zurücksetzen, Regal-Auswahl) nicht verlangsamen; Speicher MUST beim Verlassen der Ansicht freigegeben werden.

#### Scenario: Ansicht verlassen
- **GIVEN** ich habe eine Schaumweinflasche in 3D betrachtet
- **WHEN** ich die Ansicht verlasse
- **THEN** werden die Geometrien des Modells freigegeben
