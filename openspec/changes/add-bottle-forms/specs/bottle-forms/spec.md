# Spec Delta

## Purpose

Weine werden in 3D mit einer zu ihnen passenden Flaschenform und in der Größe ihrer Flasche dargestellt: Schaumweine sehen wie Schaumweinflaschen aus, Halbflaschen kleiner und Magnums größer als normale Flaschen.

## ADDED Requirements

### Requirement: Flaschenformen
Das System SHALL die Flaschenformen Bordeaux, Burgunder, Champagner und Schlegel unterstützen. Jede Form MUST ein eigenes Erscheinungsbild haben: Bordeaux mit hohen Schultern und kurzem Hals, Burgunder mit sanften, abfallenden Schultern, Champagner stämmig mit schrägen Schultern und langem Hals, Schlegel besonders schlank mit langem Hals. Die Kapsel MUST zur Form passen; bei Champagner reicht sie deutlich weiter über den Hals als bei Bordeaux.

#### Scenario: Schaumwein sieht anders aus
- **GIVEN** „Crémant“ hat die Flaschenform Champagner und „Sassicaia“ die Form Bordeaux
- **WHEN** ich beide in der Einzelansicht betrachte
- **THEN** ist die Champagnerflasche stämmiger mit schrägen Schultern und langer Folie
- **AND** die Bordeauxflasche hat hohe Schultern und kurze Kapsel

#### Scenario: Schlegel ist schlank
- **GIVEN** „Riesling“ hat die Form Schlegel
- **WHEN** ich die Einzelansicht öffne
- **THEN** ist die Flasche schmaler und mit längerem Hals als eine Bordeauxflasche

### Requirement: Flaschenform am Wein
Ein Wein SHALL eine optionale Flaschenform haben, die im Weinformular gewählt und in der Detailansicht angezeigt wird. Ist keine Form gewählt, MUST sie sich nach dem Weintyp richten: Schaumwein verwendet Champagner, alle anderen Weintypen Bordeaux. Die gewählte Form MUST gespeichert bleiben und nur für den Besitzer sichtbar sein. Ungültige Werte MUST abgelehnt werden.

#### Scenario: Schaumwein ohne Angabe
- **GIVEN** ich lege den Schaumwein „Crémant“ ohne Flaschenform an
- **WHEN** ich ihn in 3D betrachte
- **THEN** wird er als Champagnerflasche dargestellt

#### Scenario: Form wählen
- **GIVEN** „Spätburgunder“ ist ein Rotwein ohne Form
- **WHEN** ich im Formular die Flaschenform „Burgunder“ wähle und speichere
- **THEN** zeigt die Detailansicht die Burgunderflasche
- **AND** nach dem Neuladen ist die Form noch gewählt

#### Scenario: Zurück auf Automatik
- **GIVEN** „Crémant“ hat die Form Burgunder gewählt
- **WHEN** ich die Auswahl auf „automatisch“ stelle
- **THEN** wird er wieder als Champagnerflasche dargestellt

#### Scenario: Ungültige Form
- **WHEN** ein Wein mit einer unbekannten Flaschenform gespeichert werden soll
- **THEN** wird das Speichern abgelehnt

### Requirement: Gemessene Flasche hat Vorrang
Hat ein Wein ein erkanntes oder angepasstes Flaschenmaß, SHALL die 3D-Ansicht dessen Profil darstellen und nicht das Standardprofil der Flaschenform. Die Flaschenform MUST nur die Standardflasche, den Rückfall und die Kapsel bestimmen.

#### Scenario: Erkannte Flasche
- **GIVEN** „Sassicaia“ hat ein erkanntes Flaschenmaß und die Form Champagner
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** entspricht die Flasche dem erkannten Maß
- **AND** die Kapsel richtet sich nach der Form Champagner

### Requirement: Größenrichtige Darstellung
Die 3D-Ansichten SHALL die Flaschengröße in der Höhe der Flasche abbilden: Eine Halbflasche (375 ml) MUST kleiner als eine Normalflasche (750 ml) und eine Magnumflasche (1500 ml) größer dargestellt werden; die Größe folgt der Flaschengröße in ml, mit sinnvollen Grenzen. Das MUST in der Einzelansicht gelten, indem die Kamera auf die Normalflasche und nicht auf die jeweilige Flasche eingepasst wird (zu große Flaschen MUST dennoch vollständig sichtbar bleiben), und im 3D-Regal, wo jede Flasche in der Größe ihrer Flaschengröße liegt und im Fach bleibt. Das Etikett MUST mitskaliert werden und seine Lage behalten.

#### Scenario: Halbflasche in der Einzelansicht
- **GIVEN** „Sauternes“ hat die Flaschengröße 375 ml
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** erscheint die Flasche sichtbar kleiner als die Normalflasche „Sassicaia“ (750 ml) in derselben Ansicht

#### Scenario: Magnum bleibt im Bild
- **GIVEN** „Barolo“ hat die Flaschengröße 1500 ml
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** ist die Flasche größer als die Normalflasche und trotzdem vollständig sichtbar

#### Scenario: Halbflasche im Regal
- **GIVEN** im Regal liegen eine Flasche „Sassicaia“ (750 ml) und eine Halbflasche „Sauternes“ (375 ml)
- **WHEN** ich das Regal in 3D ansehe
- **THEN** ist die Halbflasche sichtbar kürzer und dünner als die Normalflasche

#### Scenario: Größe unbekannt
- **GIVEN** ein Wein hat keine verwertbare Flaschengröße
- **WHEN** ich ihn in 3D betrachte
- **THEN** wird er in der Größe einer Normalflasche dargestellt

### Requirement: Formen im 3D-Regal
Im 3D-Regal SHALL jede Flasche in der Form ihres Weins liegen (gewählte Form, sonst nach Weintyp); die Glasfarbe richtet sich weiter nach dem Weintyp. Flaschen aller Formen MUST in der Reihe liegen, sich beim Herausziehen wie bisher bewegen und das Etikett an der richtigen Stelle tragen.

#### Scenario: Gemischtes Regal
- **GIVEN** im Regal liegen Bordeaux-, Burgunder- und Champagnerflaschen
- **WHEN** ich das Regal in 3D ansehe
- **THEN** hat jede Flasche ihre eigene Form
- **AND** das Antippen einer Reihe schiebt alle ihre Flaschen heraus

### Requirement: Rückfall ohne Besonderheiten
Ältere Weine ohne Flaschenform MUST ohne Datenänderung dargestellt werden (Bordeaux, Schaumwein als Champagner) und die Ansichten MUST bedienbar bleiben. Kellerliste, Archiv und Statistik MUST unverändert bleiben.

#### Scenario: Bestehender Wein
- **GIVEN** ein bereits gespeicherter Rotwein ohne Flaschenform
- **WHEN** ich ihn in 3D betrachte
- **THEN** sehe ich eine Bordeauxflasche in der Größe seiner Flaschengröße
