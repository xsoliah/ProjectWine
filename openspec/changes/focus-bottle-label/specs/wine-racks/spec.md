# Spec Delta

## ADDED Requirements

### Requirement: Auf eine Flasche zoomen
In der 3D-Ansicht SHALL das Antippen einer ausgefahrenen Flasche die Kamera weich auf diese Flasche fahren, sodass ihr Etikett gut lesbar ist. Eine andere ausgefahrene Flasche derselben Reihe MUST die Kamera zu dieser Flasche fahren. Die Rückkehr zur Reihenansicht MUST per Schaltfläche „Zurück zur Reihe“, Escape-Taste, Tipp auf eine leere Fläche oder „Ansicht zurücksetzen“ möglich sein; die Reihe bleibt dabei ausgewählt, außer „Ansicht zurücksetzen“ hebt auch sie auf.

#### Scenario: Flasche antippen
- **GIVEN** Reihe 2 ist ausgewählt und ihre Flaschen stehen aufrecht vor dem Regal
- **WHEN** ich auf „Sassicaia“ 2021 tippe
- **THEN** fährt die Kamera in einer kurzen, weichen Bewegung auf diese Flasche
- **AND** das Etikett ist groß und lesbar zu sehen

#### Scenario: Andere Flasche der Reihe
- **GIVEN** die Kamera ist auf „Sassicaia“ 2021 gezoomt
- **WHEN** ich auf die Flasche „Zweigelt“ in derselben Reihe tippe
- **THEN** fährt die Kamera zu „Zweigelt“

#### Scenario: Zurück zur Reihe
- **GIVEN** die Kamera ist auf eine Flasche gezoomt
- **WHEN** ich „Zurück zur Reihe“ wähle oder Escape drücke
- **THEN** fährt die Kamera in die Reihenansicht zurück
- **AND** Reihe 2 bleibt ausgewählt und ihre Flaschen stehen weiter vor dem Regal

#### Scenario: Bewegung reduzieren
- **GIVEN** mein Gerät ist auf „Bewegung reduzieren“ eingestellt
- **WHEN** ich eine Flasche antippe
- **THEN** springt die Kamera ohne Animation direkt auf die Flasche

#### Scenario: Reihe wechseln beendet den Zoom
- **GIVEN** die Kamera ist auf eine Flasche in Reihe 2 gezoomt
- **WHEN** ich eine andere Reihe wähle
- **THEN** fährt die Kamera in die Reihenansicht zurück und die Leiste schließt sich

### Requirement: Weinbeschreibung unten
Beim Zoomen auf eine Flasche SHALL sich unten in der 3D-Ansicht eine niedrige Leiste mit Name, Erzeuger, Jahrgang, Typ, Herkunft, Rebsorten, Trinkfenster, Notiz (leere Angaben entfallen) und den Aktionen „Fach-Aktionen“ und „Zum Wein“ öffnen. Sie MUST höchstens etwa ein Viertel der 3D-Fläche belegen; die Flasche MUST darüber vollständig sichtbar sein. Name, Erzeuger, Jahrgang und Typ MUST sofort erscheinen, auch wenn der Rest noch lädt.

#### Scenario: Leiste öffnet sich
- **GIVEN** ich tippe auf „Sassicaia“ 2021 (Rotwein, Toskana, Italien, Cabernet Sauvignon)
- **WHEN** die Kamera die Flasche erreicht
- **THEN** zeigt die Leiste unten „Sassicaia“, 2021, Rotwein, Italien/Toskana und Cabernet Sauvignon
- **AND** die Flasche samt Etikett ist oberhalb der Leiste vollständig sichtbar

#### Scenario: Leiste überdeckt wenig
- **GIVEN** die Leiste ist geöffnet
- **WHEN** ich die 3D-Fläche betrachte
- **THEN** reicht die Leiste höchstens etwa ein Viertel der Höhe der 3D-Fläche nach oben
- **AND** der Rest der Fläche mit der Flasche bleibt sichtbar und bedienbar

#### Scenario: Fach-Aktionen aus der Leiste
- **GIVEN** die Leiste von „Sassicaia“ in Reihe 2, Spalte 3 ist geöffnet
- **WHEN** ich „Fach-Aktionen“ wähle
- **THEN** öffnen sich die Fach-Aktionen für Reihe 2, Spalte 3

#### Scenario: Zum Wein
- **GIVEN** die Leiste ist geöffnet
- **WHEN** ich „Zum Wein“ wähle
- **THEN** öffnet sich die Weinansicht dieses Weins

#### Scenario: Beschreibung nicht ladbar
- **GIVEN** die Weindaten lassen sich nicht laden
- **WHEN** ich auf eine Flasche tippe
- **THEN** zeigt die Leiste weiterhin Name, Erzeuger, Jahrgang und Typ sowie die Aktionen, und die Ansicht bleibt bedienbar

#### Scenario: Bedienung per Tastatur und Screenreader
- **GIVEN** Reihe 2 ist ausgewählt und ihre Liste ist geöffnet
- **WHEN** ich per Tastatur bei einem Eintrag „Weinbeschreibung“ wähle
- **THEN** öffnet sich die Leiste mit der Beschreibung, ein Screenreader liest sie vor
- **AND** ich kann die Aktionen ausführen und mit Escape zur Reihe zurückkehren
