## ADDED Requirements

### Requirement: Theme-Auswahl
Die Einstellungen SHALL einen Bereich „Design“ mit allen Themes als Vorschaukacheln (Name, Farbmuster, hell/dunkel) anbieten. Verfügbar MUST sein: Klassik, Pergament, Nacht, Bordeaux, Riesling, Rosé. Die Wahl SHALL sofort wirken, ohne Neuladen und ohne Speichern-Knopf. Die Auswahl MUST per Tastatur bedienbar sein (Radiogruppe) und das aktive Theme kenntlich machen.

#### Scenario: Theme wechseln
- **GIVEN** die App läuft im Theme „Klassik“
- **WHEN** ich in den Einstellungen „Riesling“ wähle
- **THEN** ändern sich die Farben der ganzen App sofort
- **AND** „Riesling“ ist als aktiv markiert

#### Scenario: Tastaturbedienung
- **WHEN** ich mit den Pfeiltasten in der Theme-Auswahl wechsle
- **THEN** wird das jeweilige Theme angewendet und als ausgewählt angesagt

### Requirement: Vorgabe und Gerätemodus
Ohne gemerkte Wahl SHALL „Klassik“ gelten und wie bisher dem Hell/Dunkel-Modus des Geräts folgen, auch bei Wechsel zur Laufzeit. Die Themes Pergament, Nacht, Bordeaux, Riesling und Rosé MUST unabhängig vom Gerätemodus immer ihr eigenes Aussehen zeigen.

#### Scenario: Erster Start
- **GIVEN** keine gemerkte Wahl und das Gerät steht auf dunkel
- **WHEN** ich die App öffne
- **THEN** sehe ich das dunkle Klassik-Design wie bisher

#### Scenario: Festes Theme ignoriert Gerätemodus
- **GIVEN** ich habe „Pergament“ gewählt und das Gerät wechselt auf dunkel
- **THEN** bleibt die App hell

### Requirement: Wahl merken und ohne Flackern anwenden
Die Wahl SHALL auf dem Gerät gemerkt werden und nach Neustart gelten. Das gemerkte Theme MUST vor dem ersten Rendern angewendet sein, sodass kein Wechsel vom Standarddesign sichtbar ist. Ein unbekannter oder beschädigter gemerkter Wert MUST wie keine Wahl behandelt werden (Klassik).

#### Scenario: Neustart
- **GIVEN** ich habe „Nacht“ gewählt
- **WHEN** ich die App neu lade
- **THEN** erscheint sofort das Nacht-Design ohne helles Aufblitzen

#### Scenario: Ungültiger Wert
- **GIVEN** der gemerkte Wert ist „gibtsnicht“
- **WHEN** ich die App öffne
- **THEN** gilt „Klassik“

### Requirement: Alle Oberflächen folgen dem Theme
Texte, Flächen, Rahmen, Knöpfe, Badges, Navigation, Dialoge, Formulare, Toasts, Diagramme und Heatmap-Stufen MUST aus den Theme-Variablen stammen. Die DevExtreme-Komponenten (Tabelle, Pivot, Diagramm) SHALL das zum Theme passende helle oder dunkle DevExtreme-Stylesheet verwenden und beim Wechsel umschalten. Die 3D-Ansichten (Regal, Flasche) SHALL Hintergrund und Holz dem Theme anpassen. Browserleiste (`theme-color`) und `color-scheme` MUST zum Theme passen. Text MUST in jedem Theme mindestens Kontrast 4,5:1 (große Schrift 3:1) zur Fläche haben.

#### Scenario: Pivot im dunklen Theme
- **GIVEN** das Theme „Bordeaux“ (dunkel)
- **WHEN** ich ein Pivot öffne
- **THEN** nutzt es das dunkle DevExtreme-Stylesheet und lesbare Heatmap-Stufen

#### Scenario: Wechsel bei geöffneter Tabelle
- **GIVEN** die Tabelle ist im Theme „Pergament“ geöffnet
- **WHEN** ich zu „Nacht“ wechsle
- **THEN** wird auch die Tabelle dunkel, ohne dass Filter oder Anordnung verloren gehen

#### Scenario: 3D-Ansicht
- **WHEN** ich im Theme „Rosé“ das Regal in 3D öffne
- **THEN** passt der Hintergrund zum Theme und Flaschen bleiben gut erkennbar

### Requirement: Stimmige Gestaltung
Jedes Theme SHALL eine eigene Akzentfarbe, einen Verlauf für Kopf und Navigation und abgestimmte Weinart-Farben liefern. Weinart-Farben MUST in jedem Theme unterscheidbar bleiben. Der Wechsel SHALL mit kurzem weichem Übergang erfolgen; bei „weniger Bewegung“ MUST er ohne Animation erfolgen.

#### Scenario: Weniger Bewegung
- **GIVEN** das Gerät verlangt reduzierte Bewegung
- **WHEN** ich das Theme wechsle
- **THEN** wechseln die Farben ohne Übergangsanimation
