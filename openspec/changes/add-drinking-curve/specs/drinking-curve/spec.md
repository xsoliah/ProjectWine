# drinking-curve Specification

## Purpose

Benutzer sehen in der Einzelansicht eines Weins, wann er voraussichtlich am besten schmeckt und wie breit sein Genussfenster ist, dargestellt als Glockenkurve um einen optimalen Trinkzeitpunkt. Die Angaben werden bei der Erfassung aus Webquellen geschätzt und lassen sich von Hand pflegen.

## ADDED Requirements

### Requirement: Optimaler Trinkzeitpunkt und Streuung
Das System SHALL zu jedem Wein optional einen optimalen Trinkzeitpunkt (Kalenderjahr) und eine Streuung (Standardabweichung in Jahren) speichern. Beide MUST gemeinsam vorhanden sein oder fehlen. Die Streuung MUST größer als 0 und höchstens 50 sein, der Zeitpunkt zwischen 1800 und dem aktuellen Jahr + 100 liegen. Das Trinkfenster (von/bis) MUST davon unabhängig bleiben.

#### Scenario: Werte speichern
- **WHEN** ich bei einem Wein den Trinkzeitpunkt 2031 und die Streuung 3 speichere
- **THEN** zeigt der Wein diese Werte beim erneuten Öffnen

#### Scenario: Unvollständige Angabe
- **WHEN** ich einen Trinkzeitpunkt ohne Streuung speichere
- **THEN** wird das Speichern mit einer verständlichen Meldung abgelehnt

#### Scenario: Ungültige Streuung
- **WHEN** ich die Streuung 0 oder −2 speichere
- **THEN** wird das Speichern mit einer verständlichen Meldung abgelehnt

### Requirement: Kurve in der Einzelansicht
Das System SHALL in der Einzelansicht eines Weins mit Trinkzeitpunkt und Streuung ein Diagramm zeigen: eine Glockenkurve (Normalverteilung) über die Jahre mit dem Höhepunkt bei 100 %, einer Markierung für das aktuelle Jahr und einer Markierung des Höhepunkts mit Jahreszahl. Eine größere Streuung MUST eine breitere Kurve ergeben. Die Kurve MUST als Schätzung gekennzeichnet sein. Hat der Wein weder Kurve noch Trinkfenster, MUST das Diagramm entfallen, ohne einen Fehler zu zeigen.

#### Scenario: Kurve mit Höhepunkt und heute
- **GIVEN** ein Wein mit Trinkzeitpunkt 2031 und Streuung 3
- **WHEN** ich seine Einzelansicht öffne
- **THEN** sehe ich eine Kurve mit dem Höhepunkt bei 2031 und einer Markierung für das aktuelle Jahr

#### Scenario: Breitere Streuung
- **GIVEN** zwei Weine mit gleichem Trinkzeitpunkt und den Streuungen 1 und 5
- **WHEN** ich ihre Einzelansichten vergleiche
- **THEN** ist die Kurve des zweiten Weins deutlich breiter

#### Scenario: Keine Angaben
- **GIVEN** ein Wein ohne Trinkzeitpunkt, Streuung und Trinkfenster
- **WHEN** ich seine Einzelansicht öffne
- **THEN** erscheint kein Diagramm und keine Fehlermeldung

### Requirement: Einordnung in Worten
Das System SHALL neben dem Diagramm den Stand des Weins in Worten angeben, abhängig vom Wert der Kurve im aktuellen Jahr und der Lage zum Höhepunkt: ab 80 % „Nahe am Höhepunkt“, darunter vor dem Höhepunkt „Noch zu jung“ mit Jahr des Höhepunkts, darunter nach dem Höhepunkt „Über den Höhepunkt hinaus“.

#### Scenario: Noch zu jung
- **GIVEN** das aktuelle Jahr ist 2026 und ein Wein hat Höhepunkt 2035 und Streuung 2
- **THEN** lautet die Einordnung „Noch zu jung – Höhepunkt 2035“

#### Scenario: Am Höhepunkt
- **GIVEN** das aktuelle Jahr ist 2026 und ein Wein hat Höhepunkt 2027 und Streuung 3
- **THEN** lautet die Einordnung „Nahe am Höhepunkt“

#### Scenario: Darüber hinaus
- **GIVEN** das aktuelle Jahr ist 2026 und ein Wein hat Höhepunkt 2015 und Streuung 2
- **THEN** lautet die Einordnung „Über den Höhepunkt hinaus“

### Requirement: Kurve aus dem Trinkfenster ableiten
Hat ein Wein ein vollständiges Trinkfenster (von und bis), aber keine gespeicherte Kurve, SHALL die Einzelansicht eine Kurve daraus ableiten: Höhepunkt in der Mitte des Fensters, Streuung ein Viertel der Fensterbreite, mindestens 0,5 Jahre. Die abgeleitete Kurve MUST als „aus dem Trinkfenster abgeleitet“ gekennzeichnet sein und darf nicht gespeichert werden, bevor der Benutzer den Wein speichert.

#### Scenario: Ableitung für Bestandswein
- **GIVEN** ein Wein mit Trinkfenster 2024 bis 2032 ohne Kurve
- **WHEN** ich seine Einzelansicht öffne
- **THEN** zeigt das Diagramm einen Höhepunkt bei 2028 mit Streuung 2 und dem Hinweis „aus dem Trinkfenster abgeleitet“

### Requirement: Von Hand pflegen
Das System SHALL im Wein-Formular Trinkzeitpunkt und Streuung bearbeitbar machen und die Kurve dort zur Kontrolle anzeigen. Das Leeren beider Felder MUST die Kurve entfernen.

#### Scenario: Werte korrigieren
- **GIVEN** ein Wein mit geschätztem Trinkzeitpunkt 2031
- **WHEN** ich ihn im Formular auf 2029 ändere und speichere
- **THEN** zeigt die Einzelansicht den Höhepunkt bei 2029

### Requirement: Kurve nachschätzen
Das System SHALL in der Einzelansicht eines Weins anbieten, Trinkzeitpunkt und Streuung per Webrecherche schätzen zu lassen. Die Aktion MUST vor dem Start bestätigt werden, weil sie ein Recherche-Kontingent des Tageslimits verbraucht, und MUST bei erreichtem Limit oder fehlendem Schlüssel für den KI-Dienst mit verständlicher Meldung scheitern. Hat der Wein bereits eine Kurve, MUST das Überschreiben ausdrücklich bestätigt werden. Liefert die Recherche nichts Belastbares, MUST der Wein unverändert bleiben und der Benutzer dies erfahren.

#### Scenario: Schätzung für Bestandswein
- **GIVEN** ein Wein ohne Kurve und ein freies Tageslimit
- **WHEN** ich „Trinkzeitpunkt schätzen“ bestätige
- **THEN** hat der Wein danach Trinkzeitpunkt und Streuung und die Einzelansicht zeigt die Kurve
- **AND** das Tageslimit ist um eins verbraucht

#### Scenario: Tageslimit erreicht
- **GIVEN** mein Tageslimit ist ausgeschöpft
- **WHEN** ich „Trinkzeitpunkt schätzen“ bestätige
- **THEN** erhalte ich eine verständliche Meldung und der Wein bleibt unverändert

#### Scenario: Nichts gefunden
- **GIVEN** die Recherche liefert keine belastbare Angabe
- **WHEN** ich „Trinkzeitpunkt schätzen“ bestätige
- **THEN** erfahre ich, dass nichts ermittelt werden konnte, und der Wein bleibt unverändert
