# language: de
Funktionalität: Kellerraum – Tür und Regalhöhe
  Als Weinsammler möchte ich im Kellerraum eine Tür festlegen und Regale auf eine Höhe über dem Boden stellen,
  damit ich mich im Raum leichter orientiere und Regale auf Podesten abbilden kann.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  # ----- Tür -----

  Szenario: Tür setzen
    Wenn ich eine Tür an der Wand "vorne" mit Abstand 150 cm setze
    Dann hat der Raum eine Tür an der Wand "vorne" mit Abstand 150 cm

  Szenario: Raum ohne Tür
    Wenn ich den Kellerraum abrufe
    Dann hat der Raum keine Tür

  Szenario: Tür verschieben
    Angenommen ich setze eine Tür an der Wand "hinten" mit Abstand 50 cm
    Wenn ich eine Tür an der Wand "rechts" mit Abstand 100 cm setze
    Dann hat der Raum eine Tür an der Wand "rechts" mit Abstand 100 cm

  Szenario: Tür passt nicht in die Wand
    Angenommen ich setze eine Tür an der Wand "hinten" mit Abstand 50 cm
    Wenn ich eine Tür an der Wand "vorne" mit Abstand 330 cm setze
    Dann wird die Aktion als Konflikt abgelehnt
    Und wird die Aktion abgelehnt mit "Tür"
    Und hat der Raum eine Tür an der Wand "hinten" mit Abstand 50 cm

  Szenario: Ungültige Wand
    Wenn ich eine Tür an der Wand "oben" mit Abstand 10 cm setze
    Dann wird die Aktion abgelehnt mit "Wand"
    Und hat der Raum keine Tür

  Szenario: Tür entfernen
    Angenommen ich setze eine Tür an der Wand "links" mit Abstand 20 cm
    Wenn ich die Tür entferne
    Dann hat der Raum keine Tür

  Szenario: Raum verkleinern schließt die Tür aus
    Angenommen ich setze eine Tür an der Wand "vorne" mit Abstand 300 cm
    Wenn ich die Raummaße auf 300 x 300 x 250 cm speichere
    Dann wird die Aktion als Konflikt abgelehnt
    Und wird die Aktion abgelehnt mit "Tür"
    Und misst der Raum 400 x 300 x 250 cm

  Szenario: Tür ist privat
    Angenommen ich setze eine Tür an der Wand "vorne" mit Abstand 150 cm
    Und ich bin als "ben" angemeldet
    Wenn ich den Kellerraum abrufe
    Dann hat der Raum keine Tür

  # ----- Höhe über dem Boden -----

  Szenario: Regal anheben
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich setze das Regal "Keller links" an Position 50 / 20 mit Drehung 0
    Wenn ich das Regal "Keller links" an Position 50 / 20 mit Drehung 0 auf 40 cm Höhe setze
    Dann steht das Regal "Keller links" an Position 50 / 20 mit Drehung 0
    Und steht das Regal "Keller links" 40 cm über dem Boden

  Szenario: Regal steht standardmäßig auf dem Boden
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich setze das Regal "Keller links" an Position 50 / 20 mit Drehung 0
    Dann steht das Regal "Keller links" 0 cm über dem Boden

  Szenario: Zu hoch für den Raum
    Angenommen ich habe ein Regal "Hoch" mit Höhe 10 und Breite 3
    Und ich setze das Regal "Hoch" an Position 0 / 0 mit Drehung 0
    Wenn ich das Regal "Hoch" an Position 0 / 0 mit Drehung 0 auf 150 cm Höhe setze
    Dann wird die Aktion als Konflikt abgelehnt
    Und wird die Aktion abgelehnt mit "Hoch"
    Und steht das Regal "Hoch" 0 cm über dem Boden

  Szenariogrundriss: Ungültige Höhe
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich das Regal "Keller links" an Position 0 / 0 mit Drehung 0 auf <Höhe> cm Höhe setze
    Dann wird die Aktion abgelehnt mit "Höhe"
    Und ist das Regal "Keller links" nicht platziert

    Beispiele:
      | Höhe |
      | -5   |
      | 250  |

  Szenario: Raum abgesenkt
    Angenommen ich habe ein Regal "Keller links" mit Höhe 10 und Breite 6
    Und ich setze das Regal "Keller links" an Position 0 / 0 mit Drehung 0 auf 40 cm Höhe
    Wenn ich die Raummaße auf 400 x 300 x 150 cm speichere
    Dann wird die Aktion als Konflikt abgelehnt
    Und wird die Aktion abgelehnt mit "Keller links"

  Szenario: Erhöhtes Regal vergrößern
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich setze das Regal "Keller links" an Position 0 / 0 mit Drehung 0 auf 180 cm Höhe
    Wenn ich die Maße von "Keller links" auf Höhe 8 und Breite 6 ändere
    Dann wird die Aktion als Konflikt abgelehnt
    Und hat das Regal "Keller links" die Breite 6

  Szenario: Regal aus dem Raum nehmen setzt die Höhe zurück
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich setze das Regal "Keller links" an Position 0 / 0 mit Drehung 0 auf 40 cm Höhe
    Wenn ich das Regal "Keller links" aus dem Raum nehme
    Und ich das Regal "Keller links" an Position 0 / 0 mit Drehung 0 setze
    Dann steht das Regal "Keller links" 0 cm über dem Boden

  Szenario: Höhe bleibt beim Verschieben
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich setze das Regal "Keller links" an Position 0 / 0 mit Drehung 0 auf 40 cm Höhe
    Wenn ich das Regal "Keller links" an Position 100 / 50 mit Drehung 0 auf 40 cm Höhe setze
    Dann steht das Regal "Keller links" an Position 100 / 50 mit Drehung 0
    Und steht das Regal "Keller links" 40 cm über dem Boden

  Szenario: Höhe eines fremden Regals
    Angenommen ich habe ein Regal "Annas Regal" mit Höhe 3 und Breite 3
    Und ich setze das Regal "Annas Regal" an Position 0 / 0 mit Drehung 0
    Und ich bin als "ben" angemeldet
    Wenn ich das Regal "Annas Regal" an Position 0 / 0 mit Drehung 0 auf 40 cm Höhe setze
    Dann wird die Aktion abgelehnt mit "nicht gefunden"
