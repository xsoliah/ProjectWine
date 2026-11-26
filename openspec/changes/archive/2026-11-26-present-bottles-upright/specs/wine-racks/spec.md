# Spec Delta

## MODIFIED Requirements

### Requirement: Reihe antippen zeigt ihre Weine
In der 3D-Ansicht SHALL das Antippen einer Flasche oder eines Fachs die ganze Reihe hervorheben und alle Fächer dieser Reihe von links nach rechts auflisten: für belegte Fächer Spalte, Name, Erzeuger, Jahrgang und Typ des Weins, für freie Fächer Spalte und „frei“. Die Flaschen der ausgewählten Reihe MUST weich aus dem Regal herausfahren, sich dabei um ihre Längsachse drehen und aufrichten, sodass sie am Ende aufrecht mit dem Etikett zum Betrachter stehen. Das Antippen eines Eintrags MUST die Fach-Aktionen (einlagern, umlagern, auslagern, trinken, verkaufen, verschenken) öffnen. Das Antippen einer anderen Reihe MUST die Auswahl wechseln, Schließen MUST die Hervorhebung aufheben und die Flaschen wieder einfahren.

#### Scenario: Reihe 2 antippen
- **GIVEN** ein Regal mit Höhe 5 und Breite 6, in Reihe 2 liegt „Sassicaia“ 2021 in Spalte 3 und „Zweigelt“ in Spalte 5
- **WHEN** ich in der 3D-Ansicht auf eine Flasche oder ein Fach in Reihe 2 tippe
- **THEN** ist Reihe 2 hervorgehoben
- **AND** die Liste zeigt Spalte 1 frei, Spalte 2 frei, Spalte 3 „Sassicaia“ 2021, Spalte 4 frei, Spalte 5 „Zweigelt“, Spalte 6 frei

#### Scenario: Flaschen der Reihe fahren heraus
- **GIVEN** in Reihe 2 liegen zwei Flaschen, die übrigen Reihen sind ebenfalls belegt
- **WHEN** ich auf Reihe 2 tippe
- **THEN** fahren die beiden Flaschen in einer kurzen, weichen Bewegung aus dem Regal heraus, drehen sich dabei um ihre Längsachse und richten sich auf
- **AND** am Ende stehen sie aufrecht und ihr Etikett zeigt frontal zum Betrachter und ist lesbar
- **AND** die Flaschen aller anderen Reihen bleiben unverändert im Regal

#### Scenario: Andere Reihe wählen
- **GIVEN** Reihe 2 ist ausgewählt
- **WHEN** ich auf ein Fach in Reihe 4 tippe
- **THEN** ist nur noch Reihe 4 hervorgehoben und die Liste zeigt die Fächer von Reihe 4
- **AND** die Flaschen von Reihe 2 legen sich wieder und fahren ein, die von Reihe 4 fahren heraus

#### Scenario: Auswahl schließen
- **GIVEN** Reihe 2 ist ausgewählt und ihre Flaschen stehen aufrecht vor dem Regal
- **WHEN** ich die Reihe schließe
- **THEN** legen sich die Flaschen wieder, fahren vollständig ins Regal und die Hervorhebung verschwindet

#### Scenario: Oberste und unterste Reihe
- **GIVEN** ein Regal, dessen oberste Reihe belegt ist
- **WHEN** ich die oberste Reihe wähle
- **THEN** sind die aufrecht stehenden Flaschen vollständig sichtbar und nicht am Bildrand abgeschnitten

#### Scenario: Bewegung reduzieren
- **GIVEN** mein Gerät ist auf „Bewegung reduzieren“ eingestellt
- **WHEN** ich eine Reihe auswähle oder abwähle
- **THEN** wechseln die Flaschen ohne Animation direkt in die aufrechte, ausgefahrene bzw. die liegende, eingefahrene Stellung

#### Scenario: Aus der Reihe trinken
- **GIVEN** die Liste von Reihe 2 ist geöffnet
- **WHEN** ich auf „Sassicaia“ 2021 tippe und „Trinken“ wähle
- **THEN** ist Reihe 2, Spalte 3 frei und im 3D-Regal liegt dort keine Flasche mehr

## ADDED Requirements

### Requirement: Weißwein erscheint als helles Glas
Die Flaschen von Weißwein SHALL in der 3D-Ansicht in sehr hellem, weißlichem Glas erscheinen (nur ein leichter Grünstich, kein deutliches Gelb) und sich dadurch klar von Rosé-, Dessertwein- und Rotweinflaschen unterscheiden.

#### Scenario: Weißwein neben Dessertwein
- **GIVEN** im Regal liegen eine Flasche Weißwein und eine Flasche Dessertwein
- **WHEN** ich das Regal in 3D ansehe
- **THEN** wirkt die Weißweinflasche hell und weißlich
- **AND** die Dessertweinflasche bleibt deutlich bernsteinfarben
