## ADDED Requirements

### Requirement: Spaltenfilter in der Tabelle
Die Tabellenansicht SHALL für jede Spalte einen Filter direkt in der Tabelle anbieten: eine Filterzeile unterhalb der Spaltenköpfe mit typgerechten Bedingungen (Text: enthält, beginnt mit, ist gleich; Zahl: gleich, größer, kleiner, zwischen; Datum: gleich, vor, nach, zwischen) sowie eine Werteliste im Spaltenkopf, die alle vorkommenden Werte mit Häufigkeit zeigt und Mehrfachauswahl erlaubt. Die Filterzeile MUST ein- und ausblendbar sein. Filter mehrerer Spalten SHALL mit „und“ verknüpft werden.

#### Scenario: Text enthält
- **GIVEN** die Kellertabelle zeigt Weine verschiedener Winzer
- **WHEN** ich in der Filterzeile der Spalte „Winzer“ „Antinori“ eingebe
- **THEN** zeigt die Tabelle nur Weine, deren Winzer „Antinori“ enthält

#### Scenario: Zahl zwischen
- **WHEN** ich in der Filterzeile der Spalte „Jahrgang“ die Bedingung „zwischen“ 2015 und 2019 wähle
- **THEN** zeigt die Tabelle nur Weine der Jahrgänge 2015 bis 2019

#### Scenario: Mehrfachauswahl in der Werteliste
- **GIVEN** der Keller enthält die Länder Italien (5), Spanien (3) und Frankreich (2)
- **WHEN** ich in der Werteliste der Spalte „Land“ „Italien“ und „Spanien“ auswähle
- **THEN** zeigt die Tabelle Weine aus Italien und aus Spanien
- **AND** die Werteliste zeigt neben jedem Wert die Anzahl

#### Scenario: Filterzeile auf dem Handy
- **GIVEN** ein Bildschirm mit 375 px Breite
- **THEN** ist die Filterzeile zunächst ausgeblendet und lässt sich über einen Knopf einblenden

### Requirement: Verschachtelte Filter
Das System SHALL einen Filter-Editor anbieten, in dem Bedingungen zu Gruppen zusammengefasst werden, die mit „und“, „oder“ oder „nicht“ verknüpft sind und beliebig tief ineinander verschachtelt werden können. Der aktive Filter MUST oberhalb der Liste als lesbarer Text angezeigt werden, sich ausschalten (ohne ihn zu verlieren), bearbeiten und löschen lassen. Der Editor MUST alle Spalten der jeweiligen Liste als Bedingungsfelder anbieten.

#### Scenario: Oder-Gruppe in und-Gruppe
- **GIVEN** der Keller enthält Rotweine aus Italien, Rotweine aus Spanien und Weißweine aus Italien
- **WHEN** ich im Filter-Editor „Weinart ist Rot“ **und** (Land ist Italien **oder** Land ist Spanien) anlege
- **THEN** zeigt die Liste die Rotweine aus Italien und aus Spanien, nicht die Weißweine
- **AND** der Filtertext zeigt die Bedingung mit der Klammerung

#### Scenario: Negation
- **WHEN** ich die Bedingung „nicht (Weinart ist Rot)“ anlege
- **THEN** zeigt die Liste alle Weine, die keine Rotweine sind

#### Scenario: Filter ausschalten
- **GIVEN** ein Filter ist aktiv
- **WHEN** ich ihn ausschalte
- **THEN** zeigt die Liste alle Einträge
- **AND** ich kann ihn wieder einschalten, ohne ihn neu aufzubauen

#### Scenario: Filter löschen
- **WHEN** ich den Filter lösche
- **THEN** ist er entfernt und der Filtertext verschwindet

### Requirement: Ein Filter für alle Ansichten
Der Filter einer Liste SHALL in den Ansichten Kacheln, Tabelle und Pivot gleichermaßen wirken; ein Filter, der in einer Ansicht gesetzt wurde, MUST nach dem Umschalten der Ansicht unverändert gelten. Der Filter MUST in der Adresse stehen, sodass er nach dem Öffnen einer Einzelansicht und Zurückkehren erhalten bleibt, und Adressen mit den früheren einfachen Filterparametern (z. B. Suche und Weinart im Keller) MUST weiter funktionieren.

#### Scenario: Filter bleibt beim Umschalten
- **GIVEN** ich habe in der Tabelle nach „Rot“ gefiltert
- **WHEN** ich auf „Pivot“ und dann auf „Kacheln“ umschalte
- **THEN** werden in beiden Ansichten nur Rotweine ausgewertet bzw. angezeigt

#### Scenario: Rückkehr aus der Einzelansicht
- **GIVEN** ich habe einen verschachtelten Filter gesetzt und öffne einen Wein
- **WHEN** ich zurück zur Liste gehe
- **THEN** sind Ansicht und Filter unverändert

#### Scenario: Alte Adresse
- **WHEN** ich die Adresse des Kellers mit `?q=Barolo&type=Red` öffne
- **THEN** ist die Suche „Barolo“ und die Weinart „Rot“ als Filter gesetzt

### Requirement: Verschachtelte Pivotfelder
Die Pivotansicht SHALL mehrere Felder im Zeilenbereich und im Spaltenbereich in wählbarer Reihenfolge verschachteln können (z. B. Zeilen: Land, dann Region; Spalten: Weinart, dann Jahrgang). Jede Ebene MUST einzeln auf- und zuklappbar sein, zusätzlich alle Ebenen gemeinsam. Auf jeder Ebene SHALL eine Zwischensumme angezeigt werden, die sich ausblenden lässt; eine Gesamtsumme in Zeile und Spalte bleibt erhalten. Die Felder MUST über eine Feldauswahl per Drag-and-drop (oder per Tastatur-Alternative) zwischen Zeilen-, Spalten-, Filter- und Kennzahlbereich verschoben werden können. Mehrere Kennzahlen DÜRFEN gleichzeitig angezeigt werden. Einträge ohne Wert eines Feldes MUST auf jeder Ebene unter „Ohne Angabe“ zuletzt erscheinen.

#### Scenario: Land und Region verschachtelt
- **GIVEN** 5 Flaschen aus „Italien“, davon 4 aus „Toskana“ und 1 ohne Region, und 3 Flaschen aus „Spanien“ ohne Region
- **WHEN** ich im Keller-Pivot die Zeilenfelder „Land“ und „Region“ und die Kennzahl „Flaschen“ wähle
- **THEN** zeigt die Zeile „Italien“ die Zwischensumme 5, aufgeklappt „Toskana“ 4 und „Ohne Angabe“ 1
- **AND** „Spanien“ zeigt 3
- **AND** die Gesamtsumme ist 8

#### Scenario: Ebene zuklappen
- **GIVEN** das Pivot zeigt „Italien“ aufgeklappt mit seinen Regionen
- **WHEN** ich „Italien“ zuklappe
- **THEN** sehe ich nur noch die Zeile „Italien“ mit ihrer Zwischensumme

#### Scenario: Feld verschieben
- **WHEN** ich in der Feldauswahl das Feld „Weinart“ vom Zeilen- in den Spaltenbereich ziehe
- **THEN** erscheint „Weinart“ als Spaltenebene und das Pivot wird neu berechnet

#### Scenario: Zwei Kennzahlen
- **WHEN** ich die Kennzahlen „Flaschen“ und „Summe Kaufpreis“ gemeinsam wähle
- **THEN** zeigt jede Zelle beide Werte

#### Scenario: Archiv nach Datum gruppiert
- **GIVEN** das Archiv enthält Einträge aus mehreren Jahren
- **WHEN** ich im Archiv-Pivot das Feld „Datum“ als Zeilenfeld wähle
- **THEN** ist es nach Jahr, Quartal und Monat gruppiert und ebenenweise auf- und zuklappbar

### Requirement: Anordnung merken
Die Anordnung des Pivots (Felder, Bereiche, Reihenfolge, Kennzahlen, aufgeklappte Ebenen) und die Spaltenauswahl samt Sortierung der Tabelle SHALL je Liste auf dem Gerät gemerkt werden. Eine Aktion „Zurücksetzen“ MUST die jeweilige Anordnung auf die Vorgabe zurückstellen. Vorgaben: Keller Weinart × Land mit Flaschen, Archiv Jahr × Abgangsart mit Flaschen, Regale Regal × Weinart mit Flaschen.

#### Scenario: Anordnung bleibt
- **GIVEN** ich habe im Keller-Pivot „Land“ und „Region“ in die Zeilen gelegt
- **WHEN** ich die Seite später erneut öffne
- **THEN** ist dieselbe Anordnung aktiv

#### Scenario: Zurücksetzen
- **WHEN** ich im Pivot „Zurücksetzen“ wähle
- **THEN** zeigt es wieder die Vorgabe Weinart × Land mit Flaschen

### Requirement: Aufschlüsseln über mehrere Ebenen
Das Antippen einer Pivotzelle oder -summe auf beliebiger Ebene SHALL in die Tabelle wechseln, gefiltert auf alle Zeilen- und Spaltenwerte der Zelle (bei Summen nur auf die vorhandenen Ebenen), mit „und“ verknüpft mit dem bereits bestehenden Filter. Bei zeitlich gruppierten Feldern MUST der Filter den entsprechenden Zeitraum abbilden. Eine Zurück-Aktion MUST zum Pivot mit unveränderter Anordnung führen.

#### Scenario: Zelle auf der untersten Ebene
- **GIVEN** das Pivot zeigt Zeilen „Land“ → „Region“ und Spalten „Weinart“
- **WHEN** ich auf die Zelle „Italien“ → „Toskana“ × „Rot“ tippe
- **THEN** zeigt die Tabelle Weine mit Land „Italien“, Region „Toskana“ und Weinart „Rot“

#### Scenario: Zwischensumme
- **WHEN** ich auf die Zwischensumme von „Italien“ tippe
- **THEN** zeigt die Tabelle alle Weine mit Land „Italien“, unabhängig von der Region

#### Scenario: Zeitraum
- **GIVEN** das Archiv-Pivot gruppiert nach Jahr → Monat
- **WHEN** ich auf die Zelle „2026“ → „März“ tippe
- **THEN** zeigt die Tabelle Einträge vom 01.03.2026 bis 31.03.2026

#### Scenario: Zurück
- **WHEN** ich nach dem Aufschlüsseln „Zurück“ wähle
- **THEN** sehe ich das Pivot mit derselben Anordnung

### Requirement: Mehrfachzuordnung von Rebsorten
Wird das Feld „Rebsorte“ im Pivot verwendet, SHALL eine Flasche eines Weins mit mehreren Rebsorten bei jeder seiner Rebsorten gezählt werden. Die Summen DÜRFEN dann die tatsächliche Flaschenzahl übersteigen; das Pivot MUST in diesem Fall einen Hinweis darauf zeigen. Ohne das Feld „Rebsorte“ MUST jede Flasche genau einmal gezählt werden.

#### Scenario: Cuvée
- **GIVEN** ein Cuvée aus „Merlot“ und „Cabernet Sauvignon“ mit 6 Flaschen
- **WHEN** ich nach Rebsorte gruppiere
- **THEN** zählen die 6 Flaschen bei beiden Rebsorten
- **AND** ein Hinweis erklärt, dass Summen mehrfach zugeordnete Flaschen mehrfach zählen

#### Scenario: Ohne Rebsorte
- **WHEN** ich nach Land gruppiere
- **THEN** zählt jede Flasche genau einmal und die Gesamtsumme entspricht der Flaschenzahl im Keller

### Requirement: Einheitliche Bedienung und Darstellung
Tabelle, Filter und Pivot SHALL einheitlich gestaltet sein, deutsche Beschriftungen, Zahlen- und Datumsformate verwenden und dem hellen oder dunklen Design des Geräts folgen. Alle Bedienelemente (Ansichtsumschalter, Spaltenköpfe, Filterzeile, Filter-Editor, Feldauswahl, Pivotzellen) MUST per Tastatur erreichbar sein und eine zugängliche Bezeichnung tragen. Die Kachelansicht und der Start der App DÜRFEN durch die Tabellen- und Pivotkomponenten nicht langsamer werden: diese MÜSSEN erst beim Wechsel in die jeweilige Ansicht geladen werden. Die Anforderungen aus `list-table-pivot-views` (Ansichten umschalten, Spalten wählen, Regale in Tabelle und Pivot, CSV-Export, kleine Bildschirme) MUST weiterhin erfüllt sein.

#### Scenario: Dunkles Design
- **GIVEN** das Gerät verwendet das dunkle Design
- **WHEN** ich Tabelle, Filter-Editor und Pivot öffne
- **THEN** sind alle ausreichend lesbar und stimmig zum Rest der App

#### Scenario: Tastaturbedienung
- **WHEN** ich nur die Tastatur benutze
- **THEN** kann ich den Ansichtsumschalter, eine Spaltenfilter-Werteliste, den Filter-Editor und eine Pivotzelle erreichen und auslösen

#### Scenario: Nachladen
- **GIVEN** ich öffne den Keller in der Kachelansicht
- **THEN** werden die Tabellen- und Pivotkomponenten erst geladen, wenn ich in die Tabelle oder das Pivot wechsle

#### Scenario: CSV bleibt
- **GIVEN** die Tabelle ist mit einem verschachtelten Filter gefiltert
- **WHEN** ich „Als CSV exportieren“ wähle
- **THEN** enthält die Datei genau die gefilterten, sichtbaren Zeilen und Spalten in angezeigter Reihenfolge
