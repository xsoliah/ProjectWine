## MODIFIED Requirements

### Requirement: Ansichten umschalten
Das System SHALL in den Listen Keller und Archiv einen Umschalter mit den Ansichten „Kacheln“, „Tabelle“ und „Statistik“ anbieten, in den Regalen mit „Kacheln“ und „Tabelle“. Die Kachelansicht MUST unverändert bleiben und Standard sein. Die zuletzt gewählte Ansicht SHALL je Liste auf dem Gerät gemerkt und beim nächsten Öffnen wiederhergestellt werden. Eine gemerkte frühere Ansicht „Pivot“ MUST in Keller und Archiv als „Statistik“, bei den Regalen als „Kacheln“ geöffnet werden.

#### Scenario: Auf Tabelle umstellen
- **GIVEN** ich sehe den Keller als Kacheln
- **WHEN** ich „Tabelle“ wähle
- **THEN** sehe ich dieselben Weine als Tabelle
- **AND** beim nächsten Öffnen des Kellers ist wieder die Tabelle aktiv

#### Scenario: Ansichten sind je Liste getrennt
- **GIVEN** ich habe im Keller „Statistik“ gewählt
- **WHEN** ich das Archiv zum ersten Mal öffne
- **THEN** sehe ich das Archiv als Kacheln

#### Scenario: Regale ohne Statistik
- **WHEN** ich die Regale öffne
- **THEN** bietet der Umschalter nur „Kacheln“ und „Tabelle“ an

#### Scenario: Gemerkte Pivot-Ansicht der Regale
- **GIVEN** auf meinem Gerät war für die Regale „Pivot“ gemerkt
- **WHEN** ich die Regale öffne
- **THEN** sehe ich die Regale als Kacheln

### Requirement: Filter in allen Ansichten
Das System SHALL für jede Liste Filter anbieten, die in Kacheln, Tabelle und Statistik gleichermaßen wirken. Keller: Suche (Name, Weingut, Region, Rebsorte), Weinart, Land, Region, Rebsorte, Jahrgang von/bis, Trinkfenster-Status (trinkreif, noch warten, überschritten, ohne Angabe) und Regal-Platzierung (in Regal, ohne Fach). Archiv: Abgangsart, Weinart, Zeitraum von/bis, Bewertung ab. Regale: Name und Belegung (leer, teilbelegt, voll). Mehrere Filter MUST mit „und“ verknüpft werden; Mehrfachauswahl innerhalb eines Filters mit „oder“. Aktive Filter SHALL sichtbar sein und einzeln sowie gesammelt zurückgesetzt werden können. Die Filter MUST in der Adresse stehen, sodass sie nach dem Öffnen einer Einzelansicht und Zurückkehren erhalten bleiben.

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

### Requirement: CSV-Export
Das System SHALL die aktuell gefilterte und sortierte Tabelle als CSV-Datei exportieren können. Die Datei MUST UTF-8 mit Kennzeichen (BOM) und Semikolon als Trenner verwenden, die sichtbaren Spalten in angezeigter Reihenfolge enthalten und Zellen, die mit `=`, `+`, `-` oder `@` beginnen, so entschärfen, dass sie in Tabellenkalkulationen nicht als Formel ausgeführt werden. Die Statistik wird nicht exportiert.

#### Scenario: Gefilterte Tabelle exportieren
- **GIVEN** die Kellertabelle ist auf „Rot“ gefiltert und zeigt 12 Zeilen
- **WHEN** ich „Als CSV exportieren“ wähle
- **THEN** enthält die Datei eine Kopfzeile und genau diese 12 Zeilen

#### Scenario: Formelzeichen
- **GIVEN** ein Weinname beginnt mit „=SUMME(A1)“
- **WHEN** ich exportiere
- **THEN** steht der Name in der Datei als Text und nicht als Formel

### Requirement: Kleine Bildschirme und Bedienung
Die Tabelle MUST auf schmalen Bildschirmen horizontal scrollbar sein, wobei die erste Spalte sichtbar bleibt. Alle Bedienelemente (Umschalter, Spaltenköpfe, Filter, Statistikkarten und -zeilen) MUST per Tastatur erreichbar sein und eine zugängliche Bezeichnung haben.

#### Scenario: Schmaler Bildschirm
- **GIVEN** ein Bildschirm mit 375 px Breite
- **WHEN** ich die Kellertabelle öffne
- **THEN** kann ich seitlich scrollen und der Weinname bleibt dabei sichtbar

## ADDED Requirements

### Requirement: Regaltabelle
Die Regaltabelle SHALL je Regal Name, Reihen, Spalten, Kapazität, belegte und freie Fächer zeigen; die Spalten Weinarten und Weine sind optional und werden bei Bedarf nachgeladen, wobei ein Ladehinweis erscheint und Fehler mit „Erneut laden“ angeboten werden.

#### Scenario: Belegung in der Regaltabelle
- **GIVEN** Regal „Keller links“ hat 12 Fächer, davon 4 belegt
- **WHEN** ich bei den Regalen die Tabelle öffne
- **THEN** zeigt die Zeile „Keller links“ Kapazität 12, belegt 4 und frei 8

## REMOVED Requirements

### Requirement: Pivotansicht
**Reason**: Die Kreuztabelle mit Diagramm wirkt überladen; sie wird durch die Ansicht „Statistik“ ersetzt (Capability `list-statistics`).
**Migration**: Statt Dimensionen und Kennzahlen zu wählen, bietet die Statistik feste Aufteilungen mit Flaschen, Anteil und Wert; eine gemerkte Ansicht „Pivot“ öffnet als „Statistik“.

### Requirement: Pivotzelle aufschlüsseln
**Reason**: Ohne Pivot gibt es keine Pivotzellen.
**Migration**: Karten und Zeilen der Statistik öffnen die Tabelle mit passenden Filtern und „Zurück zur Statistik“ (siehe `list-statistics`).

### Requirement: Regale in Tabelle und Pivot
**Reason**: Das Pivot „Regal × Weinart“ entfällt; die Inhalte der Regale zeigt die Keller-Statistik. Die Regaltabelle bleibt als eigene Anforderung „Regaltabelle“ erhalten.
**Migration**: Regalinhalt nach Weinart, Region und Wert: Keller › Statistik › Regale.
