# Spec Delta

## ADDED Requirements

### Requirement: Im Flaschenzoom zwischen Flaschen navigieren
Ist die Kamera auf eine Flasche gezoomt, SHALL man horizontal zur vorherigen bzw. nächsten belegten Flasche derselben Reihe wechseln können, per Schaltflächen „Vorherige“ und „Nächste“, Pfeiltasten links/rechts und Wischen nach rechts/links. Die Kamera MUST dabei weich seitlich zur anderen Flasche fahren, ohne in die Reihenansicht zurückzukehren, und die Weinbeschreibung MUST mitwechseln. Leere Fächer MUST übersprungen werden. Am Anfang und Ende der Reihe MUST die entsprechende Richtung deaktiviert sein und nicht in eine andere Reihe wechseln. Die Beschreibung MUST die Position in der Reihe anzeigen (Spalte und Rang unter den belegten Fächern).

#### Scenario: Nächste Flasche
- **GIVEN** die Kamera ist auf „Sassicaia“ 2021 in Reihe 2, Spalte 3 gezoomt und Spalte 4 ist belegt mit „Zweigelt“
- **WHEN** ich „Nächste“ wähle, die Pfeiltaste rechts drücke oder nach links wische
- **THEN** fährt die Kamera weich seitlich zu „Zweigelt“
- **AND** die Leiste zeigt jetzt „Zweigelt“

#### Scenario: Leere Fächer überspringen
- **GIVEN** die Kamera ist auf die Flasche in Reihe 2, Spalte 3 gezoomt und Spalte 4 ist leer, Spalte 5 belegt
- **WHEN** ich „Nächste“ wähle
- **THEN** fährt die Kamera zur Flasche in Spalte 5

#### Scenario: Reihenende
- **GIVEN** die Kamera ist auf die letzte belegte Flasche der Reihe gezoomt
- **WHEN** ich die Ansicht betrachte
- **THEN** ist „Nächste“ deaktiviert
- **AND** Pfeiltaste rechts und Wischen nach links bleiben ohne Wirkung und wechseln nicht in eine andere Reihe

#### Scenario: Position in breiter Reihe
- **GIVEN** das Regal hat 10 Spalten und die Reihe 6 belegte Fächer
- **WHEN** die Kamera auf die zweite belegte Flasche in Spalte 3 gezoomt ist
- **THEN** zeigt die Leiste „Spalte 3 von 10“ und „Flasche 2 von 6“

#### Scenario: Schnelles Durchblättern
- **GIVEN** die Kamera fährt noch zur nächsten Flasche
- **WHEN** ich erneut „Nächste“ wähle
- **THEN** fährt die Kamera ab der aktuellen Position weiter zur dann nächsten Flasche, ohne zu springen

#### Scenario: Bewegung reduzieren
- **GIVEN** mein Gerät ist auf „Bewegung reduzieren“ eingestellt
- **WHEN** ich zur Nachbarflasche wechsle
- **THEN** springt die Kamera ohne Animation direkt zu ihr

#### Scenario: Zurück zur Reihe
- **GIVEN** ich habe mehrere Flaschen per Navigation angesehen
- **WHEN** ich „Zurück zur Reihe“ wähle oder Escape drücke
- **THEN** fährt die Kamera in die Reihenansicht zurück und die Reihe bleibt ausgewählt

#### Scenario: Bedienung per Screenreader
- **GIVEN** die Leiste ist geöffnet
- **WHEN** ich per Tastatur „Nächste“ auslöse
- **THEN** liest ein Screenreader die neue Flasche samt Position in der Reihe vor
