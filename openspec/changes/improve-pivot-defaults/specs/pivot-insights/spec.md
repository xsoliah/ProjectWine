## ADDED Requirements

### Requirement: Aussagekräftige Vorgabe
Das Pivot SHALL ohne Zutun des Benutzers eine Anordnung zeigen, die die Liste auf einen Blick zusammenfasst. Vorgaben: Keller Zeilen Land › Region (Land zugeklappt), Spalten Weinart, Kennzahlen Anzahl Flaschen und Summe Kaufpreis, Zeilen absteigend nach Flaschen; Archiv Zeilen Jahr › Quartal › Monat (nur Jahre aufgeklappt), Spalten Abgangsart, Kennzahlen Anzahl Flaschen und Durchschnittsbewertung; Regale Zeilen Regal, Spalten Weinart, Kennzahl Anzahl Flaschen mit Anteil an der Gesamtsumme. Eine bereits gemerkte Anordnung des Geräts MUST Vorrang vor der Vorgabe haben; „Zurücksetzen“ SHALL die neue Vorgabe herstellen.

#### Scenario: Erstes Öffnen im Keller
- **GIVEN** der Keller enthält Weine aus Italien (Toskana, Piemont) und Spanien, noch keine gemerkte Anordnung
- **WHEN** ich das Pivot öffne
- **THEN** sehe ich die Länder als zugeklappte Zeilen, die Weinarten als Spalten und je Zelle Flaschen und Kaufpreis
- **AND** das Land mit den meisten Flaschen steht oben

#### Scenario: Gemerkte Anordnung hat Vorrang
- **GIVEN** ich habe früher „Winzer“ in die Zeilen gelegt
- **WHEN** ich das Pivot öffne
- **THEN** ist meine Anordnung aktiv, nicht die Vorgabe

#### Scenario: Zurücksetzen
- **WHEN** ich „Zurücksetzen“ wähle
- **THEN** zeigt das Pivot wieder die Vorgabe der Liste

### Requirement: Kennzahlkacheln
Über dem Pivot SHALL eine Reihe von Kennzahlkacheln die Gesamtwerte der gefilterten Einträge zeigen (Keller: Flaschen, Weine, Wert; Archiv: Flaschen, Einträge, Durchschnittsbewertung; Regale: Flaschen, Regale). Die Kacheln MUST sich bei Filteränderungen aktualisieren und unabhängig von der Pivot-Anordnung bleiben. Mehrfach zugeordnete Rebsorten MUST die Kacheln nicht verdoppeln.

#### Scenario: Filter ändert Kacheln
- **GIVEN** das Keller-Pivot zeigt 40 Flaschen
- **WHEN** ich nach Weinart „Rot“ filtere und dort 25 Flaschen liegen
- **THEN** zeigt die Kachel „Flaschen“ 25

#### Scenario: Rebsorte als Pivotfeld
- **GIVEN** ein Wein mit 3 Flaschen und zwei Rebsorten, „Rebsorte“ steht in den Zeilen
- **THEN** zeigt die Kachel „Flaschen“ weiterhin 3

### Requirement: Heatmap
Das Pivot SHALL Wertzellen nach ihrem Wert in mehreren Stufen einfärben können (je Kennzahl getrennt skaliert), standardmäßig an. Der Zellwert MUST sichtbar bleiben, und die Farbstufen MUST in Hell- und Dunkelmodus ausreichend Kontrast zum Text haben. Ein Schalter SHALL die Heatmap aus- und einschalten; die Wahl wird je Liste gemerkt. Summenzellen werden nicht eingefärbt.

#### Scenario: Stufen
- **GIVEN** Zellen mit 1, 5 und 20 Flaschen
- **WHEN** die Heatmap an ist
- **THEN** ist die Zelle mit 20 stärker eingefärbt als die mit 5, diese stärker als die mit 1
- **AND** alle drei Werte bleiben lesbar

#### Scenario: Ausschalten
- **WHEN** ich die Heatmap ausschalte
- **THEN** erscheinen alle Zellen ohne Einfärbung, auch nach erneutem Öffnen der Seite

### Requirement: Vorlagen
Das Pivot SHALL eine Auswahl vorbereiteter Anordnungen je Liste anbieten, die mit einem Klick Zeilen, Spalten, Kennzahlen und Sortierung setzen. Keller: „Land × Weinart“, „Trinkfenster × Weinart“, „Jahrgang × Weinart“, „Winzer (Top 10)“; Archiv: „Jahr × Abgangsart“, „Weinart × Abgangsart“, „Bewertung × Weinart“; Regale: „Regal × Weinart“. Die Auswahl MUST die aktive Vorlage anzeigen und bei manueller Änderung der Felder „Eigene Anordnung“ anzeigen. „Winzer (Top 10)“ SHALL nur die zehn Winzer mit den meisten Flaschen zeigen.

#### Scenario: Trinkfenster
- **WHEN** ich im Keller die Vorlage „Trinkfenster × Weinart“ wähle
- **THEN** stehen „Trinkreif“, „Noch warten“, „Überschritten“ und „Ohne Angabe“ als Zeilen, die Weinarten als Spalten, mit Flaschen je Zelle

#### Scenario: Top 10
- **GIVEN** der Keller hat 14 Winzer
- **WHEN** ich „Winzer (Top 10)“ wähle
- **THEN** sehe ich die zehn Winzer mit den meisten Flaschen, absteigend sortiert

#### Scenario: Eigene Anordnung
- **GIVEN** die Vorlage „Land × Weinart“ ist aktiv
- **WHEN** ich „Region“ in die Zeilen ziehe
- **THEN** zeigt die Auswahl „Eigene Anordnung“

### Requirement: Anteil in Prozent
Der Benutzer SHALL je Kennzahl zwischen Absolutwert und „% der Gesamtsumme“ umschalten können. Die Prozentwerte MUST sich auf die Gesamtsumme der gefilterten Einträge beziehen und mit einer Nachkommastelle erscheinen; der CSV-Export MUST den angezeigten Modus verwenden.

#### Scenario: Anteil
- **GIVEN** 25 von 40 Flaschen sind Rotwein
- **WHEN** ich „% der Gesamtsumme“ für „Anzahl Flaschen“ wähle
- **THEN** zeigt die Summenzelle der Spalte „Rot“ 62,5 %

### Requirement: Diagramm zum Pivot
Das Pivot SHALL ein Balkendiagramm anbieten, das die sichtbaren Zeilen als Balken darstellt (Spalten als gestapelte Reihen, jede Kennzahl in einem eigenen Bereich) und ein- und ausblendbar ist; Standard: eingeblendet ab Tablet-Breite, ausgeblendet auf dem Handy; die Wahl wird gemerkt. Das Diagramm MUST dem Auf-/Zuklappen und Filtern des Pivots folgen und eine Textalternative für Screenreader bieten. Ein Antippen eines Balkens SHALL wie ein Antippen der Zelle aufschlüsseln.

#### Scenario: Diagramm folgt Pivot
- **GIVEN** das Diagramm zeigt Länder
- **WHEN** ich „Italien“ im Pivot aufklappe
- **THEN** zeigt das Diagramm zusätzlich die Regionen von Italien

#### Scenario: Handy
- **WHEN** ich das Pivot erstmals auf einem Gerät unter Tablet-Breite öffne
- **THEN** ist das Diagramm ausgeblendet und per Knopf einblendbar
