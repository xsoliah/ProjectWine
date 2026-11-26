# wine-racks Specification

## Purpose

Benutzer bilden ihre physischen Weinregale mit Reihen und Spalten in der App ab und legen jede Flasche aus ihrem Keller in ein bestimmtes Fach, damit sie freie Plätze finden und Flaschen gezielt wiederfinden.

## Requirements

### Requirement: Weinregal anlegen
Das System SHALL einem angemeldeten Benutzer erlauben, ein Weinregal mit Name, Höhe (Anzahl Reihen) und Breite (Anzahl Spalten) anzulegen. Die Kapazität eines Regals MUST Höhe × Breite Fächer betragen, jedes Fach fasst genau eine Flasche.

#### Scenario: Regal mit 5 Reihen und 6 Spalten
- **WHEN** der Benutzer ein Regal „Keller links“ mit Höhe 5 und Breite 6 anlegt
- **THEN** existiert das Regal „Keller links“ mit einer Kapazität von 30 Fächern
- **AND** alle 30 Fächer sind frei

#### Scenario: Ungültige Maße
- **WHEN** der Benutzer ein Regal mit Höhe 0, Breite 0, einer negativen Zahl oder einem Wert größer als 50 anlegt
- **THEN** lehnt das System die Aktion mit einer verständlichen Fehlermeldung ab
- **AND** es wird kein Regal angelegt

#### Scenario: Name fehlt
- **WHEN** der Benutzer ein Regal ohne Namen oder nur mit Leerzeichen als Namen anlegt
- **THEN** lehnt das System die Aktion ab

### Requirement: Eindeutige Regalnamen
Die Namen der Regale eines Benutzers MUST eindeutig sein, ohne Beachtung von Groß- und Kleinschreibung und von Leerzeichen am Anfang und Ende.

#### Scenario: Doppelter Name
- **GIVEN** der Benutzer hat ein Regal „Keller links“
- **WHEN** er ein weiteres Regal „keller links “ anlegt oder ein anderes Regal so umbenennt
- **THEN** lehnt das System die Aktion als Konflikt ab

### Requirement: Regale sind privat
Ein Benutzer SHALL ausschließlich seine eigenen Regale und deren Belegung sehen und ändern können.

#### Scenario: Fremdes Regal
- **GIVEN** Benutzerin „anna“ hat ein Regal „Annas Regal“
- **WHEN** Benutzer „ben“ seine Regale auflistet oder „Annas Regal“ abruft, ändert oder löscht
- **THEN** erscheint „Annas Regal“ nicht in seiner Liste
- **AND** Zugriffe darauf werden mit „nicht gefunden“ beantwortet

### Requirement: Regalübersicht
Das System SHALL für jedes Regal des Benutzers Name, Höhe, Breite, Kapazität, Anzahl belegter und Anzahl freier Fächer liefern, sortiert nach Name.

#### Scenario: Belegung in der Übersicht
- **GIVEN** ein Regal mit Höhe 5 und Breite 6, in dem 4 Flaschen liegen
- **WHEN** der Benutzer seine Regale auflistet
- **THEN** zeigt das Regal Kapazität 30, 4 belegte und 26 freie Fächer

### Requirement: Regalraster anzeigen
Das System SHALL ein Regal beim Öffnen als zweidimensionales Raster aus Reihen und Spalten darstellen (Ansicht „Raster“, Standard). Reihen MUST von oben beginnend ab 1 und Spalten von links beginnend ab 1 nummeriert sein. Für jedes belegte Fach MUST der Wein (Name, Erzeuger, Jahrgang, Typ) erkennbar sein.

#### Scenario: Belegtes und freies Fach
- **GIVEN** im Regal „Keller links“ liegt in Reihe 2, Spalte 3 eine Flasche „Sassicaia“ 2021
- **WHEN** der Benutzer das Regal öffnet
- **THEN** zeigt das Fach Reihe 2, Spalte 3 den Wein „Sassicaia“ 2021
- **AND** alle anderen Fächer werden als frei angezeigt

### Requirement: 3D-Ansicht des Regals
Als zusätzliche, optionale Ansicht SHALL das System ein Regal als dreidimensionales Modell mit Höhe × Breite Fächern zeigen, wenn der Benutzer die 3D-Ansicht wählt. In jedem belegten Fach MUST eine liegende Flasche mit dem Hals zum Betrachter liegen, freie Fächer MUST leer sein. Alle Weine MUST dasselbe Modell einer Bordeaux-Flasche verwenden, dessen Farbe sich nach dem Weintyp richtet.

#### Scenario: Regal in 3D öffnen
- **GIVEN** ein Regal mit Höhe 5 und Breite 6, in dem 4 Flaschen liegen
- **WHEN** ich das Regal öffne und die Ansicht „3D“ wähle
- **THEN** sehe ich ein 3D-Regal mit 30 Fächern von vorne
- **AND** in 4 Fächern liegt eine Flasche, 26 Fächer sind leer

#### Scenario: Farbe nach Weintyp
- **GIVEN** im Regal liegen eine Flasche Rotwein und eine Flasche Weißwein
- **WHEN** ich das Regal in 3D ansehe
- **THEN** haben beide Flaschen dieselbe Form, aber unterschiedliche Farben

### Requirement: 3D-Regal drehen und zoomen
In der 3D-Ansicht SHALL der Benutzer das Regal in begrenztem Umfang drehen und zoomen können. „Ansicht zurücksetzen“ MUST zur Startansicht führen, die das ganze Regal von vorne zeigt.

#### Scenario: Ansicht zurücksetzen
- **GIVEN** ich habe das Regal gedreht und hineingezoomt
- **WHEN** ich „Ansicht zurücksetzen“ wähle
- **THEN** sehe ich das ganze Regal wieder von vorne

### Requirement: Reihe antippen zeigt ihre Weine
In der 3D-Ansicht SHALL das Antippen einer Flasche oder eines Fachs die ganze Reihe hervorheben und alle Fächer dieser Reihe von links nach rechts auflisten: für belegte Fächer Spalte, Name, Erzeuger, Jahrgang und Typ des Weins, für freie Fächer Spalte und „frei“. Das Antippen eines Eintrags MUST die Fach-Aktionen (einlagern, umlagern, auslagern, trinken, verkaufen, verschenken) öffnen. Das Antippen einer anderen Reihe MUST die Auswahl wechseln, Schließen MUST die Hervorhebung aufheben.

#### Scenario: Reihe 2 antippen
- **GIVEN** ein Regal mit Höhe 5 und Breite 6, in Reihe 2 liegt „Sassicaia“ 2021 in Spalte 3 und „Zweigelt“ in Spalte 5
- **WHEN** ich in der 3D-Ansicht auf eine Flasche oder ein Fach in Reihe 2 tippe
- **THEN** ist Reihe 2 hervorgehoben
- **AND** die Liste zeigt Spalte 1 frei, Spalte 2 frei, Spalte 3 „Sassicaia“ 2021, Spalte 4 frei, Spalte 5 „Zweigelt“, Spalte 6 frei

#### Scenario: Aus der Reihe trinken
- **GIVEN** die Liste von Reihe 2 ist geöffnet
- **WHEN** ich auf „Sassicaia“ 2021 tippe und „Trinken“ wähle
- **THEN** ist Reihe 2, Spalte 3 frei und im 3D-Regal liegt dort keine Flasche mehr

#### Scenario: Andere Reihe wählen
- **GIVEN** Reihe 2 ist ausgewählt
- **WHEN** ich auf ein Fach in Reihe 4 tippe
- **THEN** ist nur noch Reihe 4 hervorgehoben und die Liste zeigt die Fächer von Reihe 4

### Requirement: Ansicht ohne 3D
Der Benutzer SHALL zwischen den Ansichten „Raster“ (Standard) und „3D“ umschalten können. Unterstützt das Gerät keine 3D-Darstellung, MUST die Auswahl „3D“ mit einem Hinweis deaktiviert sein, während Kellerliste und Raster unverändert funktionieren. Geht die 3D-Darstellung während der Nutzung verloren, MUST das System zur Ansicht „Raster“ wechseln. Die Auswahl einer Reihe und ihre Liste MUST auch per Tastatur und mit einem Screenreader bedienbar sein.

#### Scenario: Gerät ohne 3D
- **GIVEN** mein Browser unterstützt keine 3D-Darstellung
- **WHEN** ich ein Regal öffne
- **THEN** sehe ich das Regal als Raster
- **AND** die Auswahl „3D“ ist deaktiviert, mit dem Hinweis, dass die 3D-Ansicht auf diesem Gerät nicht verfügbar ist

#### Scenario: Reihe per Tastatur wählen
- **WHEN** ich die 3D-Ansicht nur per Tastatur bediene
- **THEN** kann ich eine Reihe auswählen und ihre Fächer als Text vorgelesen bekommen

### Requirement: Kellerliste bleibt Hauptansicht
Die Seite „Keller“ SHALL die Weine weiterhin als Liste mit Suche und Filtern zeigen; das ist auch nach dieser Änderung die Standardansicht des Kellers. Die 3D-Ansicht MUST NOT die Liste ersetzen, sondern SHALL als zweite Möglichkeit über „In 3D ansehen“ erreichbar sein.

#### Scenario: Keller öffnen
- **WHEN** ich die Seite „Keller“ öffne
- **THEN** sehe ich meine Weine als Liste wie bisher, mit Suche und Filtern
- **AND** es gibt die Möglichkeit „In 3D ansehen“

### Requirement: Aus der Kellerliste in die 3D-Ansicht
„In 3D ansehen“ SHALL das zuletzt geöffnete Regal (ohne solches das erste nach Name) in 3D zeigen, und eine Auswahl MUST den Wechsel zu jedem anderen eigenen Regal erlauben. „Zurück zur Liste“ MUST zur Kellerliste mit unveränderter Suche und unveränderten Filtern führen. Hat der Benutzer kein Regal, MUST das System auf das Anlegen eines Regals hinweisen.

#### Scenario: Zur 3D-Ansicht und zurück
- **GIVEN** ich habe in der Kellerliste nach „Riesling“ gesucht und den Filter „Weißwein“ gesetzt
- **AND** zuletzt habe ich das Regal „Keller rechts“ geöffnet
- **WHEN** ich „In 3D ansehen“ wähle
- **THEN** sehe ich „Keller rechts“ in 3D und kann zu meinen anderen Regalen wechseln
- **AND** über „Zurück zur Liste“ sehe ich wieder die Kellerliste mit der Suche „Riesling“ und dem Filter „Weißwein“

#### Scenario: Noch kein Regal
- **GIVEN** ich habe kein Regal angelegt
- **WHEN** ich in der Kellerliste „In 3D ansehen“ wähle
- **THEN** sehe ich einen Hinweis, dass zuerst ein Regal angelegt werden muss, und die Aktion „Regal anlegen“

### Requirement: Flasche in ein Fach legen
Das System SHALL dem Benutzer erlauben, eine Flasche eines eigenen Weins in ein freies Fach eines eigenen Regals zu legen. Die Anzahl der eingelagerten Flaschen eines Weins MUST höchstens seiner Flaschenanzahl im Keller entsprechen.

#### Scenario: Flasche einlagern
- **GIVEN** mein Keller enthält 3 Flaschen „Blaufränkisch“, von denen keine eingelagert ist
- **WHEN** ich eine Flasche „Blaufränkisch“ in Regal „Keller links“, Reihe 1, Spalte 1 lege
- **THEN** ist dieses Fach mit „Blaufränkisch“ belegt
- **AND** von „Blaufränkisch“ sind 1 Flasche eingelagert und 2 nicht eingelagert

#### Scenario: Fach bereits belegt
- **GIVEN** in Reihe 1, Spalte 1 liegt bereits eine Flasche
- **WHEN** ich eine weitere Flasche in dieses Fach lege
- **THEN** lehnt das System die Aktion als Konflikt ab

#### Scenario: Fach außerhalb des Regals
- **GIVEN** ein Regal mit Höhe 5 und Breite 6
- **WHEN** ich eine Flasche in Reihe 6 oder Spalte 7 lege
- **THEN** lehnt das System die Aktion ab

#### Scenario: Keine Flasche mehr übrig
- **GIVEN** mein Keller enthält 2 Flaschen „Merlot“ und beide sind bereits eingelagert
- **WHEN** ich eine weitere Flasche „Merlot“ in ein freies Fach lege
- **THEN** lehnt das System die Aktion mit dem Hinweis ab, dass alle Flaschen dieses Weins bereits eingelagert sind

### Requirement: Flasche umlagern
Das System SHALL dem Benutzer erlauben, eine eingelagerte Flasche in ein anderes freies Fach desselben oder eines anderen eigenen Regals zu verschieben. Das bisherige Fach MUST danach frei sein.

#### Scenario: In anderes Regal umlagern
- **GIVEN** eine Flasche „Zweigelt“ liegt in „Keller links“, Reihe 1, Spalte 1
- **WHEN** ich sie nach „Keller rechts“, Reihe 3, Spalte 2 verschiebe
- **THEN** ist „Keller rechts“, Reihe 3, Spalte 2 mit „Zweigelt“ belegt
- **AND** „Keller links“, Reihe 1, Spalte 1 ist frei

#### Scenario: Ziel belegt
- **WHEN** ich eine Flasche in ein bereits belegtes Fach verschiebe
- **THEN** lehnt das System die Aktion als Konflikt ab und beide Flaschen bleiben, wo sie sind

### Requirement: Flasche aus dem Fach nehmen
Das System SHALL dem Benutzer erlauben, eine Flasche aus einem Fach zu nehmen, ohne sie zu trinken, zu verkaufen oder zu verschenken. Die Flasche MUST danach als nicht eingelagert im Keller bleiben.

#### Scenario: Auslagern
- **GIVEN** eine Flasche „Riesling“ liegt in Reihe 1, Spalte 4
- **WHEN** ich sie aus dem Fach nehme
- **THEN** ist das Fach frei
- **AND** mein Keller enthält unverändert dieselbe Anzahl Flaschen „Riesling“

### Requirement: Aus einem Fach trinken, verkaufen oder verschenken
Das System SHALL dem Benutzer erlauben, direkt aus einem belegten Fach genau diese Flasche zu trinken, zu verkaufen oder zu verschenken. Dabei MUST das Fach frei werden, die Flaschenanzahl des Weins um 1 sinken und ein Archiveintrag mit den angegebenen Details entstehen.

#### Scenario: Flasche aus Fach trinken
- **GIVEN** mein Keller enthält 2 Flaschen „Chianti“, eine davon in Reihe 2, Spalte 2
- **WHEN** ich die Flasche aus Reihe 2, Spalte 2 trinke
- **THEN** ist das Fach frei
- **AND** mein Keller enthält 1 Flasche „Chianti“
- **AND** das Archiv enthält einen Eintrag „Getrunken“ für „Chianti“

### Requirement: Entnahme ohne Fachangabe gibt Fächer frei
Werden Flaschen eines Weins ohne Angabe eines Fachs getrunken, verkauft oder verschenkt, SHALL das System zuerst nicht eingelagerte Flaschen verwenden. Reichen diese nicht, MUST es zusätzlich so viele Fächer dieses Weins freigeben wie nötig, sortiert nach Regalname, Reihe, Spalte, und die freigegebenen Fächer in der Antwort nennen.

#### Scenario: Genug nicht eingelagerte Flaschen
- **GIVEN** mein Keller enthält 3 Flaschen „Grüner Veltliner“, davon 1 eingelagert
- **WHEN** ich 2 Flaschen „Grüner Veltliner“ verschenke
- **THEN** bleibt die eingelagerte Flasche in ihrem Fach
- **AND** es werden keine Fächer als freigegeben gemeldet

#### Scenario: Fächer müssen freigegeben werden
- **GIVEN** mein Keller enthält 3 Flaschen „Grüner Veltliner“, davon 2 eingelagert in „Keller links“ Reihe 1, Spalte 1 und Reihe 1, Spalte 2
- **WHEN** ich 2 Flaschen „Grüner Veltliner“ trinke
- **THEN** enthält mein Keller 1 Flasche „Grüner Veltliner“
- **AND** das Fach „Keller links“ Reihe 1, Spalte 1 ist frei und wird in der Antwort genannt
- **AND** die Flasche in Reihe 1, Spalte 2 bleibt eingelagert

### Requirement: Flaschenanzahl nicht unter eingelagerte Anzahl senken
Beim Bearbeiten eines Weins MUST das System eine neue Flaschenanzahl ablehnen, die kleiner ist als die Anzahl seiner eingelagerten Flaschen.

#### Scenario: Anzahl zu klein
- **GIVEN** von „Merlot“ sind 3 Flaschen im Keller, davon 2 eingelagert
- **WHEN** ich die Flaschenanzahl von „Merlot“ auf 1 ändere
- **THEN** lehnt das System die Aktion mit dem Hinweis ab, zuerst Flaschen aus den Fächern zu nehmen

### Requirement: Rückgängig gemachte Entnahme ist nicht eingelagert
Wird ein Archiveintrag rückgängig gemacht, SHALL das System die Flaschen als nicht eingelagert in den Keller zurückbuchen; eine frühere Fachbelegung MUST NOT wiederhergestellt werden.

#### Scenario: Rückgängig nach Trinken aus dem Fach
- **GIVEN** ich habe die Flasche „Barolo“ aus Reihe 1, Spalte 1 getrunken
- **WHEN** ich den Archiveintrag rückgängig mache
- **THEN** ist die Flasche wieder im Keller, aber nicht eingelagert
- **AND** Reihe 1, Spalte 1 bleibt frei

### Requirement: Weinansicht zeigt Fächer
Das System SHALL für jeden Wein die Fächer liefern, in denen seine Flaschen liegen (Regalname, Reihe, Spalte), sowie die Anzahl der nicht eingelagerten Flaschen.

#### Scenario: Wein mit eingelagerten Flaschen
- **GIVEN** mein Keller enthält 4 Flaschen „Sassicaia“, davon je eine in „Keller links“ Reihe 1, Spalte 1 und Reihe 1, Spalte 2
- **WHEN** ich den Wein „Sassicaia“ öffne
- **THEN** sehe ich die beiden Fächer „Keller links – Reihe 1, Spalte 1“ und „Keller links – Reihe 1, Spalte 2“
- **AND** 2 Flaschen als nicht eingelagert

### Requirement: Regalgröße ändern
Das System SHALL dem Benutzer erlauben, Name, Höhe und Breite eines Regals zu ändern. Eine Verkleinerung MUST abgelehnt werden, wenn dadurch ein belegtes Fach außerhalb des Regals läge.

#### Scenario: Vergrößern
- **GIVEN** ein Regal mit Höhe 5 und Breite 6 und belegten Fächern
- **WHEN** ich die Höhe auf 6 ändere
- **THEN** hat das Regal eine Kapazität von 36 Fächern und alle Flaschen bleiben in ihren Fächern

#### Scenario: Verkleinern mit belegtem Randfach
- **GIVEN** in Reihe 5, Spalte 6 liegt eine Flasche
- **WHEN** ich die Höhe auf 4 ändere
- **THEN** lehnt das System die Aktion ab und nennt das betroffene Fach

#### Scenario: Verkleinern ohne betroffene Fächer
- **GIVEN** in den Reihen 5 und den Spalten 6 liegen keine Flaschen
- **WHEN** ich Höhe 4 und Breite 5 setze
- **THEN** hat das Regal eine Kapazität von 20 Fächern

### Requirement: Regal löschen
Das System SHALL dem Benutzer erlauben, ein Regal zu löschen. Darin liegende Flaschen MUST als nicht eingelagert im Keller bleiben.

#### Scenario: Volles Regal löschen
- **GIVEN** im Regal „Keller links“ liegen 3 Flaschen „Zweigelt“
- **WHEN** ich das Regal „Keller links“ lösche
- **THEN** existiert das Regal nicht mehr
- **AND** mein Keller enthält weiterhin 3 Flaschen „Zweigelt“, alle nicht eingelagert

### Requirement: Wein löschen gibt Fächer frei
Wird ein Wein gelöscht, MUST das System alle von seinen Flaschen belegten Fächer freigeben.

#### Scenario: Gelöschter Wein im Regal
- **GIVEN** eine Flasche „Rosé“ liegt in Reihe 1, Spalte 1
- **WHEN** ich den Wein „Rosé“ lösche
- **THEN** ist Reihe 1, Spalte 1 frei

### Requirement: Lagerort ergibt sich aus der Regalbelegung
Ein Wein MUST NOT mehr ein frei eingebbares Lagerort-Feld haben. Der Lagerort einer Flasche SHALL ausschließlich über ihr Fach angegeben werden.

#### Scenario: Wein anlegen ohne Lagerort-Feld
- **WHEN** der Benutzer das Formular zum Anlegen oder Bearbeiten eines Weins öffnet
- **THEN** gibt es kein Eingabefeld „Lagerort“
- **AND** Wein-Daten der API enthalten kein Feld für einen Freitext-Lagerort
