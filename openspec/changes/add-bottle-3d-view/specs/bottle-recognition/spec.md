# Spec Delta

## Purpose

Das System erkennt auf dem Foto nicht nur das Etikett, sondern die ganze Flasche samt Lage und Größe des Etiketts darauf. So lässt sich das Etikett möglichst echt und größengetreu auf die Flasche übertragen und der Wein in allen Ansichten stimmig darstellen.

## ADDED Requirements

### Requirement: Flasche mit Etikettenlage erkennen
Das System SHALL bei der Foto-Erfassung auf dem Vorderfoto die ganze Flasche erkennen und ein Flaschenmaß bestimmen: Umriss der Flasche, Breite von Körper, Schulter und Hals, Gesamthöhe sowie Lage und Größe des Etiketts relativ zur Flasche. Das Flaschenmaß MUST aus demselben Foto stammen wie die Etikettenecken, damit Größe und Lage des Etiketts zueinander stimmen. Die Erkennung MUST in derselben Recherche erfolgen und MUST keinen zusätzlichen Aufruf auf das Tageslimit anrechnen.

#### Scenario: Flasche vollständig im Bild
- **GIVEN** ich habe „Sassicaia“ aufrecht und vollständig fotografiert
- **WHEN** die Recherche fertig ist
- **THEN** enthält der Entwurf Flaschenumriss und Etikettenlage
- **AND** die Etikettenhöhe im Verhältnis zur Flaschenhöhe entspricht dem Foto

#### Scenario: Kein zusätzlicher Aufruf
- **GIVEN** mein Tageslimit steht bei 3 von 20
- **WHEN** eine Recherche mit Flaschenerkennung fertig wird
- **THEN** steht das Limit bei 4 von 20

### Requirement: Flaschenbild ohne Hintergrund
Das System SHALL aus dem Vorderfoto ein Flaschenbild mit transparentem Hintergrund erzeugen, das nur die Flasche zeigt. Das Flaschenbild MUST das Etikett an der erkannten Stelle in Originalgröße enthalten und MUST weder verzerrt noch beschnitten sein. Es SHALL als PNG in begrenzter Größe (längste Kante höchstens 1600 px) gespeichert werden.

#### Scenario: Freigestellte Flasche
- **GIVEN** die Flasche „Sassicaia“ steht vor einem Küchentisch
- **WHEN** das Flaschenbild entsteht
- **THEN** ist vom Tisch nichts zu sehen und der Hintergrund transparent
- **AND** die Flasche ist vollständig mit Hals und Kapsel enthalten

### Requirement: Rückfall auf Standardflasche
Konnte die Flasche nicht sicher erkannt werden (zum Beispiel abgeschnitten oder liegend), SHALL das System eine Standardflasche passend zu Weintyp und Flaschengröße und eine geschätzte Etikettenlage verwenden. Der Entwurf MUST dann den Hinweis „Flasche prüfen“ zeigen. Ein Flaschenbild MUST in diesem Fall erst nach Bestätigung entstehen.

#### Scenario: Flasche abgeschnitten
- **GIVEN** auf dem Foto fehlt der Flaschenhals
- **WHEN** ich den Entwurf öffne
- **THEN** erscheint der Hinweis „Flasche prüfen“ mit einer Standardflasche und geschätzter Etikettenlage
- **AND** es gibt noch kein Flaschenbild

### Requirement: Flasche prüfen und anpassen
Der Benutzer SHALL das Flaschenmaß im Entwurf und in der Detailansicht prüfen und in einem Editor Flaschenumriss und Etikettenlage verschieben können; danach MUST das Flaschenbild neu entstehen. Das Anpassen MUST keine Recherche auslösen und nicht auf das Tageslimit angerechnet werden. Das Originalfoto MUST dafür gespeichert bleiben.

#### Scenario: Etikett versetzen
- **GIVEN** das Etikett sitzt im Flaschenmaß zu tief
- **WHEN** ich im Editor die Etikettenlage nach oben schiebe und bestätige
- **THEN** zeigen Flaschenbild und 3D-Ansicht das Etikett an der neuen Stelle
- **AND** mein Tageslimit ist unverändert

### Requirement: Nachträglich erkennen
Das System SHALL erlauben, bei einem Wein mit gespeichertem Originalfoto die Flasche nachträglich erkennen zu lassen („Flasche erkennen“). Das MUST einen Aufruf auf das Tageslimit anrechnen und bei erreichtem Limit abgelehnt werden. Ohne Originalfoto MUST die Aktion nicht angeboten werden.

#### Scenario: Bestehender Wein
- **GIVEN** „Sassicaia“ hat ein Originalfoto, aber kein Flaschenmaß
- **WHEN** ich „Flasche erkennen“ wähle
- **THEN** erhält der Wein ein Flaschenmaß und ein Flaschenbild
- **AND** mein Tageslimit steigt um 1

#### Scenario: Limit erreicht
- **GIVEN** mein Tageslimit ist ausgeschöpft
- **WHEN** ich „Flasche erkennen“ wähle
- **THEN** wird die Aktion mit einem Hinweis auf das Limit abgelehnt

### Requirement: Flaschenbild in den Ansichten
Hat ein Wein ein Flaschenbild, SHALL die Kellerliste es statt des reinen Etikettenbilds als Vorschau zeigen, mit Textersatz „<Weinname>“. Ohne Flaschenbild MUST die bisherige Darstellung erhalten bleiben. Flaschenmaß und Flaschenbild MUST beim Löschen des Weins gelöscht werden und nur für den Besitzer abrufbar sein.

#### Scenario: Wein mit Flaschenbild
- **GIVEN** „Sassicaia“ hat ein Flaschenbild
- **WHEN** ich den Keller öffne
- **THEN** zeigt der Eintrag die freigestellte Flasche

#### Scenario: Fremdes Bild
- **GIVEN** Benutzerin „anna“ hat ein Flaschenbild
- **WHEN** Benutzer „ben“ es abruft
- **THEN** erhält er „nicht gefunden“
