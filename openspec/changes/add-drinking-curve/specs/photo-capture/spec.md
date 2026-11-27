## MODIFIED Requirements

### Requirement: Inhalt der Recherche
Der Agent SHALL aus den Fotos und einer Websuche folgende Angaben ermitteln, soweit möglich: Name, Weingut, Jahrgang, Weintyp, Land, Region, Rebsorten mit optionalen Anteilen, Flaschengröße, Trinkfenster (von/bis), optimalen Trinkzeitpunkt und Streuung in Jahren, Barcode (EAN/UPC) und eine kurze Notiz (höchstens 500 Zeichen). Jede Angabe MUST als „vom Etikett“ oder „aus dem Web“ gekennzeichnet sein. Nicht ermittelbare Angaben MUST leer bleiben statt geraten zu werden. Die genutzten Webquellen (Titel und Adresse) MUST im Entwurf stehen.

#### Scenario: Angaben mit Herkunft
- **GIVEN** das Etikett zeigt „Sassicaia 2021, Tenuta San Guido, Bolgheri“
- **WHEN** die Recherche fertig ist
- **THEN** sind Name, Weingut und Jahrgang als „vom Etikett“ gekennzeichnet
- **AND** Rebsorten und Trinkfenster sind als „aus dem Web“ gekennzeichnet und mit Quellen belegt

#### Scenario: Nichts im Web gefunden
- **GIVEN** das Etikett eines unbekannten Hausweins zeigt nur „Rotwein trocken 2023“
- **WHEN** die Recherche fertig ist
- **THEN** enthält der Entwurf nur die Angaben vom Etikett, die übrigen Felder sind leer
- **AND** der Entwurf hat den Status „fertig“ mit dem Hinweis, dass im Web nichts Passendes gefunden wurde

#### Scenario: Kein Wein auf dem Foto
- **WHEN** das Foto kein Weinetikett zeigt
- **THEN** hat der Entwurf den Status „fehlgeschlagen“ mit dem Hinweis, dass kein Weinetikett erkannt wurde

## ADDED Requirements

### Requirement: Trinkkurve im Entwurf
Der Entwurf SHALL Trinkzeitpunkt und Streuung aus der Recherche übernehmen und mit „aus dem Web“ oder „geschätzt“ kennzeichnen; „geschätzt“ bedeutet aus Rebsorte, Region, Jahrgang und Stil abgeleitet statt wörtlich belegt. Beide Werte MUST nur gemeinsam und nur dann übernommen werden, wenn sie plausibel sind (Zeitpunkt zwischen Jahrgang und aktuellem Jahr + 100, Streuung zwischen 0,5 und 50). Liefert die Recherche ein Trinkfenster, aber keine Kurve, MUST der Entwurf eine Kurve daraus ableiten (Mitte des Fensters, Viertel der Breite) und als „abgeleitet“ kennzeichnen. Die Übernahme des Entwurfs als Wein MUST beide Werte in den Wein übertragen.

#### Scenario: Entwurf mit Trinkkurve
- **GIVEN** die Recherche liefert Trinkzeitpunkt 2031 und Streuung 3 aus dem Web
- **WHEN** ich den Entwurf öffne
- **THEN** zeigt das Formular beide Werte als „aus dem Web“ und die Kurve zur Kontrolle
- **AND** nach dem Übernehmen als Wein zeigt dessen Einzelansicht die Kurve

#### Scenario: Geschätzt statt belegt
- **GIVEN** die Recherche liefert Trinkzeitpunkt und Streuung als „geschätzt“
- **WHEN** ich den Entwurf öffne
- **THEN** sind beide Felder als „geschätzt“ gekennzeichnet

#### Scenario: Aus dem Fenster abgeleitet
- **GIVEN** die Recherche liefert das Trinkfenster 2026 bis 2034, aber keine Kurve
- **WHEN** ich den Entwurf öffne
- **THEN** zeigt das Formular Trinkzeitpunkt 2030 und Streuung 2 als „abgeleitet“

#### Scenario: Unplausible Werte
- **GIVEN** die Recherche liefert Trinkzeitpunkt 1850 für einen Wein des Jahrgangs 2020
- **WHEN** ich den Entwurf öffne
- **THEN** sind Trinkzeitpunkt und Streuung leer
