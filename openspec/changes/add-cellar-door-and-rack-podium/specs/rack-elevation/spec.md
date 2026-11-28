## ADDED Requirements

### Requirement: Höhe eines Regals über dem Boden
Das System SHALL für jedes platzierte Regal eine Höhe über dem Fußboden in ganzen Zentimetern speichern (0 bis 200; Standard 0 = Regal steht auf dem Boden). Die Höhe gehört zur Platzierung: Wird das Regal aus dem Raum genommen, MUST sie auf 0 zurückgesetzt werden. Ein Regal mit einer Höhe über 0 MUST samt seiner Höhe (Höhe über Boden + Anzahl Reihen × 12 cm) unter die Raumdecke passen. Die Höhe ändert die Grundfläche nicht: Die Überlappungsprüfung zwischen Regalen bleibt auf der Grundfläche, ein Regal darf also nicht über oder unter einem anderen Regal stehen.

#### Scenario: Regal anheben
- **GIVEN** ein platziertes Regal mit 5 Reihen im Raum der Höhe 2,50 m
- **WHEN** der Benutzer die Höhe über dem Boden auf 40 cm setzt
- **THEN** ist die Höhe 40 cm gespeichert und Position und Drehung des Regals bleiben unverändert

#### Scenario: Zu hoch für den Raum
- **GIVEN** ein Raum mit Deckenhöhe 2,50 m und ein Regal mit 10 Reihen (120 cm)
- **WHEN** der Benutzer die Höhe über dem Boden auf 150 cm setzt
- **THEN** lehnt das System die Änderung als Konflikt ab und nennt das Regal
- **AND** die bisherige Höhe bleibt erhalten

#### Scenario: Ungültige Höhe
- **WHEN** der Benutzer eine Höhe von −5 cm oder 250 cm speichert
- **THEN** lehnt das System die Aktion mit einer verständlichen Fehlermeldung ab

#### Scenario: Raum abgesenkt
- **GIVEN** ein Regal mit Höhe 40 cm über dem Boden und 10 Reihen (120 cm) steht im Raum der Höhe 2,50 m
- **WHEN** der Benutzer die Deckenhöhe auf 1,50 m verkleinert
- **THEN** lehnt das System die Änderung als Konflikt ab und nennt das Regal

#### Scenario: Regal vergrößern
- **GIVEN** ein Regal auf 180 cm Höhe über dem Boden mit 5 Reihen im Raum der Höhe 2,50 m
- **WHEN** der Benutzer es auf 8 Reihen vergrößert
- **THEN** lehnt das System die Änderung als Konflikt ab

#### Scenario: Regal aus dem Raum nehmen
- **GIVEN** ein Regal steht auf 40 cm Höhe
- **WHEN** der Benutzer „Entfernen“ wählt und das Regal später wieder platziert
- **THEN** steht es mit Höhe 0 auf dem Boden

#### Scenario: Höhe bleibt beim Verschieben
- **GIVEN** ein Regal steht auf 40 cm Höhe
- **WHEN** der Benutzer es an eine andere Position zieht
- **THEN** behält es die Höhe 40 cm

#### Scenario: Höhe ist privat
- **WHEN** Benutzer „ben“ die Höhe von Annas Regal ändern will
- **THEN** antwortet das System mit „nicht gefunden“

### Requirement: Podest unter erhöhten Regalen
Die 3D-Szene des Kellerraums SHALL unter jedem Regal mit einer Höhe über 0 ein Podest zeigen: einen Quader in genau der Grundfläche des Regals (gedreht wie das Regal) vom Boden bis zur Unterkante des Regals, in einem vom Boden und von den Regalbrettern unterscheidbaren Material. Regal, Flaschenböden, Auswahlhervorhebung und Ziehumriss MUST um die Höhe angehoben dargestellt werden. Bei Höhe 0 MUST kein Podest erscheinen. Das Podest ist kein eigenes Objekt: Es wird mit dem Regal ausgewählt, verschoben und gedreht und erscheint nirgends in einer eigenen Liste. Der Benutzer SHALL die Höhe in der Regalliste und in der Infoleiste des ausgewählten Regals über ein Eingabefeld (in cm) einstellen können; die Liste und die Textbeschreibung zeigen sie an („40 cm über dem Boden“).

#### Scenario: Podest sichtbar
- **GIVEN** ein Regal steht auf 40 cm Höhe
- **WHEN** ich den Kellerraum ansehe
- **THEN** steht das Regal samt Flaschenböden 40 cm über dem Boden auf einem Podest in seiner Grundfläche und schwebt nicht

#### Scenario: Podest folgt dem Regal
- **GIVEN** ein Regal mit Podest im Modus „Anordnen“
- **WHEN** ich es ziehe oder drehe
- **THEN** bewegt bzw. dreht sich das Podest mit und bleibt genau unter dem Regal

#### Scenario: Ohne Höhe kein Podest
- **GIVEN** ein Regal steht auf dem Boden (Höhe 0)
- **WHEN** ich den Kellerraum ansehe
- **THEN** erscheint unter dem Regal kein Podest

#### Scenario: Höhe in der Liste ändern
- **GIVEN** ein Regal steht im Raum
- **WHEN** ich in der Regalliste die Höhe 25 cm eingebe und bestätige
- **THEN** zeigt die 3D-Szene das Regal auf einem 25 cm hohen Podest und die Liste „25 cm über dem Boden“

#### Scenario: Speichern schlägt fehl
- **WHEN** das Speichern einer neuen Höhe fehlschlägt
- **THEN** zeigt die Szene wieder die gespeicherte Höhe und eine Fehlermeldung erscheint

#### Scenario: Nicht platziertes Regal
- **GIVEN** ein Regal ist nicht platziert
- **WHEN** ich die Regalliste ansehe
- **THEN** gibt es für dieses Regal kein Höhenfeld
