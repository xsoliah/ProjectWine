# grape-varieties Specification

## Purpose

Benutzer pflegen Rebsorten als eigene Stammdaten und ordnen jedem Wein eine oder mehrere Rebsorten mit optionalen Anteilen zu. So lässt sich erkennen, ob ein Wein rebsortenrein oder eine Cuvée ist, und die Zusammensetzung lässt sich auswerten.

## Requirements

### Requirement: Rebsorte anlegen
Das System SHALL einem angemeldeten Benutzer erlauben, eine Rebsorte mit einem Namen anzulegen. Rebsortennamen MUST pro Benutzer eindeutig sein, ohne Beachtung von Groß- und Kleinschreibung und von Leerzeichen am Anfang und Ende. Ein leerer Name oder ein Name mit mehr als 100 Zeichen MUST abgelehnt werden.

#### Scenario: Neue Rebsorte
- **WHEN** ich die Rebsorte „Sangiovese“ anlege
- **THEN** erscheint „Sangiovese“ in meiner Rebsortenliste

#### Scenario: Doppelte Rebsorte
- **GIVEN** ich habe die Rebsorte „Spätburgunder“
- **WHEN** ich die Rebsorte „spätburgunder “ anlege
- **THEN** lehnt das System die Aktion als Konflikt ab

#### Scenario: Leerer Name
- **WHEN** ich eine Rebsorte ohne Namen anlege
- **THEN** lehnt das System die Aktion ab

### Requirement: Rebsorten sind privat
Ein Benutzer SHALL nur seine eigenen Rebsorten sehen, verwenden und ändern können.

#### Scenario: Fremde Rebsorte
- **GIVEN** Benutzerin „anna“ hat die Rebsorte „Furmint“
- **WHEN** Benutzer „ben“ seine Rebsorten auflistet oder einem Wein Annas „Furmint“ zuweist
- **THEN** erscheint „Furmint“ nicht in seiner Liste
- **AND** die Zuweisung wird mit „nicht gefunden“ abgelehnt

### Requirement: Rebsortenliste
Das System SHALL alle Rebsorten des Benutzers alphabetisch sortiert mit der Anzahl der Weine liefern, die sie verwenden (auch Weine, die nur noch im Archiv stehen).

#### Scenario: Liste mit Verwendung
- **GIVEN** ich habe „Merlot“ (in 2 Weinen) und „Cabernet Franc“ (in keinem Wein)
- **WHEN** ich meine Rebsortenliste abrufe
- **THEN** erhalte ich „Cabernet Franc“ (0 Weine) und „Merlot“ (2 Weine) in dieser Reihenfolge

### Requirement: Rebsorten eines Weins
Beim Anlegen und Bearbeiten eines Weins SHALL der Benutzer null, eine oder mehrere eigene Rebsorten in einer selbst gewählten Reihenfolge angeben können. Dieselbe Rebsorte MUST pro Wein höchstens einmal vorkommen. Der Wein MUST die Rebsorten in dieser Reihenfolge zurückgeben.

#### Scenario: Mehrere Rebsorten in Reihenfolge
- **WHEN** ich einen Wein „Sassicaia“ mit den Rebsorten „Cabernet Sauvignon“ und „Cabernet Franc“ speichere
- **THEN** zeigt der Wein die Rebsorten „Cabernet Sauvignon, Cabernet Franc“ in dieser Reihenfolge

#### Scenario: Ohne Rebsorte
- **WHEN** ich einen Wein ohne Rebsorte speichere
- **THEN** hat der Wein keine Rebsorten und ist weder rebsortenrein noch Cuvée

#### Scenario: Rebsorte doppelt
- **WHEN** ich einen Wein mit den Rebsorten „Merlot“ und „Merlot“ speichere
- **THEN** lehnt das System die Aktion ab

### Requirement: Anteile in Prozent
Zu jeder Rebsorte eines Weins SHALL optional ein ganzzahliger Anteil von 1 bis 100 Prozent angegeben werden können. Die Summe der angegebenen Anteile MUST höchstens 100 betragen. Anteile dürfen für einzelne Rebsorten fehlen.

#### Scenario: Anteile angeben
- **WHEN** ich einen Wein mit „Cabernet Sauvignon“ 85 % und „Cabernet Franc“ 15 % speichere
- **THEN** zeigt der Wein „Cabernet Sauvignon 85 %, Cabernet Franc 15 %“

#### Scenario: Summe über 100
- **WHEN** ich einen Wein mit „Merlot“ 70 % und „Cabernet Franc“ 40 % speichere
- **THEN** lehnt das System die Aktion mit dem Hinweis ab, dass die Anteile zusammen höchstens 100 % ergeben dürfen

#### Scenario: Ungültiger Anteil
- **WHEN** ich für eine Rebsorte den Anteil 0 % oder 120 % angebe
- **THEN** lehnt das System die Aktion ab

### Requirement: Rebsortenrein oder Cuvée
Ein Wein mit genau einer Rebsorte SHALL als „rebsortenrein“ gelten, ein Wein mit zwei oder mehr Rebsorten als „Cuvée“. Die Einordnung MUST beim Wein angezeigt werden und sich bei jeder Änderung der Rebsorten neu ergeben.

#### Scenario: Rebsortenrein
- **WHEN** ich einen Wein nur mit „Riesling“ speichere
- **THEN** ist der Wein rebsortenrein

#### Scenario: Cuvée aus zwei Rebsorten
- **WHEN** ich einen Wein mit „Cabernet Sauvignon“ und „Merlot“ speichere
- **THEN** ist der Wein eine Cuvée

#### Scenario: Aus Cuvée wird rebsortenrein
- **GIVEN** der Wein „Hauscuvée“ hat „Zweigelt“ und „Blaufränkisch“
- **WHEN** ich „Blaufränkisch“ entferne
- **THEN** ist „Hauscuvée“ rebsortenrein

### Requirement: Rebsorten im Wein-Formular
Das Wein-Formular SHALL Rebsorten als Auswahl aus den eigenen Stammdaten anbieten, mit Hinzufügen, Entfernen, Verschieben der Reihenfolge und einem optionalen Prozentfeld je Rebsorte. Fehlt eine Rebsorte, MUST der Benutzer sie direkt aus dem Formular anlegen können, ohne dass bereits eingegebene Formulardaten verloren gehen.

#### Scenario: Neue Rebsorte aus dem Formular
- **WHEN** ich im Formular „Touriga Nacional“ eingebe, das es noch nicht gibt, und „anlegen“ wähle
- **THEN** wird „Touriga Nacional“ angelegt und dem Wein hinzugefügt
- **AND** die übrigen Formulardaten bleiben erhalten

#### Scenario: Reihenfolge ändern
- **GIVEN** im Formular stehen „Merlot“ und danach „Cabernet Franc“
- **WHEN** ich „Cabernet Franc“ nach oben verschiebe und speichere
- **THEN** zeigt der Wein „Cabernet Franc, Merlot“

### Requirement: Suche nach Rebsorte
Die Kellersuche SHALL auch Weine finden, bei denen eine Rebsorte den Suchbegriff enthält (ohne Groß-/Kleinschreibung).

#### Scenario: Suche „franc“
- **GIVEN** „Sassicaia“ enthält „Cabernet Franc“, „Barolo“ enthält „Nebbiolo“
- **WHEN** ich im Keller nach „franc“ suche
- **THEN** finde ich „Sassicaia“, aber nicht „Barolo“

### Requirement: Barcode-Vorbelegung ordnet Rebsorten zu
Liefert die externe Barcode-Datenbank Rebsorten als Text, SHALL das System den Text an Komma, Semikolon, Schrägstrich und „und“ aufteilen und jede Rebsorte der gleichnamigen eigenen Rebsorte zuordnen. Unbekannte Namen MUST im Formular als neue Rebsorte vorgeschlagen werden, ohne sie ohne Bestätigung anzulegen.

#### Scenario: Bekannte und unbekannte Rebsorte
- **GIVEN** ich habe die Rebsorte „Merlot“, aber keine „Carménère“
- **WHEN** ein Barcode-Scan die Rebsorten „Merlot / Carménère“ liefert
- **THEN** ist im Formular „Merlot“ ausgewählt
- **AND** „Carménère“ wird als neue Rebsorte vorgeschlagen und erst beim Bestätigen angelegt

### Requirement: Rebsorte umbenennen und zusammenführen
Das System SHALL das Umbenennen einer Rebsorte und das Zusammenführen einer Rebsorte in eine andere erlauben. Beim Zusammenführen MUST jeder Wein mit der Quelle danach die Ziel-Rebsorte haben und die Quelle gelöscht werden. Hat ein Wein beide Rebsorten, MUST er die Ziel-Rebsorte nur einmal behalten, an der früheren Position der beiden, mit der Summe beider Anteile, falls angegeben.

#### Scenario: Umbenennen
- **GIVEN** zwei Weine haben die Rebsorte „Pinot Nero“
- **WHEN** ich „Pinot Nero“ in „Pinot Noir“ umbenenne
- **THEN** zeigen beide Weine „Pinot Noir“

#### Scenario: Zusammenführen
- **GIVEN** Wein A hat „Spätburgunder“, Wein B hat „Pinot Noir“
- **WHEN** ich „Spätburgunder“ in „Pinot Noir“ zusammenführe
- **THEN** haben Wein A und Wein B die Rebsorte „Pinot Noir“
- **AND** „Spätburgunder“ existiert nicht mehr

#### Scenario: Zusammenführen bei einem Wein mit beiden Rebsorten
- **GIVEN** Wein C hat „Spätburgunder“ 60 % und danach „Pinot Noir“ 20 %
- **WHEN** ich „Spätburgunder“ in „Pinot Noir“ zusammenführe
- **THEN** hat Wein C nur noch „Pinot Noir“ 80 % und ist rebsortenrein

### Requirement: Rebsorte löschen
Das System SHALL das Löschen einer Rebsorte nur erlauben, wenn kein Wein (auch keiner, der nur noch im Archiv steht) sie verwendet.

#### Scenario: Verwendete Rebsorte löschen
- **GIVEN** ein Wein hat „Merlot“
- **WHEN** ich „Merlot“ lösche
- **THEN** lehnt das System die Aktion als Konflikt ab und nennt die Anzahl betroffener Weine

#### Scenario: Unbenutzte Rebsorte löschen
- **GIVEN** kein Wein verwendet „Cabernet Franc“
- **WHEN** ich „Cabernet Franc“ lösche
- **THEN** existiert „Cabernet Franc“ nicht mehr

### Requirement: Übernahme der bisherigen Rebsorten-Texte
Beim Update SHALL das System vorhandene Freitexte im bisherigen Rebsortenfeld an Komma, Semikolon, Schrägstrich und „und“ aufteilen, je Benutzer und Name (ohne Groß-/Kleinschreibung) eine Rebsorte anlegen und sie den Weinen in der ursprünglichen Reihenfolge ohne Anteile zuordnen. Es MUST dabei keine Rebsortenangabe verloren gehen.

#### Scenario: Text mit zwei Rebsorten
- **GIVEN** ein Wein hatte vor dem Update den Text „Cabernet Sauvignon, Cabernet Franc“
- **WHEN** das Update eingespielt wird
- **THEN** hat der Wein die Rebsorten „Cabernet Sauvignon“ und „Cabernet Franc“ in dieser Reihenfolge und ist eine Cuvée
