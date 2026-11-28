## Purpose

Die Statistikansicht gibt einen ruhigen Überblick über Keller und Archiv: Kennzahlen, was in welchem Regal liegt (Weinarten, Regionen, geschätzter Wert) und die Aufteilung der Flaschen – ohne Diagramme und ohne Konfiguration.

## ADDED Requirements

### Requirement: Statistik als Ansicht
Das System SHALL in den Listen Keller und Archiv die Ansicht „Statistik“ anbieten, erreichbar über den Umschalter „Kacheln“, „Tabelle“, „Statistik“. Die Statistik MUST die Filter der Liste auswerten und darf keine Diagramme enthalten. Eine auf dem Gerät gemerkte frühere Ansicht „Pivot“ SHALL als „Statistik“ geöffnet werden.

#### Scenario: Statistik öffnen
- **GIVEN** ich sehe den Keller als Kacheln
- **WHEN** ich „Statistik“ wähle
- **THEN** sehe ich Kennzahlen, Regale und Aufteilungen meines Kellers
- **AND** beim nächsten Öffnen des Kellers ist die Statistik wieder aktiv

#### Scenario: Statistik folgt den Filtern
- **GIVEN** der Keller enthält Rot- und Weißweine
- **WHEN** ich die Weinart „Rot“ filtere und die Statistik öffne
- **THEN** zählen nur Rotweine in Kennzahlen, Regalen und Aufteilungen

#### Scenario: Frühere Pivot-Ansicht
- **GIVEN** auf meinem Gerät war für den Keller „Pivot“ gemerkt
- **WHEN** ich den Keller öffne
- **THEN** ist die Ansicht „Statistik“ aktiv

#### Scenario: Keine Treffer
- **WHEN** die Filter keinen Wein übrig lassen
- **THEN** sehe ich in der Statistik den Hinweis „Keine passenden Einträge“ mit der Aktion „Filter zurücksetzen“

### Requirement: Kennzahlen des Kellers
Die Keller-Statistik SHALL oben Kennzahlkacheln zeigen: Anzahl Flaschen, Anzahl Weine und geschätzten Wert. Der geschätzte Wert ist die Summe aus Flaschenanzahl × Einkaufspreis; Weine ohne Einkaufspreis MUST unberücksichtigt bleiben, und ihre Anzahl SHALL als Hinweis genannt werden.

#### Scenario: Kennzahlen berechnen
- **GIVEN** 6 Flaschen „Zweigelt“ zu 12,00 €, 2 Flaschen „Sassicaia“ zu 250,00 € und 3 Flaschen „Hauswein“ ohne Preis
- **WHEN** ich die Statistik öffne
- **THEN** sehe ich 11 Flaschen, 3 Weine und einen geschätzten Wert von 572,00 €
- **AND** den Hinweis, dass 1 Wein ohne Einkaufspreis nicht eingerechnet ist

### Requirement: Inhalt der Regale
Die Keller-Statistik SHALL je Regal eine Karte zeigen mit Regalname, Anzahl Flaschen im Regal, den Weinarten mit Flaschenzahl, den Regionen mit Flaschenzahl und dem geschätzten Wert der Flaschen des Regals. Flaschen ohne Regalfach MUST in einer Karte „Ohne Fach“ zusammengefasst werden; Flaschen ohne Region zählen unter „Ohne Region“. Regale ohne Flaschen (nach Filter) erscheinen nicht. Die Karten sind nach Flaschenzahl absteigend sortiert, „Ohne Fach“ zuletzt.

#### Scenario: Regal mit Inhalt
- **GIVEN** Regal „Keller links“ enthält 3 Flaschen Rot aus „Toskana“ (je 20,00 €) und 1 Flasche Weiß aus „Wachau“ (30,00 €)
- **WHEN** ich die Statistik öffne
- **THEN** zeigt die Karte „Keller links“ 4 Flaschen, Rot 3 und Weiß 1, Toskana 3 und Wachau 1 sowie 90,00 €

#### Scenario: Wein in zwei Regalen
- **GIVEN** ein Wein mit 4 Flaschen, 3 in Regal A und 1 in Regal B
- **WHEN** ich die Statistik öffne
- **THEN** zählt Regal A 3 und Regal B 1 Flasche dieses Weins, und die Gesamtzahl bleibt 4

#### Scenario: Flaschen ohne Fach
- **GIVEN** 2 Flaschen liegen in keinem Regalfach
- **WHEN** ich die Statistik öffne
- **THEN** zeigt die letzte Karte „Ohne Fach“ 2 Flaschen

#### Scenario: Regal öffnen
- **WHEN** ich auf die Karte „Keller links“ tippe
- **THEN** sehe ich die Kellertabelle gefiltert auf dieses Regal
- **AND** eine Aktion „Zurück zur Statistik“ führt zur Statistik mit unverändertem Filter

### Requirement: Aufteilungen des Kellers
Die Keller-Statistik SHALL die Flaschen als einfache Listen aufteilen nach Weinart, nach Land (mit den Regionen des Landes darunter) und nach Trinkfenster-Status (trinkreif, noch warten, überschritten, ohne Angabe). Jede Zeile MUST Bezeichnung, Flaschenzahl, Anteil in Prozent (ganzzahlig gerundet) und geschätzten Wert zeigen.

#### Scenario: Aufteilung nach Land und Region
- **GIVEN** 6 Flaschen aus Italien (4 Toskana, 2 Piemont) und 4 Flaschen aus Spanien
- **WHEN** ich die Statistik öffne
- **THEN** zeigt „Italien“ 6 Flaschen (60 %), darunter „Toskana“ 4 und „Piemont“ 2, und „Spanien“ 4 (40 %)

#### Scenario: Mehrere Rebsorten
- **GIVEN** ein Cuvée mit 6 Flaschen aus zwei Rebsorten
- **WHEN** ich die Statistik öffne
- **THEN** zählen die 6 Flaschen in jeder Aufteilung genau einmal

#### Scenario: Ohne Angabe
- **GIVEN** 2 Flaschen haben kein Land
- **WHEN** ich die Statistik öffne
- **THEN** erscheint in der Aufteilung nach Land als letzte Zeile „Ohne Angabe“ mit 2 Flaschen

### Requirement: Reihenfolge und Aufschlüsseln der Aufteilungen
Zeilen der Aufteilungen SHALL nach Flaschenzahl absteigend, bei Gleichstand alphabetisch sortiert sein; „Ohne Angabe“ steht zuletzt. Das Antippen einer Zeile MUST die Kellertabelle mit entsprechenden Filtern öffnen.

#### Scenario: Sortierung
- **GIVEN** je 3 Flaschen aus „Spanien“ und „Italien“, 5 aus „Frankreich“ und 2 ohne Land
- **WHEN** ich die Statistik öffne
- **THEN** stehen die Länder in der Reihenfolge Frankreich, Italien, Spanien, Ohne Angabe

#### Scenario: Zeile öffnen
- **WHEN** ich in der Aufteilung nach Land auf „Toskana“ unter „Italien“ tippe
- **THEN** sehe ich die Kellertabelle gefiltert auf Land „Italien“ und Region „Toskana“

### Requirement: Statistik des Archivs
Die Archiv-Statistik SHALL Kennzahlkacheln (Anzahl Flaschen, Anzahl Einträge, Durchschnittsbewertung, Summe Preis) und Aufteilungen nach Jahr, Abgangsart, Weinart und Bewertung zeigen. Jede Zeile MUST Bezeichnung, Flaschenzahl und Anteil in Prozent zeigen; Jahre sind absteigend, die übrigen Aufteilungen nach Flaschenzahl absteigend sortiert. Einträge ohne Bewertung dürfen die Durchschnittsbewertung nicht beeinflussen.

#### Scenario: Durchschnittsbewertung
- **GIVEN** zwei getrunkene Einträge mit Bewertung 4 und 5 und einer ohne Bewertung
- **WHEN** ich die Archiv-Statistik öffne
- **THEN** zeigt die Kachel „Ø Bewertung“ 4,5

#### Scenario: Aufteilung nach Jahr
- **GIVEN** das Archiv enthält 5 Flaschen aus 2025 und 3 Flaschen aus 2026
- **WHEN** ich die Archiv-Statistik öffne
- **THEN** steht „2026“ mit 3 Flaschen (38 %) vor „2025“ mit 5 Flaschen (63 %)

### Requirement: Archivzeile aufschlüsseln
Das Antippen einer Zeile der Archiv-Statistik SHALL die Archivtabelle mit entsprechenden Filtern öffnen; „Zurück zur Statistik“ MUST zur Statistik mit unverändertem Filter führen.

#### Scenario: Jahr öffnen
- **WHEN** ich in der Archiv-Statistik auf „2026“ tippe
- **THEN** sehe ich die Archivtabelle gefiltert auf den Zeitraum 01.01.2026 bis 31.12.2026

### Requirement: Lesbarkeit und Bedienung
Die Statistik MUST auf schmalen Bildschirmen ohne seitliches Scrollen lesbar sein (Karten und Listen umbrechen), Hell- und Dunkelmodus unterstützen und per Tastatur bedienbar sein. Antippbare Karten und Zeilen MUST eine zugängliche Bezeichnung tragen.

#### Scenario: Schmaler Bildschirm
- **GIVEN** ein Bildschirm mit 375 px Breite
- **WHEN** ich die Keller-Statistik öffne
- **THEN** stehen die Regalkarten untereinander und nichts erfordert seitliches Scrollen

#### Scenario: Tastaturbedienung
- **WHEN** ich mit der Tabulatortaste zu einer Regalkarte gehe und die Eingabetaste drücke
- **THEN** öffnet sich die Kellertabelle gefiltert auf dieses Regal
