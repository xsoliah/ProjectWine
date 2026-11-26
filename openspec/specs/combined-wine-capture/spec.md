# combined-wine-capture Specification

## Purpose

Benutzer erfassen einen Wein in einer einzigen Maske aus Etikettenfotos und Barcode. Der Barcode wird auf den Fotos automatisch erkannt oder von Hand ergänzt und gemeinsam mit den Fotos und allen recherchierten Angaben im Entwurf gespeichert.

## Requirements

### Requirement: Eine gemeinsame Erfassungsmaske
Wenn die Foto-Erfassung verfügbar ist, SHALL „Wein hinzufügen“ Fotos (Vorder- und optional Rückenetikett), Barcode, Flaschenanzahl und Notiz in einer Maske anbieten. Der Barcode MUST optional sein. Ohne Foto-Erfassung (kein Schlüssel für den KI-Dienst) MUST der bisherige Barcode-Ablauf unverändert bleiben.

#### Scenario: Alles in einer Maske
- **WHEN** ich „Wein hinzufügen“ öffne und die Foto-Erfassung verfügbar ist
- **THEN** sehe ich Foto-Aufnahme, ein Barcode-Feld mit Scan-Möglichkeit, Flaschenanzahl und Notiz gemeinsam
- **AND** ich kann ohne Barcode eine Erfassung starten

#### Scenario: Foto-Erfassung nicht verfügbar
- **GIVEN** auf dem Server ist kein Schlüssel für den KI-Dienst eingerichtet
- **WHEN** ich „Wein hinzufügen“ öffne
- **THEN** funktioniert der Barcode-Ablauf wie bisher mit Datenbank-Abfrage, manueller Eingabe und „Ohne Barcode erfassen“

### Requirement: Barcode auf den Fotos erkennen
Nach der Aufnahme eines Fotos SHALL das System das Foto auf einen Barcode (EAN-13, EAN-8, UPC-A, UPC-E) prüfen, vor dem Verkleinern für den Upload, und einen erkannten Code in der Maske anzeigen. Die Erkennung MUST beide Fotos berücksichtigen. Der erkannte Code MUST änderbar und entfernbar sein. Wird nichts erkannt, ist das kein Fehler.

#### Scenario: Barcode auf dem Rückenetikett
- **GIVEN** ich habe das Vorderetikett ohne Barcode aufgenommen
- **WHEN** ich das Rückenetikett mit sichtbarem Barcode aufnehme
- **THEN** zeigt die Maske den erkannten Code mit dem Hinweis „auf dem Foto erkannt“

#### Scenario: Kein Barcode erkennbar
- **WHEN** keines der Fotos einen lesbaren Barcode zeigt
- **THEN** erscheint kein Code, und ich kann einen von Hand eingeben, scannen oder ohne Barcode fortfahren

#### Scenario: Erkannten Code korrigieren
- **GIVEN** die Maske zeigt einen erkannten Code
- **WHEN** ich ihn ändere oder entferne
- **THEN** wird mein Wert verwendet und nicht durch eine spätere Erkennung überschrieben

### Requirement: Barcode prüfen
Das System SHALL einen Barcode vor dem Speichern normalisieren und seine Prüfziffer prüfen. Ein ungültiger, vom Benutzer eingegebener Code MUST mit einer verständlichen Meldung abgelehnt werden. Ein auf dem Foto erkannter Code MUST nur angezeigt werden, wenn er gültig ist.

#### Scenario: Falsche Prüfziffer eingegeben
- **WHEN** ich einen 13-stelligen Code mit falscher Prüfziffer eingebe und die Erfassung starte
- **THEN** wird er mit einer verständlichen Meldung abgelehnt, und es entsteht kein Entwurf

### Requirement: Barcode gehört zum Entwurf
Das System SHALL einen angegebenen oder erkannten Barcode zusammen mit den Fotos im Erfassungsentwurf speichern. Dieser Barcode MUST Vorrang vor einem vom KI-Agenten gelesenen oder im Web gefundenen haben und im Formular als „vom Etikett“ gekennzeichnet sein. Dem Agenten MUST er als bekannte Angabe übergeben werden.

#### Scenario: Barcode wird mit dem Entwurf gespeichert
- **GIVEN** die Maske zeigt den erkannten Barcode 4001234567896
- **WHEN** ich die Erfassung starte
- **THEN** enthält der Entwurf diesen Barcode, und das vorbefüllte Formular zeigt ihn als „vom Etikett“

#### Scenario: Angegebener Code hat Vorrang
- **GIVEN** der Entwurf enthält den Barcode A
- **WHEN** der Agent einen anderen Barcode B im Web findet
- **THEN** bleibt A der Barcode des Entwurfs

#### Scenario: Agent liest Barcode vom Foto
- **GIVEN** der Entwurf enthält keinen Barcode
- **WHEN** der Agent einen Barcode mit gültiger Prüfziffer vom Foto liest
- **THEN** übernimmt der Entwurf ihn

#### Scenario: Gelesener Code mit falscher Prüfziffer
- **GIVEN** der Entwurf enthält keinen Barcode
- **WHEN** der Agent einen Barcode mit falscher Prüfziffer liefert
- **THEN** bleibt das Barcode-Feld des Entwurfs leer

### Requirement: Wein bereits im Keller vor der Recherche
Ist der Barcode bekannt (erkannt, gescannt oder eingegeben) und gehört er zu einem Wein im Keller des Benutzers, SHALL die Maske vor dem Start der Recherche anbieten, Flaschen zu diesem Wein hinzuzufügen, ohne Recherche-Kontingent zu verbrauchen. Der Benutzer MUST die Recherche trotzdem starten können.

#### Scenario: Bekannter Wein per Foto
- **GIVEN** ich besitze einen Wein mit dem Barcode 4001234567896
- **WHEN** die App diesen Code auf dem Rückenetikett erkennt
- **THEN** bietet die Maske „Wein bereits im Keller – Flaschen hinzufügen“ an
- **AND** nach „Flaschen hinzufügen“ ist die Anzahl um die gewählte Menge erhöht, ohne Entwurf und ohne verbrauchte Recherche

#### Scenario: Trotzdem erfassen
- **GIVEN** die Maske bietet an, Flaschen zu einem vorhandenen Wein hinzuzufügen
- **WHEN** ich „Trotzdem neu erfassen“ wähle
- **THEN** startet die Erfassung mit Fotos und Barcode wie bei einem unbekannten Wein
