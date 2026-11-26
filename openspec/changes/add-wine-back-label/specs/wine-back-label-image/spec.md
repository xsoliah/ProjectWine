# Spec Delta

## Purpose

Ein Wein kann ein Foto seines Rückenetiketts haben, damit Angaben wie Rebsorten, Trinkfenster oder Importeur später in der Einzelansicht nachlesbar sind. Das Bild wird unbearbeitet gespeichert und nur in der Detailansicht gezeigt.

## ADDED Requirements

### Requirement: Rückenetikett aus der Foto-Erfassung behalten
Das System SHALL beim Übernehmen eines Erfassungsentwurfs das aufgenommene Rückenetikett-Foto als Rückseitenbild am Wein speichern. Es MUST nicht mehr gelöscht werden, wenn der Entwurf übernommen wird. Wird der Entwurf stattdessen zu einem vorhandenen Wein hinzugefügt, der schon ein Rückseitenbild hat, MUST das vorhandene erhalten bleiben und das Foto des Entwurfs gelöscht werden.

#### Scenario: Wein aus Entwurf mit Rückseite
- **GIVEN** ich habe „Sassicaia“ per Foto mit Vorder- und Rückenetikett erfasst
- **WHEN** ich den Entwurf übernehme
- **THEN** hat „Sassicaia“ ein Rückseitenbild

#### Scenario: Entwurf ohne Rückseite
- **GIVEN** ich habe einen Wein nur mit Vorderetikett erfasst
- **WHEN** ich den Entwurf übernehme
- **THEN** hat der Wein kein Rückseitenbild

#### Scenario: Flaschen zu vorhandenem Wein
- **GIVEN** „Sassicaia“ hat ein Rückseitenbild und ein neuer Entwurf mit anderem Rückenfoto wird zu diesem Wein hinzugefügt
- **WHEN** ich den Entwurf übernehme
- **THEN** bleibt das bisherige Rückseitenbild erhalten
- **AND** das Rückenfoto des Entwurfs ist gelöscht

### Requirement: Rückseite in der Detailansicht anzeigen
Hat ein Wein ein Rückseitenbild, SHALL die Detailansicht Vorder- und Rückseite anbieten und zwischen beiden umschalten lassen; zuerst MUST die Vorderseite erscheinen. Das Rückseitenbild MUST vollständig und unverzerrt mit einem Textersatz „Rückseite von <Weinname>“ gezeigt werden. Ohne Rückseitenbild MUST die Ansicht ohne Umschalter erscheinen.

#### Scenario: Zwischen Seiten wechseln
- **GIVEN** „Sassicaia“ hat Vorderetikett und Rückseitenbild
- **WHEN** ich die Detailansicht öffne und „Rückseite“ wähle
- **THEN** sehe ich das Rückenetikett vollständig
- **AND** mit „Vorderseite“ komme ich zum Etikettenbild zurück

#### Scenario: Wein ohne Rückseite
- **GIVEN** „Zweigelt“ hat kein Rückseitenbild
- **WHEN** ich die Detailansicht öffne
- **THEN** gibt es keinen Umschalter und die Vorderseite wird wie bisher gezeigt

### Requirement: Rückseitenbild nachträglich setzen und entfernen
Das System SHALL erlauben, einem Wein in der Detailansicht ein Rückseitenbild aus einem Foto (JPEG, PNG oder WebP, höchstens 10 MB) hinzuzufügen oder ein vorhandenes zu ersetzen sowie es zu entfernen. Das ersetzte oder entfernte Bild MUST gelöscht werden. Das Setzen MUST keine Recherche auslösen und nicht auf das Tageslimit angerechnet werden. Das Rückseitenbild MUST unabhängig vom Vorderetikett gesetzt werden können.

#### Scenario: Rückseite hinzufügen
- **GIVEN** „Sassicaia“ hat kein Rückseitenbild
- **WHEN** ich ein Foto des Rückenetiketts wähle
- **THEN** hat „Sassicaia“ ein Rückseitenbild

#### Scenario: Rückseite ersetzen
- **GIVEN** „Sassicaia“ hat ein Rückseitenbild
- **WHEN** ich ein neues Foto wähle
- **THEN** zeigt „Sassicaia“ das neue Bild und das alte ist gelöscht

#### Scenario: Rückseite entfernen
- **WHEN** ich bei „Sassicaia“ das Rückseitenbild entferne
- **THEN** hat „Sassicaia“ kein Rückseitenbild mehr und das Bild ist gelöscht

#### Scenario: Ungültige Datei
- **WHEN** ich eine Datei wähle, die kein JPEG, PNG oder WebP ist oder größer als 10 MB ist
- **THEN** wird sie abgelehnt und das bisherige Rückseitenbild bleibt erhalten

### Requirement: Rückseitenbild beim Löschen und Datenschutz
Beim Löschen eines Weins MUST dessen Rückseitenbild gelöscht werden. Das Rückseitenbild SHALL nur für seinen Besitzer abrufbar sein; jeder Abruf MUST eine gültige Anmeldung erfordern.

#### Scenario: Wein löschen
- **GIVEN** „Sassicaia“ hat ein Rückseitenbild
- **WHEN** ich den Wein lösche
- **THEN** ist auch das Rückseitenbild gelöscht

#### Scenario: Fremdes Bild
- **GIVEN** Benutzerin „anna“ hat ein Rückseitenbild
- **WHEN** Benutzer „ben“ dieses Bild abruft
- **THEN** erhält er „nicht gefunden“
