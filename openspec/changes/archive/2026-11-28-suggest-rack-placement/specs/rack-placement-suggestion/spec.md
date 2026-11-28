## ADDED Requirements

### Requirement: Einlagern nach dem Hinzufügen
Das System SHALL nach dem Anlegen eines Weins und nach dem Hinzufügen von Flaschen zu einem vorhandenen Wein den Schritt „Einlagern“ anbieten, wenn der Benutzer mindestens ein Regal mit mindestens einem freien Fach hat. Der Schritt MUST sich auf die gerade hinzugekommenen Flaschen beziehen. Der Benutzer MUST ihn überspringen können („Später“); die Flaschen bleiben dann nicht eingelagert.

#### Scenario: Wein anlegen und einlagern
- **GIVEN** ich habe ein Regal mit freien Fächern
- **WHEN** ich einen Wein mit 3 Flaschen anlege
- **THEN** werde ich gefragt, ob ich die 3 Flaschen einlagern möchte
- **AND** mir wird ein Vorschlag für 3 Fächer gezeigt

#### Scenario: Flaschen zu vorhandenem Wein hinzufügen
- **GIVEN** von „Chianti“ liegen 2 Flaschen im Keller, beide eingelagert
- **WHEN** ich 1 weitere Flasche „Chianti“ hinzufüge
- **THEN** bietet die App an, genau diese 1 Flasche einzulagern

#### Scenario: Später
- **WHEN** ich im Schritt „Einlagern“ „Später“ wähle
- **THEN** ist der Wein im Keller und seine Flaschen sind nicht eingelagert
- **AND** ich lande auf der Weinseite

#### Scenario: Kein Regal oder alles voll
- **GIVEN** ich habe kein Regal oder alle meine Regale sind voll
- **WHEN** ich einen Wein anlege
- **THEN** wird der Schritt „Einlagern“ nicht angeboten
- **AND** habe ich kein Regal, weist die App auf das Anlegen eines Regals hin

### Requirement: Einlagerungsvorschlag
Das System SHALL für einen Wein und eine Flaschenanzahl einen Vorschlag mit konkreten freien Fächern (Regalname, Reihe, Spalte) liefern, die zur bisherigen Belegung passen. Ein Fach MUST umso besser bewertet werden, je ähnlicher die Weine in seiner Nachbarschaft sind. Die Ähnlichkeit MUST in dieser Rangfolge zählen: derselbe Wein, derselbe Erzeuger, dieselbe Region, dasselbe Land, derselbe Weintyp; zusätzlich MUST ein ähnlicher Jahrgang bzw. ein ähnliches Trinkfenster besser bewertet werden. Der Vorschlag MUST nur freie Fächer nennen und eine kurze Begründung in Worten enthalten. Bei gleichen Voraussetzungen MUST er immer dasselbe Ergebnis liefern.

#### Scenario: Gleiche Region liegt zusammen
- **GIVEN** in „Keller links“ liegen in Reihe 2 die Weine „Brunello“ und „Chianti“, beide aus der Region Toskana, und in Reihe 4 ein Riesling von der Mosel
- **AND** in Reihe 2 sind die Spalten 3 und 4 frei
- **WHEN** ich einen Wein „Vino Nobile“ aus der Toskana einlagern möchte
- **THEN** schlägt das System ein Fach in Reihe 2 vor
- **AND** die Begründung nennt die Region Toskana

#### Scenario: Gleicher Erzeuger vor gleicher Region
- **GIVEN** in Reihe 1 liegt ein Wein desselben Erzeugers aus einer anderen Region und in Reihe 4 liegt ein anderer Erzeuger aus derselben Region, beide haben ein freies Nachbarfach
- **WHEN** ich eine Flasche dieses Erzeugers einlagern möchte
- **THEN** wird das freie Fach bei Reihe 1 vorgeschlagen

#### Scenario: Ähnlicher Jahrgang
- **GIVEN** zwei freie Fächer liegen neben Weinen desselben Erzeugers, das eine neben dem Jahrgang 2005, das andere neben dem Jahrgang 2020
- **WHEN** ich einen Jahrgang 2019 dieses Erzeugers einlagern möchte
- **THEN** wird das Fach neben dem Jahrgang 2020 vorgeschlagen

#### Scenario: Gleicher Wein
- **GIVEN** 2 Flaschen „Sassicaia“ 2021 liegen in Reihe 1, Spalte 1 und 2, Spalte 3 ist frei
- **WHEN** ich eine weitere Flasche „Sassicaia“ 2021 einlagern möchte
- **THEN** wird Reihe 1, Spalte 3 vorgeschlagen

### Requirement: Mehrere Flaschen zusammenhalten
Bei mehreren Flaschen desselben Weins SHALL das System die Fächer möglichst als zusammenhängenden Abschnitt derselben Reihe vorschlagen. Reicht eine Reihe nicht aus, MUST der Vorschlag in einer direkt angrenzenden Reihe oder – wenn nötig – in einem anderen Regal fortgesetzt werden. Das System MUST nie mehr Fächer vorschlagen als Flaschen eingelagert werden sollen und kein Fach doppelt.

#### Scenario: Sechs Flaschen in eine Reihe
- **GIVEN** ein Regal mit Breite 6 hat in Reihe 3 sechs freie, nebeneinanderliegende Fächer
- **WHEN** ich 6 Flaschen eines Weins einlagern möchte
- **THEN** schlägt das System Reihe 3, Spalte 1 bis 6 vor

#### Scenario: Reihe zu kurz
- **GIVEN** in der besten Reihe sind nur 4 zusammenhängende Fächer frei, in der Reihe darunter weitere
- **WHEN** ich 6 Flaschen einlagern möchte
- **THEN** liegen 4 Flaschen in der besten Reihe und 2 in der angrenzenden Reihe

### Requirement: Leeres oder neues Regal
Gibt es noch keine eingelagerten Weine, auf die sich ein Vorschlag stützen könnte, SHALL das System die ersten freien Fächer vorschlagen (von oben links, Reihe für Reihe), im Regal mit den meisten freien Fächern und bei Gleichstand im ersten nach Name. Die Begründung MUST darauf hinweisen, dass noch keine Ordnung vorliegt. Passt kein vorhandener Wein, MUST das System bevorzugt ein Fach vorschlagen, dessen Nachbarn leer sind, statt zwischen fremde Weine zu legen.

#### Scenario: Erstes Einlagern
- **GIVEN** ich habe ein leeres Regal mit Höhe 5 und Breite 6
- **WHEN** ich 2 Flaschen einlagern möchte
- **THEN** schlägt das System Reihe 1, Spalte 1 und Reihe 1, Spalte 2 vor
- **AND** die Begründung sagt, dass noch keine Weine eingelagert sind

#### Scenario: Nichts passt
- **GIVEN** in den Reihen 1 und 2 liegen nur Weine einer anderen Region und eines anderen Typs, Reihe 5 ist leer
- **WHEN** ich einen Wein einlagern möchte, der zu keinem davon passt
- **THEN** schlägt das System ein Fach in der leeren Reihe vor

### Requirement: Nicht genug Platz
Sind insgesamt weniger freie Fächer vorhanden als Flaschen eingelagert werden sollen, SHALL das System für die vorhandenen Fächer einen Vorschlag machen und die Zahl der nicht unterzubringenden Flaschen angeben.

#### Scenario: Zu wenig freie Fächer
- **GIVEN** in allen meinen Regalen sind zusammen nur 2 Fächer frei
- **WHEN** ich 3 Flaschen einlagern möchte
- **THEN** schlägt das System 2 Fächer vor
- **AND** weist darauf hin, dass 1 Flasche keinen Platz hat

### Requirement: Vorschlag übernehmen
Das System SHALL dem Benutzer erlauben, den Vorschlag mit einer Aktion zu übernehmen. Dabei MUST jede Flasche in ihr vorgeschlagenes Fach gelegt werden, entweder vollständig oder gar nicht. Ist inzwischen eines der Fächer belegt oder nicht mehr vorhanden, MUST das System die Aktion ablehnen, es MUST keine Flasche eingelagert werden und die App MUST einen neuen Vorschlag anzeigen. Das System MUST ablehnen, mehr Flaschen eines Weins einzulagern, als er nicht eingelagerte Flaschen hat.

#### Scenario: Vorschlag übernehmen
- **GIVEN** der Vorschlag für 3 Flaschen „Zweigelt“ lautet Reihe 1, Spalte 1 bis 3
- **WHEN** ich den Vorschlag übernehme
- **THEN** liegen 3 Flaschen „Zweigelt“ in diesen Fächern
- **AND** die Weinseite zeigt diese Fächer und keine nicht eingelagerten Flaschen mehr

#### Scenario: Fach inzwischen belegt
- **GIVEN** ich habe einen Vorschlag für 3 Fächer erhalten
- **AND** eines davon wird in der Zwischenzeit belegt
- **WHEN** ich den Vorschlag übernehme
- **THEN** wird keine der 3 Flaschen eingelagert
- **AND** die App weist auf die Änderung hin und zeigt einen neuen Vorschlag

#### Scenario: Zu viele Flaschen
- **GIVEN** von „Merlot“ liegen 2 Flaschen im Keller, davon 1 eingelagert
- **WHEN** versucht wird, 2 weitere Flaschen „Merlot“ einzulagern
- **THEN** lehnt das System die Aktion ab und lagert keine Flasche ein

### Requirement: Eigene Wahl statt Vorschlag
Der Benutzer SHALL statt des Vorschlags ein Fach selbst wählen können. Dafür MUST die App die Regalansicht im Einlagern-Modus öffnen (wie beim bisherigen Einlagern einer einzelnen Flasche). Der Vorschlag MUST nichts einlagern, solange der Benutzer ihn nicht bestätigt.

#### Scenario: Anderes Fach wählen
- **GIVEN** mir wird ein Vorschlag gezeigt
- **WHEN** ich „Selbst wählen“ wähle
- **THEN** öffnet sich die Regalansicht im Einlagern-Modus für diesen Wein
- **AND** bis dahin ist keine Flasche eingelagert

### Requirement: Vorschlag auf der Weinseite
Das System SHALL auf der Weinseite eines Weins mit nicht eingelagerten Flaschen die Aktion „Einlagerung vorschlagen“ anbieten, die einen Vorschlag für alle nicht eingelagerten Flaschen dieses Weins zeigt.

#### Scenario: Nachträglich einlagern
- **GIVEN** von „Barolo“ sind 2 Flaschen im Keller, keine eingelagert
- **WHEN** ich auf der Weinseite „Einlagerung vorschlagen“ wähle
- **THEN** sehe ich einen Vorschlag für 2 Fächer

#### Scenario: Alles eingelagert
- **GIVEN** alle Flaschen von „Barolo“ sind eingelagert
- **THEN** wird „Einlagerung vorschlagen“ nicht angeboten

### Requirement: Vorschläge sind privat
Der Vorschlag MUST ausschließlich eigene Weine und eigene Regale berücksichtigen. Eine Anfrage für den Wein eines anderen Benutzers MUST mit „nicht gefunden“ beantwortet werden.

#### Scenario: Fremder Wein
- **GIVEN** der Wein „Annas Riesling“ gehört Benutzerin „anna“
- **WHEN** Benutzer „ben“ dafür einen Vorschlag anfordert
- **THEN** antwortet das System mit „nicht gefunden“
