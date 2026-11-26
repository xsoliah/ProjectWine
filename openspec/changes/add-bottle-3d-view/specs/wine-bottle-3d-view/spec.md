# Spec Delta

## Purpose

Die Einzelansicht eines Weins zeigt die Flasche in 3D, drehbar wie im Regal, mit dem Etikett in echter Größe und Lage auf dem Flaschenkörper.

## ADDED Requirements

### Requirement: 3D-Ansicht in der Einzelansicht
Die Detailansicht SHALL eine 3D-Ansicht der Flasche anbieten, die sich mit dem flachen Etikettenbild umschalten lässt. Die Flasche MUST mit Maus oder Finger drehbar sein, im Rahmen einer begrenzten Drehung wie im Regal, und MUST in der Farbe des Weintyps dargestellt werden. Die Form MUST dem erkannten Flaschenmaß entsprechen, sonst einer Standardflasche nach Weintyp und Flaschengröße. Das Etikettenbild SHALL als Textur auf die Flasche gelegt werden.

#### Scenario: Flasche drehen
- **GIVEN** „Sassicaia“ hat ein Flaschenmaß und ein Etikettenbild
- **WHEN** ich die 3D-Ansicht öffne und die Flasche ziehe
- **THEN** dreht sich die Flasche mit erkannter Form und aufgebrachtem Etikett

#### Scenario: Ohne Flaschenmaß
- **GIVEN** „Zweigelt“ hat ein Etikettenbild, aber kein Flaschenmaß
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** sehe ich eine Standardflasche des Weintyps mit dem Etikett an einer geschätzten Stelle

#### Scenario: Ohne Etikettenbild
- **GIVEN** ein Wein hat kein Etikettenbild
- **WHEN** ich die Detailansicht öffne
- **THEN** gibt es die 3D-Ansicht als Flasche ohne Etikett oder sie wird nicht angeboten, aber die Ansicht bleibt bedienbar

### Requirement: Etikett in echter Größe und Lage
Das Etikett SHALL in der 3D-Ansicht größengetreu auf die Flasche übertragen werden: Breite und Höhe des Etiketts im Verhältnis zur Flasche sowie seine Höhe über dem Flaschenboden MUST dem Flaschenmaß entsprechen. Das Etikett MUST seine Proportionen behalten, um den Flaschenkörper gewölbt sein und MUST den Flaschenumfang nicht überschreiten. Das Etikett MUST an der Stelle sitzen, an der es auf dem Foto saß, auch wenn es nicht mittig sitzt.

#### Scenario: Schmales Etikett
- **GIVEN** das Etikett von „Sassicaia“ ist deutlich schmaler als die Flasche und sitzt im unteren Drittel
- **WHEN** ich die 3D-Ansicht betrachte
- **THEN** ist das Etikett entsprechend schmal und sitzt im unteren Drittel
- **AND** daneben ist Glas sichtbar

#### Scenario: Breites Etikett
- **GIVEN** das Etikett reicht um den größten Teil des Umfangs
- **WHEN** ich die Flasche drehe
- **THEN** umschließt das Etikett die Flasche, ohne sich selbst zu überlappen

### Requirement: Anpassung wirkt auf die 3D-Ansicht
Nach dem Anpassen von Flaschenumriss oder Etikettenlage im Editor SHALL die 3D-Ansicht das neue Flaschenmaß ohne Neuladen der Seite zeigen.

#### Scenario: Nach dem Anpassen
- **GIVEN** ich habe die Etikettenlage von „Sassicaia“ nach oben geschoben
- **WHEN** ich zur 3D-Ansicht wechsle
- **THEN** sitzt das Etikett an der neuen Stelle

### Requirement: Barrierefreiheit und Rückfall
Die 3D-Ansicht MUST per Tastatur bedienbar sein (Pfeiltasten drehen) und einen Textersatz „3D-Ansicht der Flasche <Weinname>“ haben. Ist WebGL nicht verfügbar, MUST die Ansicht auf das flache Etikettenbild zurückfallen und einen Hinweis zeigen. Bei der Einstellung „Bewegung reduzieren“ MUST keine automatische Drehung stattfinden.

#### Scenario: Ohne WebGL
- **GIVEN** der Browser unterstützt kein WebGL
- **WHEN** ich die Detailansicht öffne
- **THEN** sehe ich das flache Etikettenbild mit einem Hinweis, dass die 3D-Ansicht nicht verfügbar ist

#### Scenario: Tastatur
- **WHEN** ich die 3D-Ansicht fokussiere und die Pfeiltaste nach rechts drücke
- **THEN** dreht sich die Flasche
