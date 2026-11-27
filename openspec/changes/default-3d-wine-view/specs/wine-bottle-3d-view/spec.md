# Spec Delta

## Purpose

Die Einzelansicht eines Weins zeigt die Flasche standardmäßig in 3D.

## ADDED Requirements

### Requirement: 3D-Ansicht als Standardansicht
Die Detailansicht SHALL beim Öffnen eines Weins die 3D-Ansicht der Flasche zeigen, sofern WebGL verfügbar ist. Das flache Etikettenbild und, falls vorhanden, das Flaschenbild MUST weiterhin über den Umschalter erreichbar sein. Die zuletzt gewählte Ansicht MUST nicht über das Verlassen der Detailansicht hinaus gemerkt werden; jedes Öffnen eines Weins beginnt wieder mit der 3D-Ansicht.

#### Scenario: Wein öffnen
- **GIVEN** „Sassicaia“ hat ein Etikettenbild und WebGL ist verfügbar
- **WHEN** ich die Einzelansicht öffne
- **THEN** sehe ich die drehbare 3D-Flasche
- **AND** im Umschalter ist „3D-Ansicht“ als aktiv markiert

#### Scenario: Zum flachen Etikett wechseln
- **GIVEN** die Einzelansicht zeigt die 3D-Ansicht
- **WHEN** ich „Etikett“ wähle
- **THEN** sehe ich das flache Etikettenbild

#### Scenario: Ansicht wird nicht gemerkt
- **GIVEN** ich habe in „Sassicaia“ auf „Etikett“ gewechselt
- **WHEN** ich zurück in den Keller gehe und „Sassicaia“ erneut öffne
- **THEN** zeigt die Einzelansicht wieder die 3D-Ansicht

#### Scenario: Ohne WebGL
- **GIVEN** der Browser unterstützt kein WebGL
- **WHEN** ich die Einzelansicht öffne
- **THEN** sehe ich das flache Etikettenbild mit dem Hinweis, dass die 3D-Ansicht nicht verfügbar ist
- **AND** es gibt keinen leeren oder fehlerhaften 3D-Bereich

#### Scenario: Ohne Etikettenbild
- **GIVEN** ein Wein hat kein Etikettenbild
- **WHEN** ich die Einzelansicht öffne
- **THEN** zeigt die 3D-Ansicht eine Flasche ohne Etikett und bleibt bedienbar
