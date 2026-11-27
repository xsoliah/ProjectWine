# Spec Delta

## MODIFIED Requirements

### Requirement: Rückseitenbild nachträglich setzen und entfernen
Das System SHALL erlauben, einem Wein in der Detailansicht ein Rückseitenbild aus einem Foto (JPEG, PNG oder WebP, höchstens 10 MB) hinzuzufügen oder ein vorhandenes zu ersetzen sowie es zu entfernen. Beim Hinzufügen oder Ersetzen MUST der Benutzer die Ecken des Rückenetiketts im Ecken-Editor bestätigen (Vorschlag in der Bildmitte); das Rückseitenbild MUST daraus zugeschnitten entstehen (siehe „Rückenetikett zuschneiden“). Das ersetzte oder entfernte Bild samt Originalfoto MUST gelöscht werden. Das Setzen MUST keine Recherche auslösen und nicht auf das Tageslimit angerechnet werden. Das Rückseitenbild MUST unabhängig vom Vorderetikett gesetzt werden können.

#### Scenario: Rückseite hinzufügen
- **GIVEN** „Sassicaia“ hat kein Rückseitenbild
- **WHEN** ich ein Foto des Rückenetiketts wähle und die Ecken bestätige
- **THEN** hat „Sassicaia“ ein zugeschnittenes Rückseitenbild

#### Scenario: Rückseite ersetzen
- **GIVEN** „Sassicaia“ hat ein Rückseitenbild
- **WHEN** ich ein neues Foto wähle und die Ecken bestätige
- **THEN** zeigt „Sassicaia“ das neue Bild
- **AND** das alte Bild und sein Originalfoto sind gelöscht

#### Scenario: Rückseite entfernen
- **WHEN** ich bei „Sassicaia“ das Rückseitenbild entferne
- **THEN** hat „Sassicaia“ kein Rückseitenbild mehr
- **AND** Rückseitenbild und Originalfoto sind gelöscht

#### Scenario: Ungültige Datei
- **WHEN** ich eine Datei wähle, die kein JPEG, PNG oder WebP ist oder größer als 10 MB ist
- **THEN** wird sie abgelehnt und das bisherige Rückseitenbild bleibt erhalten

## ADDED Requirements

### Requirement: Rückenetikett zuschneiden
Das System SHALL das Rückseitenbild aus den vier vom Benutzer bestätigten Ecken auf dem Originalfoto ausschneiden und perspektivisch entzerren; alles außerhalb der Ecken MUST verworfen werden. Das Rückseitenbild MUST im Hochformat 3:4 mit 900 × 1200 Pixeln als JPEG gespeichert werden; passt das Etikett nicht genau in 3:4, MUST es vollständig, zentriert und unverzerrt eingepasst und die freie Fläche in der gemittelten Papierfarbe gefüllt werden. Die Detailansicht und die 3D-Flasche MUST das zugeschnittene Bild zeigen.

#### Scenario: Schräg fotografiertes Rückenetikett
- **GIVEN** ich habe das Rückenetikett von „Sassicaia“ schräg vor einem Küchentisch fotografiert
- **WHEN** ich die vier Ecken des Etiketts bestätige
- **THEN** zeigt das Rückseitenbild nur das Etikett, gerade ausgerichtet, im Format 900 × 1200 Pixel
- **AND** auf der Rückseite der 3D-Flasche sehe ich dasselbe zugeschnittene Etikett

#### Scenario: Breites Rückenetikett
- **GIVEN** ein Rückenetikett, das breiter als hoch ist
- **WHEN** ich die Ecken bestätige
- **THEN** ist das Bild 900 × 1200 Pixel groß und zeigt das ganze Etikett unverzerrt
- **AND** oberhalb und unterhalb ist eine einfarbige Fläche in der Papierfarbe, aber nichts vom Foto

### Requirement: Zuschnitt der Rückseite anpassen
Der Benutzer SHALL in der Detailansicht über „Zuschnitt anpassen“ die vier Ecken auf dem Originalfoto der Rückseite verschieben können; danach MUST das Rückseitenbild neu entstehen. Das Originalfoto MUST dafür gespeichert bleiben und SHALL nirgends angezeigt werden außer im Ecken-Editor. Hat ein Wein noch ein unbearbeitetes Rückseitenbild (ohne Originalfoto), MUST dieses als Originalfoto dienen und beim Speichern der Ecken als solches erhalten bleiben. Das Anpassen MUST keine Recherche auslösen und nicht auf das Tageslimit angerechnet werden.

#### Scenario: Ecken korrigieren
- **GIVEN** beim Rückseitenbild von „Sassicaia“ fehlt unten ein Stück des Etiketts
- **WHEN** ich „Zuschnitt anpassen“ wähle und die unteren Ecken nach unten ziehe
- **THEN** zeigt das neue Rückseitenbild das ganze Etikett im Standardformat

#### Scenario: Bestehendes Rohfoto zuschneiden
- **GIVEN** „Sassicaia“ hat ein unbearbeitetes Rückseitenbild aus der Foto-Erfassung
- **WHEN** ich „Zuschnitt anpassen“ wähle und die Ecken bestätige
- **THEN** zeigt „Sassicaia“ ein zugeschnittenes Rückseitenbild
- **AND** das Rohfoto bleibt als Originalfoto erhalten

### Requirement: Originalfoto der Rückseite löschen und schützen
Beim Löschen eines Weins MUST dessen Rückseitenbild samt Originalfoto gelöscht werden. Rückseitenbild und Originalfoto SHALL nur für ihren Besitzer abrufbar sein; jeder Abruf MUST eine gültige Anmeldung erfordern.

#### Scenario: Wein löschen
- **GIVEN** „Sassicaia“ hat ein zugeschnittenes Rückseitenbild
- **WHEN** ich den Wein lösche
- **THEN** sind Rückseitenbild und Originalfoto gelöscht

#### Scenario: Fremdes Originalfoto
- **GIVEN** Benutzerin „anna“ hat ein Rückseitenbild mit Originalfoto
- **WHEN** Benutzer „ben“ das Originalfoto abruft
- **THEN** erhält er „nicht gefunden“
