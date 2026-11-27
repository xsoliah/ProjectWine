## ADDED Requirements

### Requirement: Raummaße festlegen
Das System SHALL jedem Benutzer genau einen rechteckigen Kellerraum mit Breite, Tiefe und Deckenhöhe zuordnen. Ohne eigene Angabe MUST der Raum 4,00 m × 3,00 m × 2,50 m betragen. Breite und Tiefe MUST zwischen 1 und 20 m, die Deckenhöhe zwischen 1,5 und 5 m liegen, jeweils auf Zentimeter genau. Der Benutzer SHALL die Maße ändern können.

#### Scenario: Standardraum
- **GIVEN** ein Benutzer hat noch keine Raummaße festgelegt
- **WHEN** er den Kellerraum öffnet
- **THEN** zeigt das System einen Raum von 4,00 m × 3,00 m × 2,50 m

#### Scenario: Maße ändern
- **WHEN** der Benutzer Breite 6,5 m, Tiefe 4 m und Höhe 2,2 m speichert
- **THEN** zeigt der Kellerraum beim nächsten Öffnen diese Maße

#### Scenario: Ungültige Maße
- **WHEN** der Benutzer eine Breite von 0,5 m, 25 m oder eine negative Zahl speichert
- **THEN** lehnt das System die Aktion mit einer verständlichen Fehlermeldung ab
- **AND** die bisherigen Maße bleiben erhalten

#### Scenario: Raum würde Regale ausschließen
- **GIVEN** ein Regal steht bei 3 m von der linken Wand
- **WHEN** der Benutzer die Raumbreite auf 2 m verkleinert
- **THEN** lehnt das System die Änderung als Konflikt ab und nennt das betroffene Regal
- **AND** die Raummaße bleiben unverändert

### Requirement: Regal im Raum platzieren
Das System SHALL für jedes Regal eine optionale Position und Drehung im Kellerraum speichern: Abstand der linken, hinteren Ecke des Regals von der linken und der hinteren Wand in Zentimetern sowie eine Drehung in 90°-Schritten (0°, 90°, 180°, 270°), die bestimmt, in welche Richtung die Regalfront zeigt. Die Grundfläche eines Regals ergibt sich aus Breite und Tiefe; die Fächergröße ist für alle Regale gleich (12 cm × 12 cm, Regaltiefe 38 cm). Ein Regal MUST vollständig im Raum stehen und DARF NICHT mit der Grundfläche eines anderen Regals überlappen; Berührungen sind erlaubt. Regale ohne Position gelten als „nicht platziert“.

#### Scenario: Regal setzen
- **GIVEN** ein Raum von 4 m × 3 m und ein nicht platziertes Regal mit 5 Reihen und 6 Spalten (Breite 72 cm)
- **WHEN** der Benutzer das Regal an Position 50 cm / 20 cm, Drehung 0° speichert
- **THEN** steht das Regal dort im Kellerraum

#### Scenario: Regal außerhalb des Raums
- **WHEN** der Benutzer ein Regal so positioniert, dass es über die Raumgrenze hinausragt
- **THEN** lehnt das System die Platzierung als ungültig ab und das Regal behält seine bisherige Position

#### Scenario: Regale überlappen
- **GIVEN** Regal A steht bei 0 cm / 0 cm, Breite 72 cm, Tiefe 38 cm, Drehung 0°
- **WHEN** der Benutzer Regal B an Position 50 cm / 10 cm platziert
- **THEN** lehnt das System die Platzierung als Konflikt ab und nennt Regal A
- **AND** an Position 72 cm / 0 cm (nur Berührung) wird sie angenommen

#### Scenario: Drehung vertauscht die Grundfläche
- **GIVEN** ein Regal mit Breite 72 cm und Tiefe 38 cm
- **WHEN** es um 90° gedreht an Position 0 cm / 0 cm gesetzt wird
- **THEN** belegt es 38 cm in der Breite und 72 cm in der Tiefe des Raums

#### Scenario: Ungültige Drehung
- **WHEN** eine Drehung von 45° gespeichert werden soll
- **THEN** lehnt das System die Aktion ab

#### Scenario: Regal aus dem Raum nehmen
- **GIVEN** ein Regal steht im Raum und enthält Flaschen
- **WHEN** der Benutzer „Entfernen“ wählt
- **THEN** ist das Regal „nicht platziert“, existiert samt Flaschen weiter und erscheint in der Regalliste

### Requirement: Änderung der Regalmaße prüft die Platzierung
Das System SHALL verhindern, dass das Ändern von Höhe oder Breite eines platzierten Regals dessen Grundfläche aus dem Raum oder über ein anderes Regal hinaus wachsen lässt. Eine solche Änderung MUST als Konflikt abgelehnt werden; die Maße bleiben unverändert. Das Löschen eines Regals MUST auch dessen Platzierung entfernen.

#### Scenario: Regal verbreitern stößt an die Wand
- **GIVEN** ein Regal mit 6 Spalten steht direkt an der rechten Wand
- **WHEN** der Benutzer es auf 8 Spalten verbreitert
- **THEN** lehnt das System die Änderung als Konflikt ab

#### Scenario: Regal löschen gibt den Platz frei
- **GIVEN** Regal A steht im Raum
- **WHEN** der Benutzer Regal A löscht
- **THEN** ist der Platz im Kellerraum frei und ein anderes Regal lässt sich dort platzieren

### Requirement: Kellerraum ist privat
Ein Benutzer SHALL ausschließlich seinen eigenen Raum und die Platzierung seiner eigenen Regale sehen und ändern können.

#### Scenario: Fremder Raum
- **GIVEN** Benutzerin „anna“ hat Regale in ihrem Raum platziert
- **WHEN** Benutzer „ben“ seinen Kellerraum abruft
- **THEN** erscheinen weder Annas Raummaße noch ihre Regale
- **AND** der Versuch, Annas Regal zu platzieren, wird mit „nicht gefunden“ beantwortet

### Requirement: Kellerraum in 3D ansehen
Das System SHALL den Kellerraum als dreidimensionale Szene zeigen (Seite „Kellerraum“): Boden und Wände in den gespeicherten Maßen und jedes platzierte Regal maßstäblich an seiner Position und Drehung mit Höhe × Breite Fächern. Belegte Fächer MUST durch den Boden einer Flasche in der Farbe des Weintyps erkennbar sein, freie Fächer MUST leer sein. Der Benutzer SHALL die Szene begrenzt drehen und zoomen können; „Ansicht zurücksetzen“ MUST eine Übersicht zeigen, die den ganzen Raum erfasst. Wände, die dem Betrachter den Blick versperren, MUST durchscheinend oder ausgeblendet sein, sodass die Regale sichtbar bleiben. Nicht platzierte Regale MUST in einer Liste „Nicht platziert“ mit Name und Maßen stehen.

#### Scenario: Raum mit zwei Regalen
- **GIVEN** ein Raum von 4 m × 3 m mit zwei platzierten Regalen und einem nicht platzierten Regal
- **WHEN** ich den Kellerraum öffne
- **THEN** sehe ich den Raum in 3D mit den zwei Regalen an ihren Positionen
- **AND** die Liste „Nicht platziert“ zeigt das dritte Regal

#### Scenario: Belegung erkennbar
- **GIVEN** ein platziertes Regal mit 4 Flaschen, darunter ein Rotwein und ein Weißwein
- **WHEN** ich den Kellerraum ansehe
- **THEN** zeigt das Regal 4 belegte Fächer mit Flaschenböden in unterschiedlichen, natürlichen Glasfarben, alle anderen Fächer sind leer

#### Scenario: Blick von der Rückseite
- **WHEN** ich die Ansicht so drehe, dass eine Wand zwischen mir und den Regalen liegt
- **THEN** ist diese Wand durchscheinend oder ausgeblendet und die Regale bleiben sichtbar

#### Scenario: Ansicht zurücksetzen
- **GIVEN** ich habe gedreht und in ein Regal hineingezoomt
- **WHEN** ich „Ansicht zurücksetzen“ wähle
- **THEN** sehe ich wieder den ganzen Raum in der Übersicht

#### Scenario: Leerer Keller
- **GIVEN** ein Benutzer hat noch kein Regal angelegt
- **WHEN** er den Kellerraum öffnet
- **THEN** sieht er den leeren Raum und einen Hinweis mit Verweis auf „Regale“ zum Anlegen des ersten Regals

### Requirement: Regale im Raum anordnen
Im Modus „Anordnen“ SHALL der Benutzer Regale auf dem Boden per Ziehen verschieben, in 90°-Schritten drehen, platzieren und entfernen können. Beim Ziehen MUST das Regal an Wände und Kanten anderer Regale einrasten (Toleranz bis 10 cm) und ungültige Stellungen (außerhalb, Überlappung) MUST deutlich markiert werden; wird in einer ungültigen Stellung losgelassen, MUST das Regal an die letzte gültige Position zurückkehren. Dieselben Aktionen MUST per Eingabefelder für Position und Drehung sowie per Pfeiltasten (Schrittweite 10 cm, mit Umschalttaste 1 cm) und Tasten zum Drehen bedienbar sein. „Platzieren“ MUST ein nicht platziertes Regal an die erste freie Stelle im Raum setzen oder, wenn keine existiert, mit einem Hinweis ablehnen. Gespeichert wird beim Loslassen bzw. Bestätigen; schlägt das Speichern fehl, MUST das Regal an seine gespeicherte Position zurückkehren und eine Fehlermeldung erscheinen.

#### Scenario: Regal ziehen und einrasten
- **GIVEN** der Modus „Anordnen“ und ein Regal, das 6 cm von der linken Wand entfernt steht
- **WHEN** ich es loslasse
- **THEN** rastet es an der linken Wand ein (Abstand 0 cm) und die Position ist gespeichert

#### Scenario: Ungültig loslassen
- **GIVEN** ich ziehe ein Regal über ein anderes
- **WHEN** ich es dort loslasse
- **THEN** wurde die Stellung während des Ziehens als ungültig markiert
- **AND** das Regal springt auf die letzte gültige Position zurück

#### Scenario: Per Tastatur verschieben
- **GIVEN** ein Regal ist im Modus „Anordnen“ ausgewählt
- **WHEN** ich die Pfeiltaste nach rechts drücke
- **THEN** rückt das Regal um 10 cm nach rechts, sofern die Stellung gültig ist, und die neue Position ist gespeichert

#### Scenario: Drehen
- **WHEN** ich ein Regal mit „Drehen“ um 90° drehe und die neue Grundfläche im Raum Platz hat
- **THEN** steht es gedreht an derselben Stelle (um seine Mitte)
- **AND** passt es nicht, bleibt die Drehung unverändert und ein Hinweis erscheint

#### Scenario: Platzieren ohne freie Stelle
- **GIVEN** der Raum hat keine freie Fläche für das Regal
- **WHEN** ich „Platzieren“ wähle
- **THEN** erscheint der Hinweis, dass im Raum kein Platz ist, und das Regal bleibt „nicht platziert“

#### Scenario: Speichern schlägt fehl
- **GIVEN** das Gerät ist offline
- **WHEN** ich ein Regal verschiebe und loslasse
- **THEN** springt das Regal an die gespeicherte Position zurück und eine Fehlermeldung erscheint

### Requirement: Regal im Raum antippen
In der 3D-Ansicht des Kellerraums SHALL das Antippen eines Regals dieses hervorheben und eine Infoleiste mit Regalname, Maßen (Reihen × Spalten), belegten und freien Fächern und der Aktion „Regal öffnen“ zeigen. Die Kamera MUST weich auf das Regal zufahren und dabei den Raum nicht verlassen. „Regal öffnen“ MUST die Regaldetailansicht öffnen; von dort MUST man zum Kellerraum zurückkehren können. Antippen einer leeren Fläche oder Escape MUST die Hervorhebung aufheben. Im Modus „Anordnen“ wählt das Antippen das Regal zum Anordnen aus, statt die Kamera zu fahren.

#### Scenario: Regal öffnen
- **GIVEN** ich sehe den Kellerraum mit dem Regal „Keller links“
- **WHEN** ich das Regal antippe und „Regal öffnen“ wähle
- **THEN** sehe ich die Regaldetailansicht von „Keller links“

#### Scenario: Auswahl aufheben
- **GIVEN** ein Regal ist hervorgehoben
- **WHEN** ich auf eine leere Stelle des Bodens tippe oder Escape drücke
- **THEN** verschwindet die Hervorhebung und die Infoleiste

#### Scenario: Bewegung reduzieren
- **GIVEN** mein Gerät ist auf „Bewegung reduzieren“ eingestellt
- **WHEN** ich ein Regal antippe oder die Ansicht zurücksetze
- **THEN** springt die Kamera ohne Animation an das Ziel

### Requirement: Kellerraum ohne 3D
Unterstützt das Gerät keine 3D-Darstellung oder geht sie während der Nutzung verloren, MUST der Kellerraum als Liste bedienbar bleiben: Raummaße, Regale mit Position (Abstand links/hinten, Drehung) bzw. „nicht platziert“ und alle Anordnen-Aktionen über Eingabefelder, dazu ein Hinweis, dass die 3D-Ansicht nicht verfügbar ist. Die Liste MUST auch per Tastatur und mit einem Screenreader bedienbar sein; die Szene MUST eine Textbeschreibung (Anzahl Regale, Raummaße) haben.

#### Scenario: Gerät ohne 3D
- **GIVEN** mein Browser unterstützt keine 3D-Darstellung
- **WHEN** ich den Kellerraum öffne
- **THEN** sehe ich die Raummaße und die Regale als Liste mit Position und Drehung
- **AND** ein Hinweis erklärt, dass die 3D-Ansicht auf diesem Gerät nicht verfügbar ist
- **AND** ich kann ein Regal über Eingabefelder platzieren

#### Scenario: 3D geht verloren
- **GIVEN** ich sehe die 3D-Szene
- **WHEN** der Grafikkontext verloren geht und nicht wiederhergestellt wird
- **THEN** wechselt die Seite zur Liste und meine bisherigen Änderungen sind erhalten
