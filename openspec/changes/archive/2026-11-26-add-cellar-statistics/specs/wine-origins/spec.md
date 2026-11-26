# Spec Delta

## Purpose

Benutzer pflegen Länder und Regionen als verknüpfte Stammdaten, in denen jede Region zu genau einem Land gehört. So wird die Herkunft eines Weins eindeutig erfasst und lässt sich verlässlich auswerten.

## ADDED Requirements

### Requirement: Land anlegen
Das System SHALL einem angemeldeten Benutzer erlauben, ein Land mit einem Namen anzulegen. Ländernamen MUST pro Benutzer eindeutig sein, ohne Beachtung von Groß- und Kleinschreibung und von Leerzeichen am Anfang und Ende.

#### Scenario: Neues Land
- **WHEN** ich das Land „Italien“ anlege
- **THEN** erscheint „Italien“ in meiner Länderliste ohne Regionen

#### Scenario: Doppeltes Land
- **GIVEN** ich habe das Land „Italien“
- **WHEN** ich das Land „italien “ anlege
- **THEN** lehnt das System die Aktion als Konflikt ab

#### Scenario: Leerer Name
- **WHEN** ich ein Land ohne Namen anlege
- **THEN** lehnt das System die Aktion ab

### Requirement: Region einem Land zuordnen
Das System SHALL erlauben, eine Region mit Namen unter einem bestehenden eigenen Land anzulegen. Jede Region MUST genau einem Land angehören. Regionsnamen MUST innerhalb eines Landes eindeutig sein (ohne Groß-/Kleinschreibung); in verschiedenen Ländern dürfen gleichnamige Regionen existieren.

#### Scenario: Region anlegen
- **GIVEN** ich habe das Land „Italien“
- **WHEN** ich unter „Italien“ die Region „Toskana“ anlege
- **THEN** gehört „Toskana“ zum Land „Italien“

#### Scenario: Doppelte Region im selben Land
- **GIVEN** „Italien“ hat die Region „Toskana“
- **WHEN** ich unter „Italien“ die Region „toskana“ anlege
- **THEN** lehnt das System die Aktion als Konflikt ab

#### Scenario: Gleicher Name in anderem Land
- **GIVEN** „Italien“ hat eine Region „Piemont“
- **WHEN** ich unter „Frankreich“ eine Region „Piemont“ anlege
- **THEN** existieren beide Regionen

### Requirement: Herkunft ist privat
Ein Benutzer SHALL nur seine eigenen Länder und Regionen sehen, verwenden und ändern können.

#### Scenario: Fremde Länder
- **GIVEN** Benutzerin „anna“ hat das Land „Spanien“
- **WHEN** Benutzer „ben“ seine Länder auflistet oder einem Wein Annas Land „Spanien“ zuweist
- **THEN** erscheint „Spanien“ nicht in seiner Liste
- **AND** die Zuweisung wird mit „nicht gefunden“ abgelehnt

### Requirement: Herkunftsliste
Das System SHALL alle Länder des Benutzers alphabetisch sortiert mit ihren Regionen (ebenfalls alphabetisch) und der jeweiligen Anzahl verwendender Weine liefern.

#### Scenario: Liste mit Regionen
- **GIVEN** ich habe „Österreich“ mit „Burgenland“ und „Wachau“ sowie „Italien“ mit „Toskana“
- **WHEN** ich die Herkunftsliste abrufe
- **THEN** erhalte ich „Italien“ (Toskana) und „Österreich“ (Burgenland, Wachau) in dieser Reihenfolge

### Requirement: Herkunft eines Weins
Beim Anlegen und Bearbeiten eines Weins SHALL der Benutzer optional ein Land und optional eine Region wählen. Eine Region MUST zum gewählten Land gehören; eine Region ohne Land MUST abgelehnt werden.

#### Scenario: Land und Region
- **GIVEN** „Toskana“ gehört zu „Italien“
- **WHEN** ich einen Wein mit Land „Italien“ und Region „Toskana“ speichere
- **THEN** zeigt der Wein die Herkunft „Toskana, Italien“

#### Scenario: Nur Land
- **WHEN** ich einen Wein nur mit Land „Italien“ speichere
- **THEN** zeigt der Wein die Herkunft „Italien“ ohne Region

#### Scenario: Region passt nicht zum Land
- **GIVEN** „Wachau“ gehört zu „Österreich“
- **WHEN** ich einen Wein mit Land „Italien“ und Region „Wachau“ speichere
- **THEN** lehnt das System die Aktion ab

#### Scenario: Region ohne Land
- **WHEN** ich einen Wein mit Region „Toskana“, aber ohne Land speichere
- **THEN** lehnt das System die Aktion ab

### Requirement: Herkunft direkt im Wein-Formular anlegen
Das Wein-Formular SHALL Land und Region als Auswahl aus den eigenen Stammdaten anbieten, wobei die Regionsauswahl nur Regionen des gewählten Landes zeigt. Fehlt ein Eintrag, MUST der Benutzer ihn direkt aus dem Formular anlegen können, ohne das Formular zu verlassen.

#### Scenario: Regionen nach Land gefiltert
- **GIVEN** „Italien“ hat „Toskana“ und „Österreich“ hat „Wachau“
- **WHEN** ich im Formular das Land „Italien“ wähle
- **THEN** bietet die Regionsauswahl nur „Toskana“ an

#### Scenario: Neues Land aus dem Formular
- **WHEN** ich im Formular ein Land „Portugal“ eingebe, das es noch nicht gibt, und „anlegen“ wähle
- **THEN** wird „Portugal“ als Land angelegt und im Formular ausgewählt
- **AND** die bereits eingegebenen Formulardaten bleiben erhalten

#### Scenario: Landwechsel entfernt unpassende Region
- **GIVEN** im Formular sind „Italien“ und „Toskana“ gewählt
- **WHEN** ich das Land auf „Österreich“ ändere
- **THEN** ist keine Region mehr ausgewählt

### Requirement: Barcode-Vorbelegung ordnet das Land zu
Liefert die externe Barcode-Datenbank ein Land, SHALL das System es dem gleichnamigen eigenen Land zuordnen (ohne Groß-/Kleinschreibung). Gibt es keins, MUST das Formular den Namen als neues Land vorschlagen, ohne es ohne Bestätigung anzulegen.

#### Scenario: Land vorhanden
- **GIVEN** ich habe das Land „Italy“
- **WHEN** ein Barcode-Scan das Land „Italy“ liefert
- **THEN** ist im Formular das Land „Italy“ ausgewählt

#### Scenario: Land unbekannt
- **GIVEN** ich habe kein Land „Italy“
- **WHEN** ein Barcode-Scan das Land „Italy“ liefert
- **THEN** schlägt das Formular „Italy“ als neues Land vor
- **AND** es wird erst beim Bestätigen angelegt

### Requirement: Land oder Region umbenennen
Das System SHALL das Umbenennen von Ländern und Regionen erlauben. Alle Weine MUST danach den neuen Namen zeigen; die Eindeutigkeitsregeln gelten weiterhin.

#### Scenario: Region umbenennen
- **GIVEN** zwei Weine haben die Region „Toscana“
- **WHEN** ich „Toscana“ in „Toskana“ umbenenne
- **THEN** zeigen beide Weine die Region „Toskana“

### Requirement: Dubletten zusammenführen
Das System SHALL erlauben, ein Land in ein anderes oder eine Region in eine andere Region desselben Landes zusammenzuführen. Dabei MUST jeder Verweis auf den Quelleintrag auf das Ziel umgestellt und der Quelleintrag gelöscht werden. Beim Zusammenführen von Ländern MUST gleichnamige Regionen ebenfalls zusammengeführt und die übrigen unter das Ziel-Land verschoben werden.

#### Scenario: Länder zusammenführen
- **GIVEN** Land „Italy“ mit Region „Tuscany“ und 1 Wein, Land „Italien“ mit Region „Toskana“ und 2 Weinen
- **WHEN** ich „Italy“ in „Italien“ zusammenführe
- **THEN** gibt es kein Land „Italy“ mehr
- **AND** alle 3 Weine haben das Land „Italien“
- **AND** „Italien“ hat die Regionen „Toskana“ und „Tuscany“

#### Scenario: Regionen zusammenführen
- **GIVEN** in „Italien“ haben 1 Wein „Tuscany“ und 2 Weine „Toskana“
- **WHEN** ich „Tuscany“ in „Toskana“ zusammenführe
- **THEN** haben alle 3 Weine die Region „Toskana“ und „Tuscany“ existiert nicht mehr

#### Scenario: Region in anderes Land zusammenführen
- **WHEN** ich eine Region aus „Italien“ in eine Region aus „Österreich“ zusammenführe
- **THEN** lehnt das System die Aktion ab

### Requirement: Land oder Region löschen
Das System SHALL das Löschen eines Landes oder einer Region nur erlauben, wenn kein Wein (auch keiner, der nur noch im Archiv steht) darauf verweist. Ein Land mit Regionen MUST beim Löschen seine Regionen mitlöschen, sofern keine davon verwendet wird.

#### Scenario: Unbenutzte Region löschen
- **GIVEN** die Region „Wachau“ wird von keinem Wein verwendet
- **WHEN** ich „Wachau“ lösche
- **THEN** existiert „Wachau“ nicht mehr

#### Scenario: Verwendetes Land löschen
- **GIVEN** ein Wein hat das Land „Italien“
- **WHEN** ich „Italien“ lösche
- **THEN** lehnt das System die Aktion als Konflikt ab und nennt die Anzahl betroffener Weine
