# language: de
Funktionalität: Kellerraum
  Als Weinsammler möchte ich meinen Keller als Raum abbilden und meine Regale darin platzieren,
  damit ich einen räumlichen Eindruck von meinem tatsächlichen Keller bekomme.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  # ----- Raummaße -----

  Szenario: Standardraum
    Wenn ich den Kellerraum abrufe
    Dann misst der Raum 400 x 300 x 250 cm

  Szenario: Maße ändern
    Wenn ich die Raummaße auf 650 x 400 x 220 cm speichere
    Und ich den Kellerraum abrufe
    Dann misst der Raum 650 x 400 x 220 cm

  Szenariogrundriss: Ungültige Maße
    Wenn ich die Raummaße auf <Breite> x <Tiefe> x <Höhe> cm speichere
    Dann wird die Aktion abgelehnt mit "<Hinweis>"
    Und misst der Raum 400 x 300 x 250 cm

    Beispiele:
      | Breite | Tiefe | Höhe | Hinweis |
      | 50     | 300   | 250  | Breite  |
      | 2500   | 300   | 250  | Breite  |
      | 400    | -10   | 250  | Tiefe   |
      | 400    | 300   | 100  | Decken  |

  Szenario: Raum würde Regale ausschließen
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich setze das Regal "Keller links" an Position 300 / 20 mit Drehung 0
    Wenn ich die Raummaße auf 200 x 300 x 250 cm speichere
    Dann wird die Aktion als Konflikt abgelehnt
    Und wird die Aktion abgelehnt mit "Keller links"
    Und misst der Raum 400 x 300 x 250 cm

  # ----- Regale platzieren -----

  Szenario: Regal setzen
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich das Regal "Keller links" an Position 50 / 20 mit Drehung 0 setze
    Dann steht das Regal "Keller links" an Position 50 / 20 mit Drehung 0
    Und belegt das Regal "Keller links" 72 x 38 cm

  Szenario: Regal außerhalb des Raums
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich setze das Regal "Keller links" an Position 10 / 10 mit Drehung 0
    Wenn ich das Regal "Keller links" an Position 340 / 10 mit Drehung 0 setze
    Dann wird die Aktion abgelehnt mit "hinausragen"
    Und steht das Regal "Keller links" an Position 10 / 10 mit Drehung 0

  Szenario: Regale überlappen
    Angenommen ich habe ein Regal "A" mit Höhe 5 und Breite 6
    Und ich habe ein Regal "B" mit Höhe 5 und Breite 6
    Und ich setze das Regal "A" an Position 0 / 0 mit Drehung 0
    Wenn ich das Regal "B" an Position 50 / 10 mit Drehung 0 setze
    Dann wird die Aktion als Konflikt abgelehnt
    Und wird die Aktion abgelehnt mit "A"
    Und ist das Regal "B" nicht platziert
    Wenn ich das Regal "B" an Position 72 / 0 mit Drehung 0 setze
    Dann steht das Regal "B" an Position 72 / 0 mit Drehung 0

  Szenario: Drehung vertauscht die Grundfläche
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich das Regal "Keller links" an Position 0 / 0 mit Drehung 1 setze
    Dann belegt das Regal "Keller links" 38 x 72 cm

  Szenario: Ungültige Drehung
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich das Regal "Keller links" an Position 0 / 0 mit Drehung 5 setze
    Dann wird die Aktion abgelehnt mit "Drehung"
    Und ist das Regal "Keller links" nicht platziert

  Szenario: Regal aus dem Raum nehmen
    Angenommen mein Keller enthält 2 Flaschen "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und von "Zweigelt" liegen 2 Flaschen in "Keller links"
    Und ich setze das Regal "Keller links" an Position 0 / 0 mit Drehung 0
    Wenn ich das Regal "Keller links" aus dem Raum nehme
    Dann ist das Regal "Keller links" nicht platziert
    Und hat das Regal "Keller links" 2 belegte und 28 freie Fächer

  Szenario: Fremdes Regal platzieren
    Angenommen ich habe ein Regal "Annas Regal" mit Höhe 3 und Breite 3
    Und ich bin als "ben" angemeldet
    Wenn ich das Regal "Annas Regal" an Position 0 / 0 mit Drehung 0 setze
    Dann wird die Aktion abgelehnt mit "nicht gefunden"

  # ----- Regalmaße und Löschen -----

  Szenario: Regal verbreitern stößt an die Wand
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich setze das Regal "Keller links" an Position 328 / 0 mit Drehung 0
    Wenn ich die Maße von "Keller links" auf Höhe 5 und Breite 8 ändere
    Dann wird die Aktion als Konflikt abgelehnt
    Und hat das Regal "Keller links" die Breite 6

  Szenario: Regal löschen gibt den Platz frei
    Angenommen ich habe ein Regal "A" mit Höhe 5 und Breite 6
    Und ich habe ein Regal "B" mit Höhe 5 und Breite 6
    Und ich setze das Regal "A" an Position 0 / 0 mit Drehung 0
    Wenn ich das Regal "A" lösche
    Und ich das Regal "B" an Position 0 / 0 mit Drehung 0 setze
    Dann steht das Regal "B" an Position 0 / 0 mit Drehung 0

  # ----- Anzeige -----

  Szenario: Raum mit platziertem und nicht platziertem Regal
    Angenommen ich habe ein Regal "A" mit Höhe 5 und Breite 6
    Und ich habe ein Regal "B" mit Höhe 2 und Breite 2
    Und ich setze das Regal "A" an Position 0 / 0 mit Drehung 0
    Wenn ich den Kellerraum abrufe
    Dann zeigt der Raum die platzierten Regale "A"
    Und zeigt der Raum die nicht platzierten Regale "B"

  Szenario: Belegung nach Weintyp
    Angenommen ich habe einen Rotwein "Zweigelt" und einen Weißwein "Riesling"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und von "Zweigelt" liegen 3 Flaschen in "Keller links"
    Und von "Riesling" liegen 1 Flaschen in "Keller links"
    Wenn ich den Kellerraum abrufe
    Dann zeigt das Regal "Keller links" im Raum 4 belegte Fächer, davon 3 Rotwein und 1 Weißwein

  Szenario: Kellerraum ist privat
    Angenommen ich habe ein Regal "Annas Regal" mit Höhe 3 und Breite 3
    Und ich setze das Regal "Annas Regal" an Position 0 / 0 mit Drehung 0
    Und ich bin als "ben" angemeldet
    Wenn ich den Kellerraum abrufe
    Dann zeigt der Raum keine Regale
