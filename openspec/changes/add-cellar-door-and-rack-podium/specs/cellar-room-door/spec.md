## ADDED Requirements

### Requirement: Tür im Kellerraum festlegen
Das System SHALL für den Kellerraum eines Benutzers optional eine Tür speichern: die Wand (vorne, hinten, links oder rechts) und den Abstand der Türkante vom Anfang der Wand in Zentimetern (bei vorderer und hinterer Wand von der linken Wand, bei linker und rechter Wand von der hinteren Wand). Die Tür ist 90 cm breit und 205 cm hoch, höchstens jedoch so hoch wie der Raum. Die Tür MUST vollständig in ihrer Wand liegen (Abstand ≥ 0 und Abstand + 90 cm ≤ Wandlänge). Ohne Angabe hat der Raum keine Tür. Der Benutzer SHALL die Tür setzen, ändern und entfernen können.

#### Scenario: Tür setzen
- **GIVEN** ein Raum von 4 m × 3 m ohne Tür
- **WHEN** der Benutzer eine Tür an der vorderen Wand mit 150 cm Abstand speichert
- **THEN** hat der Raum beim nächsten Öffnen eine Tür an der vorderen Wand 150 cm von der linken Wand

#### Scenario: Tür verschieben
- **GIVEN** der Raum hat eine Tür an der hinteren Wand
- **WHEN** der Benutzer sie an die rechte Wand mit 100 cm Abstand von der hinteren Wand setzt
- **THEN** zeigt der Raum nur noch eine Tür, und zwar an der rechten Wand

#### Scenario: Tür passt nicht in die Wand
- **GIVEN** ein Raum von 4 m × 3 m
- **WHEN** der Benutzer eine Tür an der vorderen Wand mit 330 cm Abstand speichert
- **THEN** lehnt das System die Aktion mit einer verständlichen Fehlermeldung ab
- **AND** eine vorhandene Tür bleibt unverändert

#### Scenario: Ungültige Wand
- **WHEN** eine Wand außerhalb von vorne, hinten, links, rechts gespeichert werden soll
- **THEN** lehnt das System die Aktion ab

#### Scenario: Tür entfernen
- **GIVEN** der Raum hat eine Tür
- **WHEN** der Benutzer „Tür entfernen“ wählt
- **THEN** hat der Raum keine Tür mehr

#### Scenario: Raum verkleinern schließt die Tür aus
- **GIVEN** die Tür steht an der vorderen Wand bei 300 cm Abstand
- **WHEN** der Benutzer die Raumbreite auf 3 m verkleinert
- **THEN** lehnt das System die Änderung als Konflikt ab und nennt die Tür
- **AND** die Raummaße bleiben unverändert

#### Scenario: Tür ist privat
- **GIVEN** Benutzerin „anna“ hat eine Tür gesetzt
- **WHEN** Benutzer „ben“ seinen Kellerraum abruft
- **THEN** hat sein Raum keine Tür

### Requirement: Tür in 3D darstellen und verschieben
Die 3D-Szene des Kellerraums SHALL die Tür an der gespeicherten Stelle als Öffnung in der Wand mit Rahmen und Türblatt in maßstäblicher Größe zeigen, deutlich unterscheidbar von der Wand. Wie die Wand MUST sie durchscheinend werden, wenn sie dem Betrachter den Blick versperrt. Im Modus „Anordnen“ SHALL der Benutzer die Tür per Ziehen an einer Wand entlang und auf eine andere Wand verschieben können; sie rastet dabei an Wandanfang, Wandende und Raumecken ein (Toleranz 10 cm) und bleibt immer vollständig in der Wand. Alle Türeinstellungen MUST auch über Eingabefelder (Wand, Abstand in cm) und per Tastatur bedienbar sein; die Szenenbeschreibung für Screenreader MUST die Tür erwähnen („Tür an der vorderen Wand“).

#### Scenario: Tür als Orientierung
- **GIVEN** der Raum hat eine Tür an der hinteren Wand
- **WHEN** ich den Kellerraum ansehe und die Ansicht drehe
- **THEN** sehe ich die Tür in der hinteren Wand und kann mich damit im Raum orientieren

#### Scenario: Tür ziehen
- **GIVEN** der Modus „Anordnen“ und eine Tür an der vorderen Wand
- **WHEN** ich die Tür zur linken Wand ziehe und loslasse
- **THEN** steht sie an der linken Wand, ist vollständig in der Wand und die Position ist gespeichert

#### Scenario: Tür rastet am Wandende ein
- **GIVEN** der Modus „Anordnen“ und eine Tür, die 6 cm vor dem Wandende steht
- **WHEN** ich sie loslasse
- **THEN** rastet sie am Wandende ein (Abstand von der Ecke 0 cm)

#### Scenario: Speichern schlägt fehl
- **GIVEN** ich ziehe die Tür an eine andere Stelle
- **WHEN** das Speichern fehlschlägt
- **THEN** kehrt die Tür an ihre gespeicherte Position zurück und eine Fehlermeldung erscheint

#### Scenario: Ohne 3D
- **GIVEN** mein Browser unterstützt keine 3D-Darstellung
- **WHEN** ich den Kellerraum öffne
- **THEN** zeigt die Liste die Tür mit Wand und Abstand an und ich kann sie über Eingabefelder setzen oder entfernen
