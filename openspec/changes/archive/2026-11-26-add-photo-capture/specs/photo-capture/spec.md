# Spec Delta

## Purpose

Benutzer erfassen einen Wein per Foto des Etiketts. Ein KI-Agent liest das Etikett, ergänzt die Metadaten im Hintergrund per Websuche und legt einen Entwurf an, den der Benutzer prüft und als Wein übernimmt.

## ADDED Requirements

### Requirement: Aufnahme starten
Das System SHALL einem angemeldeten Benutzer erlauben, eine Foto-Erfassung mit einem Foto des Vorderetiketts, optional einem zweiten Foto (z. B. Rückenetikett), einer Flaschenanzahl (Standard 1) und einer optionalen Notiz zu starten. Erlaubt sind JPEG, PNG und WebP bis 10 MB je Foto. Die Antwort MUST sofort erfolgen, ohne auf die Recherche zu warten, und einen Entwurf mit dem Status „wartet“ liefern.

#### Scenario: Foto aufnehmen
- **WHEN** ich ein Foto des Etiketts aufnehme und „2 Flaschen“ angebe
- **THEN** entsteht sofort ein Entwurf mit Status „wartet“, 2 Flaschen und dem Foto als Vorschaubild
- **AND** ich kann die App weiter benutzen, während recherchiert wird

#### Scenario: Ungültige Datei
- **WHEN** ich eine Datei hochlade, die kein Bild im Format JPEG, PNG oder WebP ist oder größer als 10 MB ist
- **THEN** lehnt das System die Aufnahme mit einer verständlichen Fehlermeldung ab
- **AND** es entsteht kein Entwurf und kein Recherche-Kontingent wird verbraucht

#### Scenario: Ohne Foto
- **WHEN** ich eine Erfassung ohne Foto starte
- **THEN** lehnt das System die Aktion ab

### Requirement: Recherche im Hintergrund
Für jeden wartenden Entwurf SHALL das System auf dem Server eine Recherche durchführen, unabhängig davon, ob die App geöffnet bleibt. Der Status MUST von „wartet“ über „wird recherchiert“ zu „fertig“ oder „fehlgeschlagen“ wechseln. Eine durch einen Neustart des Servers unterbrochene Recherche MUST automatisch erneut gestartet werden.

#### Scenario: Recherche erfolgreich
- **GIVEN** ein Entwurf mit Status „wartet“
- **WHEN** der Agent die Recherche abschließt
- **THEN** hat der Entwurf den Status „fertig“ und enthält die gefundenen Angaben

#### Scenario: App geschlossen
- **GIVEN** ich habe ein Foto aufgenommen und die App sofort geschlossen
- **WHEN** ich die App später wieder öffne
- **THEN** ist der Entwurf fertig recherchiert

#### Scenario: Server-Neustart während der Recherche
- **GIVEN** ein Entwurf hat den Status „wird recherchiert“
- **WHEN** der Server neu startet
- **THEN** wird die Recherche für diesen Entwurf erneut gestartet und der Entwurf bleibt erhalten

### Requirement: Inhalt der Recherche
Der Agent SHALL aus den Fotos und einer Websuche folgende Angaben ermitteln, soweit möglich: Name, Weingut, Jahrgang, Weintyp, Land, Region, Rebsorten mit optionalen Anteilen, Flaschengröße, Trinkfenster (von/bis), Barcode (EAN/UPC) und eine kurze Notiz (höchstens 500 Zeichen). Jede Angabe MUST als „vom Etikett“ oder „aus dem Web“ gekennzeichnet sein. Nicht ermittelbare Angaben MUST leer bleiben statt geraten zu werden. Die genutzten Webquellen (Titel und Adresse) MUST im Entwurf stehen.

#### Scenario: Angaben mit Herkunft
- **GIVEN** das Etikett zeigt „Sassicaia 2021, Tenuta San Guido, Bolgheri“
- **WHEN** die Recherche fertig ist
- **THEN** sind Name, Weingut und Jahrgang als „vom Etikett“ gekennzeichnet
- **AND** Rebsorten und Trinkfenster sind als „aus dem Web“ gekennzeichnet und mit Quellen belegt

#### Scenario: Nichts im Web gefunden
- **GIVEN** das Etikett eines unbekannten Hausweins zeigt nur „Rotwein trocken 2023“
- **WHEN** die Recherche fertig ist
- **THEN** enthält der Entwurf nur die Angaben vom Etikett, die übrigen Felder sind leer
- **AND** der Entwurf hat den Status „fertig“ mit dem Hinweis, dass im Web nichts Passendes gefunden wurde

#### Scenario: Kein Wein auf dem Foto
- **WHEN** das Foto kein Weinetikett zeigt
- **THEN** hat der Entwurf den Status „fehlgeschlagen“ mit dem Hinweis, dass kein Weinetikett erkannt wurde

### Requirement: Etikett-Ecken erkennen
Der Agent SHALL zusätzlich die vier Ecken des Vorderetiketts auf dem Vorderfoto liefern, aus denen das Etikettenbild ausgeschnitten wird (siehe `wine-label-image`). Sind die Ecken nicht sicher bestimmbar, MUST er keine Ecken liefern, statt sie zu raten; der Entwurf MUST trotzdem „fertig“ werden.

#### Scenario: Ecken erkannt
- **GIVEN** das Vorderfoto zeigt das Etikett von „Sassicaia“ vollständig
- **WHEN** die Recherche fertig ist
- **THEN** enthält der Entwurf die vier Ecken des Etiketts

#### Scenario: Etikett angeschnitten
- **GIVEN** auf dem Vorderfoto ist das Etikett am Bildrand abgeschnitten
- **WHEN** die Recherche fertig ist
- **THEN** hat der Entwurf den Status „fertig“, aber keine Etikett-Ecken

### Requirement: Recherche fehlgeschlagen
Scheitert eine Recherche (z. B. Dienst nicht erreichbar, Zeitüberschreitung nach 5 Minuten, Antwort unbrauchbar), SHALL der Entwurf den Status „fehlgeschlagen“ mit einer verständlichen Begründung erhalten. Vorübergehende Fehler MUST vorher bis zu zweimal automatisch wiederholt werden. Der Benutzer MUST einen fehlgeschlagenen Entwurf erneut recherchieren lassen können.

#### Scenario: Dienst vorübergehend nicht erreichbar
- **GIVEN** der KI-Dienst antwortet beim ersten Versuch mit einer Überlastung
- **WHEN** der zweite Versuch gelingt
- **THEN** hat der Entwurf den Status „fertig“

#### Scenario: Erneut recherchieren
- **GIVEN** ein Entwurf mit Status „fehlgeschlagen“
- **WHEN** ich „Erneut recherchieren“ wähle
- **THEN** hat der Entwurf wieder den Status „wartet“
- **AND** die Recherche wird auf das Tageslimit angerechnet

### Requirement: Entwürfe ansehen
Das System SHALL dem Benutzer eine Liste seiner Entwürfe (neueste zuerst) mit Vorschaubild, Status, erkanntem Namen und Jahrgang liefern. Die Navigation MUST die Anzahl der fertigen, noch nicht übernommenen Entwürfe anzeigen. Laufende Entwürfe MUST ihren Status ohne manuelles Neuladen aktualisieren, solange die Seite offen ist. Ein Benutzer SHALL nur seine eigenen Entwürfe sehen.

#### Scenario: Zähler in der Navigation
- **GIVEN** ich habe 2 fertige und 1 laufenden Entwurf
- **WHEN** ich die App öffne
- **THEN** zeigt die Navigation bei „Entwürfe“ die Zahl 2

#### Scenario: Status aktualisiert sich
- **GIVEN** ich sehe die Entwurfsliste mit einem Entwurf „wird recherchiert“
- **WHEN** die Recherche fertig wird
- **THEN** zeigt die Liste innerhalb weniger Sekunden „fertig“ und den erkannten Namen

#### Scenario: Fremde Entwürfe
- **GIVEN** Benutzerin „anna“ hat einen Entwurf
- **WHEN** Benutzer „ben“ seine Entwürfe abruft oder Annas Entwurf öffnet
- **THEN** sieht er Annas Entwurf nicht und erhält „nicht gefunden“

### Requirement: Entwurf prüfen
Das Öffnen eines fertigen Entwurfs SHALL das Wein-Formular mit den recherchierten Angaben und der Flaschenanzahl vorbefüllen, mit sichtbarer Kennzeichnung „vom Etikett“/„aus dem Web“ je Feld und der Liste der Quellen. Land, Region und Rebsorten MUST wie bei der Barcode-Vorbelegung vorhandenen Stammdaten zugeordnet oder als neu vorgeschlagen werden, ohne sie ohne Bestätigung anzulegen.

#### Scenario: Kennzeichnung und Quellen
- **GIVEN** ein fertiger Entwurf mit Name vom Etikett und Rebsorten aus dem Web
- **WHEN** ich ihn öffne
- **THEN** ist der Name als „Etikett“ und sind die Rebsorten als „Web“ markiert
- **AND** ich sehe die Quellen mit Titel und Adresse

#### Scenario: Unbekanntes Land wird vorgeschlagen
- **GIVEN** der Entwurf nennt das Land „Portugal“, das ich nicht in meiner Länderliste habe
- **WHEN** ich den Entwurf öffne
- **THEN** schlägt das Formular „Portugal“ als neues Land vor
- **AND** es wird erst angelegt, wenn ich das bestätige

### Requirement: Etikett im Entwurf
Ein fertiger Entwurf SHALL statt des Vorderfotos das daraus ausgeschnittene Etikett zeigen, mit der Möglichkeit „Zuschnitt anpassen“ (siehe `wine-label-image`).

#### Scenario: Ausgeschnittenes Etikett im Entwurf
- **GIVEN** ein fertiger Entwurf mit erkannten Etikett-Ecken
- **WHEN** ich ihn öffne
- **THEN** sehe ich nur das ausgeschnittene Etikett ohne Hintergrund und die Aktion „Zuschnitt anpassen“

### Requirement: Entwurf übernehmen
Erst das Speichern des vorbefüllten Formulars SHALL den Wein anlegen. Danach MUST der Entwurf als übernommen gelten und aus der Liste verschwinden, und das aus dem Vorderfoto ausgeschnittene Etikett MUST das Etikettenbild des neuen Weins werden (mit dem Vorderfoto als Originalfoto für späteres Anpassen). Hat der Benutzer den Zuschnitt angepasst, MUST die angepasste Fassung übernommen werden. Bricht der Benutzer ab, MUST der Entwurf unverändert erhalten bleiben.

#### Scenario: Übernehmen mit Korrektur
- **GIVEN** ein fertiger Entwurf „Sassicaia 2021“ mit 2 Flaschen
- **WHEN** ich ihn öffne, den Jahrgang korrigiere und speichere
- **THEN** ist der Wein mit dem korrigierten Jahrgang und 2 Flaschen im Keller
- **AND** der Wein zeigt das ausgeschnittene Etikett als Etikettenbild
- **AND** der Entwurf erscheint nicht mehr in der Liste

#### Scenario: Abbrechen
- **GIVEN** ein fertiger Entwurf
- **WHEN** ich ihn öffne und ohne Speichern abbreche
- **THEN** ist der Entwurf weiterhin fertig in der Liste und es wurde kein Wein angelegt

### Requirement: Vorhandenen Wein erkennen
Stimmt der recherchierte Barcode mit einem eigenen Wein überein, oder stimmen Name, Weingut und Jahrgang (ohne Groß-/Kleinschreibung) mit einem eigenen Wein überein, SHALL das System beim Öffnen des Entwurfs anbieten, die Flaschen zu diesem Wein hinzuzufügen, statt einen neuen anzulegen. Der Benutzer MUST trotzdem einen neuen Wein anlegen können.

#### Scenario: Wein schon im Keller
- **GIVEN** ich habe „Sassicaia“, „Tenuta San Guido“, 2021 mit 1 Flasche im Keller
- **AND** ein fertiger Entwurf erkennt denselben Wein mit 2 Flaschen
- **WHEN** ich den Entwurf öffne und „Flaschen hinzufügen“ wähle
- **THEN** hat „Sassicaia“ 3 Flaschen und der Entwurf ist übernommen

### Requirement: Entwurf verwerfen
Das System SHALL das Verwerfen eines Entwurfs in jedem Status erlauben. Ein verworfener Entwurf MUST mitsamt seinen Fotos gelöscht werden; eine laufende Recherche dafür MUST abgebrochen oder ihr Ergebnis verworfen werden.

#### Scenario: Laufenden Entwurf verwerfen
- **GIVEN** ein Entwurf mit Status „wird recherchiert“
- **WHEN** ich ihn verwerfe
- **THEN** erscheint er nicht mehr in der Liste und seine Fotos sind gelöscht

### Requirement: Tageslimit
Das System SHALL pro Benutzer und Kalendertag (Zeitzone des Servers) höchstens die konfigurierte Anzahl Recherchen starten (Standard 20). Jede neue Aufnahme und jedes „Erneut recherchieren“ zählt; automatische Wiederholungen nach Fehlern zählen nicht. Darüber hinaus MUST das System neue Aufnahmen mit einem Hinweis auf das Limit ablehnen. Die App SHALL die verbleibende Anzahl anzeigen.

#### Scenario: Limit erreicht
- **GIVEN** das Tageslimit ist 20 und ich habe heute 20 Recherchen gestartet
- **WHEN** ich ein weiteres Foto aufnehme
- **THEN** lehnt das System die Aufnahme mit dem Hinweis ab, dass das Tageslimit erreicht ist und es morgen wieder geht

#### Scenario: Verbleibende Recherchen
- **GIVEN** das Tageslimit ist 20 und ich habe heute 3 Recherchen gestartet
- **WHEN** ich „Per Foto erfassen“ öffne
- **THEN** sehe ich „Heute noch 17 Recherchen“

### Requirement: Verfügbarkeit ohne API-Schlüssel
Ist auf dem Server kein Schlüssel für den KI-Dienst konfiguriert, SHALL die Foto-Erfassung in der App nicht angeboten werden, und Aufnahmen über die API MUST mit einem Hinweis abgelehnt werden. Alle übrigen Funktionen MUST unverändert funktionieren.

#### Scenario: Kein Schlüssel konfiguriert
- **GIVEN** der Server hat keinen API-Schlüssel für den KI-Dienst
- **WHEN** ich „Wein hinzufügen“ öffne
- **THEN** gibt es keine Option „Per Foto erfassen“, Barcode und manuelle Eingabe funktionieren weiter

### Requirement: Hinweis zur Datenübertragung
Vor der ersten Foto-Erfassung eines Benutzers SHALL die App darauf hinweisen, dass Fotos zur Auswertung an einen externen KI-Dienst übertragen werden. Erst nach Bestätigung MUST das Foto hochgeladen werden; die Bestätigung MUST pro Gerät gemerkt werden.

#### Scenario: Erste Foto-Erfassung
- **WHEN** ich zum ersten Mal „Per Foto erfassen“ wähle
- **THEN** sehe ich den Hinweis zur Datenübertragung und kann bestätigen oder abbrechen
- **AND** beim Abbrechen wird nichts hochgeladen
