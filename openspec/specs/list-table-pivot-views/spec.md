# list-table-pivot-views Specification

## Purpose

TBD - created by archiving change add-table-pivot-views. Update Purpose after archive.

## Requirements

### Requirement: Ansichten umschalten
Das System SHALL in den Listen Keller, Archiv und Regale einen Umschalter mit den Ansichten „Kacheln“, „Tabelle“ und „Pivot“ anbieten. Die Kachelansicht MUST unverändert bleiben und Standard sein. Die zuletzt gewählte Ansicht SHALL je Liste auf dem Gerät gemerkt und beim nächsten Öffnen wiederhergestellt werden.

#### Scenario: Auf Tabelle umstellen
- **GIVEN** ich sehe den Keller als Kacheln
- **WHEN** ich „Tabelle“ wähle
- **THEN** sehe ich dieselben Weine als Tabelle
- **AND** beim nächsten Öffnen des Kellers ist wieder die Tabelle aktiv

#### Scenario: Ansichten sind je Liste getrennt
- **GIVEN** ich habe im Keller „Pivot“ gewählt
- **WHEN** ich das Archiv zum ersten Mal öffne
- **THEN** sehe ich das Archiv als Kacheln

### Requirement: Tabellenansicht mit Sortierung
Die Tabellenansicht SHALL die Einträge der Liste zeilenweise mit Spalten zeigen. Der Keller MUST die Spalten Name, Winzer, Jahrgang, Art, Land, Region, Rebsorten, Flaschen, Trinkfenster und Preis anbieten, das Archiv Datum, Wein, Winzer, Jahrgang, Art, Abgangsart, Anzahl, Bewertung, Preis und Gegenpartei, die Regale Name, Reihen, Spalten, Kapazität, belegt und frei. Ein Antippen des Spaltenkopfs SHALL aufsteigend, ein weiteres Antippen absteigend sortieren; Zahlen und Daten werden numerisch bzw. chronologisch, Texte ohne Beachtung von Groß-/Kleinschreibung sortiert, leere Werte stehen immer am Ende. Ein Antippen einer Zeile SHALL zur selben Einzelansicht führen wie die Kachel.

#### Scenario: Nach Jahrgang sortieren
- **GIVEN** der Keller enthält Weine der Jahrgänge 2018, 2021 und ohne Jahrgang
- **WHEN** ich in der Tabelle auf „Jahrgang“ tippe
- **THEN** stehen die Zeilen in der Reihenfolge 2018, 2021, ohne Jahrgang
- **AND** nach erneutem Tippen in der Reihenfolge 2021, 2018, ohne Jahrgang

#### Scenario: Zeile öffnet Einzelansicht
- **WHEN** ich in der Kellertabelle auf die Zeile „Sassicaia“ tippe
- **THEN** öffnet sich die Einzelansicht dieses Weins

#### Scenario: Sortierung für Screenreader
- **WHEN** eine Spalte sortiert ist
- **THEN** trägt ihr Kopf die Sortierrichtung als zugängliche Eigenschaft

### Requirement: Spalten wählen
Der Benutzer SHALL in der Tabellenansicht Spalten ein- und ausblenden können. Die Auswahl MUST je Liste auf dem Gerät gemerkt werden. Mindestens die Spalte mit dem Namen des Eintrags MUST sichtbar bleiben.

#### Scenario: Spalte ausblenden
- **WHEN** ich in der Kellertabelle die Spalte „Region“ ausblende
- **THEN** wird sie nicht mehr angezeigt, auch nicht nach erneutem Öffnen der Seite

### Requirement: Filter in allen Ansichten
Das System SHALL für jede Liste Filter anbieten, die in Kacheln, Tabelle und Pivot gleichermaßen wirken. Keller: Suche (Name, Weingut, Region, Rebsorte), Weinart, Land, Region, Rebsorte, Jahrgang von/bis, Trinkfenster-Status (trinkreif, noch warten, überschritten, ohne Angabe) und Regal-Platzierung (in Regal, ohne Fach). Archiv: Abgangsart, Weinart, Zeitraum von/bis, Bewertung ab. Regale: Name und Belegung (leer, teilbelegt, voll). Mehrere Filter MUST mit „und“ verknüpft werden; Mehrfachauswahl innerhalb eines Filters mit „oder“. Aktive Filter SHALL sichtbar sein und einzeln sowie gesammelt zurückgesetzt werden können. Die Filter MUST in der Adresse stehen, sodass sie nach dem Öffnen einer Einzelansicht und Zurückkehren erhalten bleiben.

#### Scenario: Filter kombinieren
- **GIVEN** der Keller enthält Rotweine aus Italien, Weißweine aus Italien und Rotweine aus Spanien
- **WHEN** ich die Weinart „Rot“ und das Land „Italien“ wähle
- **THEN** zeigen alle drei Ansichten nur die Rotweine aus Italien

#### Scenario: Filter bleiben nach Rückkehr
- **GIVEN** ich habe in der Tabelle nach „Toskana“ gefiltert und öffne einen Wein
- **WHEN** ich zurück zur Liste gehe
- **THEN** sind Ansicht und Filter unverändert

#### Scenario: Keine Treffer
- **WHEN** die Filter keinen Eintrag übrig lassen
- **THEN** sehe ich den Hinweis „Keine passenden Einträge“ mit der Aktion „Filter zurücksetzen“

#### Scenario: Archiv nach Zeitraum
- **GIVEN** das Archiv enthält Einträge aus 2025 und 2026
- **WHEN** ich den Zeitraum 01.01.2026 bis 31.12.2026 wähle
- **THEN** sehe ich nur Einträge aus 2026

### Requirement: Pivotansicht
Die Pivotansicht SHALL eine Kreuztabelle aus einer wählbaren Zeilendimension und einer wählbaren Spaltendimension (oder „keine“) mit einer wählbaren Kennzahl zeigen und die bereits gefilterten Einträge auswerten. Dimensionen im Keller: Weinart, Land, Region, Rebsorte, Winzer, Jahrgang, Trinkfenster-Status, Regal; im Archiv: Weinart, Abgangsart, Winzer, Jahrgang, Jahr, Monat, Bewertung; bei den Regalen: Regal gegen Weinart oder Belegung. Kennzahlen im Keller: Anzahl Flaschen, Anzahl Weine, Summe Kaufpreis; im Archiv: Anzahl Flaschen, Anzahl Einträge, Summe Preis, Durchschnittsbewertung; bei den Regalen: Anzahl Flaschen bzw. Fächer. Das Pivot MUST eine Summenzeile und eine Summenspalte enthalten. Einträge ohne Wert in einer Dimension MUST unter „Ohne Angabe“ als letzte Zeile bzw. Spalte erscheinen. Vorgaben SHALL sein: Keller Weinart × Land mit Flaschen, Archiv Jahr × Abgangsart mit Flaschen, Regale Regal × Weinart mit Flaschen.

#### Scenario: Flaschen je Land und Weinart
- **GIVEN** 3 Flaschen Rotwein aus Italien, 2 Flaschen Weißwein aus Italien und 4 Flaschen Rotwein aus Spanien
- **WHEN** ich im Keller das Pivot mit Zeilen „Land“, Spalten „Weinart“ und Kennzahl „Flaschen“ öffne
- **THEN** zeigt „Italien“ 3 bei Rot und 2 bei Weiß mit Summe 5, „Spanien“ 4 bei Rot mit Summe 4
- **AND** die Summenzeile zeigt Rot 7, Weiß 2 und gesamt 9

#### Scenario: Ohne Angabe
- **GIVEN** 2 Flaschen haben kein Land
- **WHEN** ich nach Land gruppiere
- **THEN** erscheint als letzte Zeile „Ohne Angabe“ mit 2 Flaschen

#### Scenario: Durchschnittsbewertung im Archiv
- **GIVEN** das Archiv hat zwei getrunkene Einträge mit Bewertung 4 und 5 sowie einen ohne Bewertung
- **WHEN** ich die Kennzahl „Durchschnittsbewertung“ wähle
- **THEN** zeigt die Zelle 4,5, wobei Einträge ohne Bewertung nicht mitzählen

#### Scenario: Pivot folgt den Filtern
- **WHEN** ich im Pivot die Weinart „Rot“ filtere
- **THEN** werden nur Rotweine ausgewertet

#### Scenario: Mehrere Rebsorten je Wein
- **GIVEN** ein Cuvée aus „Merlot“ und „Cabernet Sauvignon“ mit 6 Flaschen
- **WHEN** ich nach Rebsorte gruppiere
- **THEN** zählen die 6 Flaschen bei beiden Rebsorten
- **AND** die Summe zählt sie nur einmal, und ein Hinweis erklärt das

### Requirement: Pivotzelle aufschlüsseln
Das Antippen einer Pivotzelle, einer Zeilen- oder Spaltensumme SHALL die zugehörigen Einträge als Tabelle zeigen, das heißt in die Tabellenansicht mit entsprechend gesetzten Filtern wechseln. Eine Zurück-Aktion MUST zum Pivot mit unveränderter Konfiguration führen.

#### Scenario: Zelle öffnen
- **GIVEN** das Pivot zeigt „Italien“ × „Rot“ mit 3 Flaschen
- **WHEN** ich auf diese Zelle tippe
- **THEN** sehe ich die Kellertabelle gefiltert auf Land „Italien“ und Weinart „Rot“

### Requirement: Regale in Tabelle und Pivot
Die Regaltabelle SHALL je Regal Name, Reihen, Spalten, Kapazität, belegte und freie Fächer zeigen. Das Pivot „Regal × Weinart“ SHALL die Flaschen jedes Regals nach Weinart aufschlüsseln; die Belegung der Regale MUST dafür bei Bedarf nachgeladen werden, wobei ein Ladehinweis erscheint und Fehler mit „Erneut laden“ angeboten werden.

#### Scenario: Flaschen je Regal und Weinart
- **GIVEN** Regal „Keller links“ enthält 3 Rotweine und 1 Weißwein, Regal „Keller rechts“ 2 Rotweine
- **WHEN** ich bei den Regalen das Pivot „Regal × Weinart“ öffne
- **THEN** zeigt „Keller links“ Rot 3 und Weiß 1, „Keller rechts“ Rot 2

#### Scenario: Regal ohne Flaschen
- **GIVEN** ein Regal enthält keine Flasche
- **WHEN** ich das Pivot „Regal × Weinart“ öffne
- **THEN** erscheint das Regal mit Summe 0

### Requirement: CSV-Export
Das System SHALL die aktuell gefilterte und sortierte Tabelle sowie das Pivot als CSV-Datei exportieren können. Die Datei MUST UTF-8 mit Kennzeichen (BOM) und Semikolon als Trenner verwenden, die sichtbaren Spalten in angezeigter Reihenfolge enthalten und Zellen, die mit `=`, `+`, `-` oder `@` beginnen, so entschärfen, dass sie in Tabellenkalkulationen nicht als Formel ausgeführt werden.

#### Scenario: Gefilterte Tabelle exportieren
- **GIVEN** die Kellertabelle ist auf „Rot“ gefiltert und zeigt 12 Zeilen
- **WHEN** ich „Als CSV exportieren“ wähle
- **THEN** enthält die Datei eine Kopfzeile und genau diese 12 Zeilen

#### Scenario: Formelzeichen
- **GIVEN** ein Weinname beginnt mit „=SUMME(A1)“
- **WHEN** ich exportiere
- **THEN** steht der Name in der Datei als Text und nicht als Formel

### Requirement: Kleine Bildschirme und Bedienung
Tabelle und Pivot MUST auf schmalen Bildschirmen horizontal scrollbar sein, wobei die erste Spalte sichtbar bleibt. Alle Bedienelemente (Umschalter, Spaltenköpfe, Filter, Pivotzellen) MUST per Tastatur erreichbar sein und eine zugängliche Bezeichnung haben.

#### Scenario: Schmaler Bildschirm
- **GIVEN** ein Bildschirm mit 375 px Breite
- **WHEN** ich die Kellertabelle öffne
- **THEN** kann ich seitlich scrollen und der Weinname bleibt dabei sichtbar
