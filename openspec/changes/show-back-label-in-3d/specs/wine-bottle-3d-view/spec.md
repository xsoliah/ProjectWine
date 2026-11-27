# Spec Delta

## ADDED Requirements

### Requirement: Rückenetikett in 3D
Hat ein Wein ein Rückseitenbild, SHALL die 3D-Ansicht es als Etikett auf die Rückseite der Flasche legen, gegenüber dem Vorderetikett und auf dessen Höhe. Es MUST um den Flaschenkörper gewölbt sein, sein Seitenverhältnis behalten, den Flaschenumfang nicht überschreiten und das Vorderetikett nicht überlappen. Ohne Rückseitenbild MUST die Rückseite der Flasche unverändert Glas zeigen.

#### Scenario: Flasche umdrehen
- **GIVEN** „Sassicaia“ hat ein Etikettenbild und ein Rückseitenbild
- **WHEN** ich die Flasche in der 3D-Ansicht auf die Rückseite drehe
- **THEN** sehe ich dort das Rückenetikett, unverzerrt und vollständig
- **AND** auf der Vorderseite sitzt weiterhin das Vorderetikett

#### Scenario: Breites Rückseitenfoto
- **GIVEN** das Rückseitenbild ist viel breiter als hoch
- **WHEN** ich die Rückseite betrachte
- **THEN** ist das Etikett nicht breiter als der Flaschenumfang erlaubt und behält seine Proportionen

#### Scenario: Ohne Rückseitenbild
- **GIVEN** „Zweigelt“ hat kein Rückseitenbild
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** zeigt die Flasche kein Rückenetikett und verhält sich wie bisher

#### Scenario: Rückseite wird entfernt
- **GIVEN** die 3D-Ansicht zeigt das Rückenetikett
- **WHEN** ich die Rückseite des Weins entferne
- **THEN** verschwindet das Rückenetikett ohne Neuladen der Seite

### Requirement: Volle Drehung mit Rückseite
Hat ein Wein ein Rückseitenbild, SHALL sich die Flasche in der 3D-Ansicht waagerecht beliebig weit drehen lassen (Maus, Finger, Pfeiltasten links/rechts), damit die Rückseite erreichbar ist; die Neigung MUST begrenzt bleiben. Ohne Rückseitenbild MUST die Drehung wie bisher begrenzt sein.

#### Scenario: Ganz herumdrehen
- **GIVEN** „Sassicaia“ hat ein Rückseitenbild
- **WHEN** ich die Flasche mit der Maus um mehr als eine halbe Umdrehung ziehe
- **THEN** dreht sie sich bis zur Rückseite und weiter

#### Scenario: Tastatur
- **GIVEN** „Sassicaia“ hat ein Rückseitenbild und die 3D-Ansicht ist fokussiert
- **WHEN** ich mehrfach die Pfeiltaste nach rechts drücke
- **THEN** dreht sich die Flasche über die Seite bis zur Rückseite

#### Scenario: Ohne Rückseitenbild begrenzt
- **GIVEN** „Zweigelt“ hat kein Rückseitenbild
- **WHEN** ich die Flasche weit zur Seite ziehe
- **THEN** stoppt die Drehung an der bisherigen Grenze

### Requirement: Rückseite per Schaltfläche zeigen
Hat ein Wein ein Rückseitenbild, SHALL die 3D-Ansicht eine Schaltfläche „Rückseite zeigen“ anbieten, die die Flasche weich auf die Rückseite dreht und danach „Vorderseite zeigen“ heißt. „Ansicht zurücksetzen“ MUST wieder die Vorderseite zeigen. Bei der Einstellung „Bewegung reduzieren“ MUST die Drehung ohne Animation springen. Die Schaltfläche MUST per Tastatur bedienbar sein.

#### Scenario: Zur Rückseite
- **GIVEN** die 3D-Ansicht zeigt die Vorderseite von „Sassicaia“, das ein Rückseitenbild hat
- **WHEN** ich „Rückseite zeigen“ wähle
- **THEN** dreht sich die Flasche auf die Rückseite
- **AND** die Schaltfläche heißt „Vorderseite zeigen“

#### Scenario: Keine Schaltfläche ohne Rückseite
- **GIVEN** „Zweigelt“ hat kein Rückseitenbild
- **WHEN** ich die 3D-Ansicht öffne
- **THEN** gibt es keine Schaltfläche „Rückseite zeigen“

#### Scenario: Bewegung reduzieren
- **GIVEN** der Browser meldet „Bewegung reduzieren“
- **WHEN** ich „Rückseite zeigen“ wähle
- **THEN** springt die Ansicht ohne Animation auf die Rückseite
