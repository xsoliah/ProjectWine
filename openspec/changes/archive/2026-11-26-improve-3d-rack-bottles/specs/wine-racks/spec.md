# Spec Delta

## MODIFIED Requirements

### Requirement: 3D-Ansicht des Regals
Als zusätzliche, optionale Ansicht SHALL das System ein Regal als dreidimensionales Modell mit Höhe × Breite Fächern zeigen, wenn der Benutzer die 3D-Ansicht wählt. In jedem belegten Fach MUST eine liegende Flasche mit dem Hals zum Betrachter liegen, freie Fächer MUST leer sein. Alle Weine MUST dasselbe Modell einer Bordeaux-Flasche verwenden, dessen Glasfarbe sich nach dem Weintyp richtet und natürlichen Flaschenfarben entspricht (keine leuchtenden Farben). Auf jeder Flasche MUST das Etikett ihres Weins zu sehen sein, sofern der Wein ein Etikettenbild hat, sonst ein neutrales Etikett.

#### Scenario: Regal in 3D öffnen
- **GIVEN** ein Regal mit Höhe 5 und Breite 6, in dem 4 Flaschen liegen
- **WHEN** ich das Regal öffne und die Ansicht „3D“ wähle
- **THEN** sehe ich ein 3D-Regal mit 30 Fächern von vorne
- **AND** in 4 Fächern liegt eine Flasche, 26 Fächer sind leer

#### Scenario: Farbe nach Weintyp
- **GIVEN** im Regal liegen eine Flasche Rotwein und eine Flasche Weißwein
- **WHEN** ich das Regal in 3D ansehe
- **THEN** haben beide Flaschen dieselbe Form, aber unterschiedliche Glasfarben
- **AND** die Rotweinflasche ist dunkel (nahezu schwarzgrün) und nicht leuchtend rot

#### Scenario: Wein mit Etikettenbild
- **GIVEN** im Regal liegt eine Flasche „Sassicaia“ 2021, deren Wein ein Etikettenbild hat
- **WHEN** ich das Regal in 3D ansehe
- **THEN** zeigt die Flasche dieses Etikettenbild

#### Scenario: Wein ohne Etikettenbild
- **GIVEN** im Regal liegt eine Flasche, deren Wein kein Etikettenbild hat
- **WHEN** ich das Regal in 3D ansehe
- **THEN** trägt die Flasche ein neutrales Etikett ohne Beschriftung

#### Scenario: Etikettenbild lässt sich nicht laden
- **GIVEN** das Etikettenbild eines Weins ist nicht abrufbar
- **WHEN** ich das Regal in 3D ansehe
- **THEN** trägt die Flasche das neutrale Etikett und die 3D-Ansicht bleibt bedienbar

### Requirement: Reihe antippen zeigt ihre Weine
In der 3D-Ansicht SHALL das Antippen einer Flasche oder eines Fachs die ganze Reihe hervorheben und alle Fächer dieser Reihe von links nach rechts auflisten: für belegte Fächer Spalte, Name, Erzeuger, Jahrgang und Typ des Weins, für freie Fächer Spalte und „frei“. Die Flaschen der ausgewählten Reihe MUST weich ein Stück aus dem Regal herausfahren und sich dem Betrachter so zuneigen, dass ihre Etiketten lesbar sind. Das Antippen eines Eintrags MUST die Fach-Aktionen (einlagern, umlagern, auslagern, trinken, verkaufen, verschenken) öffnen. Das Antippen einer anderen Reihe MUST die Auswahl wechseln, Schließen MUST die Hervorhebung aufheben und die Flaschen wieder einfahren.

#### Scenario: Reihe 2 antippen
- **GIVEN** ein Regal mit Höhe 5 und Breite 6, in Reihe 2 liegt „Sassicaia“ 2021 in Spalte 3 und „Zweigelt“ in Spalte 5
- **WHEN** ich in der 3D-Ansicht auf eine Flasche oder ein Fach in Reihe 2 tippe
- **THEN** ist Reihe 2 hervorgehoben
- **AND** die Liste zeigt Spalte 1 frei, Spalte 2 frei, Spalte 3 „Sassicaia“ 2021, Spalte 4 frei, Spalte 5 „Zweigelt“, Spalte 6 frei

#### Scenario: Flaschen der Reihe fahren heraus
- **GIVEN** in Reihe 2 liegen zwei Flaschen, die übrigen Reihen sind ebenfalls belegt
- **WHEN** ich auf Reihe 2 tippe
- **THEN** fahren die beiden Flaschen in einer kurzen, weichen Bewegung aus dem Regal heraus und neigen sich dem Betrachter zu
- **AND** ihre Etiketten sind lesbar
- **AND** die Flaschen aller anderen Reihen bleiben unverändert im Regal

#### Scenario: Andere Reihe wählen
- **GIVEN** Reihe 2 ist ausgewählt
- **WHEN** ich auf ein Fach in Reihe 4 tippe
- **THEN** ist nur noch Reihe 4 hervorgehoben und die Liste zeigt die Fächer von Reihe 4
- **AND** die Flaschen von Reihe 2 fahren wieder ein, die von Reihe 4 fahren heraus

#### Scenario: Auswahl schließen
- **GIVEN** Reihe 2 ist ausgewählt und ihre Flaschen sind ausgefahren
- **WHEN** ich die Reihe schließe
- **THEN** fahren die Flaschen wieder vollständig ins Regal und die Hervorhebung verschwindet

#### Scenario: Bewegung reduzieren
- **GIVEN** mein Gerät ist auf „Bewegung reduzieren“ eingestellt
- **WHEN** ich eine Reihe auswähle oder abwähle
- **THEN** wechseln die Flaschen ohne Animation direkt in die ausgefahrene bzw. eingefahrene Stellung

#### Scenario: Aus der Reihe trinken
- **GIVEN** die Liste von Reihe 2 ist geöffnet
- **WHEN** ich auf „Sassicaia“ 2021 tippe und „Trinken“ wähle
- **THEN** ist Reihe 2, Spalte 3 frei und im 3D-Regal liegt dort keine Flasche mehr
