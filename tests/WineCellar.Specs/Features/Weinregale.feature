# language: de
Funktionalität: Weinregale
  Als Weinsammler möchte ich meine Regale mit Reihen und Spalten abbilden und jede Flasche in ein Fach legen,
  damit ich freie Plätze finde und eine Flasche gezielt wiederfinde.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  # ----- Regale verwalten -----

  Szenario: Regal mit 5 Reihen und 6 Spalten
    Wenn ich ein Regal "Keller links" mit Höhe 5 und Breite 6 anlege
    Dann existiert das Regal "Keller links" mit einer Kapazität von 30 Fächern
    Und hat das Regal "Keller links" 0 belegte und 30 freie Fächer

  Szenariogrundriss: Ungültige Maße
    Wenn ich ein Regal "Falsch" mit Höhe <Höhe> und Breite <Breite> anlege
    Dann wird die Aktion abgelehnt mit "<Hinweis>"
    Und gibt es kein Regal "Falsch"

    Beispiele:
      | Höhe | Breite | Hinweis |
      | 0    | 6      | Höhe    |
      | 5    | 0      | Breite  |
      | -1   | 6      | Höhe    |
      | 51   | 6      | Höhe    |
      | 5    | 51     | Breite  |

  Szenario: Name fehlt
    Wenn ich ein Regal "   " mit Höhe 5 und Breite 6 anlege
    Dann wird die Aktion abgelehnt mit "leer"

  Szenario: Doppelter Name beim Anlegen
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich ein Regal "keller links " mit Höhe 2 und Breite 2 anlege
    Dann wird die Aktion als Konflikt abgelehnt

  Szenario: Doppelter Name beim Umbenennen
    Angenommen ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich habe ein Regal "Keller rechts" mit Höhe 5 und Breite 6
    Wenn ich das Regal "Keller rechts" in "KELLER LINKS" umbenenne
    Dann wird die Aktion als Konflikt abgelehnt

  Szenario: Fremdes Regal
    Angenommen ich habe ein Regal "Annas Regal" mit Höhe 3 und Breite 3
    Und ich bin als "ben" angemeldet
    Dann gibt es kein Regal "Annas Regal"
    Wenn ich das Regal "Annas Regal" abrufe
    Dann wird die Aktion abgelehnt mit "nicht gefunden"
    Wenn ich das Regal "Annas Regal" lösche
    Dann wird die Aktion abgelehnt mit "nicht gefunden"

  Szenario: Belegung in der Übersicht
    Angenommen mein Keller enthält 4 Flaschen "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich habe ein Regal "Gang" mit Höhe 1 und Breite 4
    Und von "Zweigelt" liegen 4 Flaschen in "Keller links"
    Dann zeigt meine Regalliste "Gang, Keller links"
    Und hat das Regal "Keller links" 4 belegte und 26 freie Fächer

  Szenario: Vergrößern
    Angenommen mein Keller enthält 2 Flaschen "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 5, Spalte 6 liegt eine Flasche "Zweigelt"
    Wenn ich die Maße von "Keller links" auf Höhe 6 und Breite 6 ändere
    Dann existiert das Regal "Keller links" mit einer Kapazität von 36 Fächern
    Und ist "Keller links" Reihe 5, Spalte 6 mit "Zweigelt" belegt

  Szenario: Verkleinern mit belegtem Randfach
    Angenommen mein Keller enthält 2 Flaschen "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 5, Spalte 6 liegt eine Flasche "Zweigelt"
    Wenn ich die Maße von "Keller links" auf Höhe 4 und Breite 6 ändere
    Dann wird die Aktion abgelehnt mit "Reihe 5, Spalte 6"
    Und existiert das Regal "Keller links" mit einer Kapazität von 30 Fächern

  Szenario: Verkleinern ohne betroffene Fächer
    Angenommen mein Keller enthält 2 Flaschen "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 2, Spalte 2 liegt eine Flasche "Zweigelt"
    Wenn ich die Maße von "Keller links" auf Höhe 4 und Breite 5 ändere
    Dann existiert das Regal "Keller links" mit einer Kapazität von 20 Fächern

  Szenario: Volles Regal löschen
    Angenommen mein Keller enthält 3 Flaschen "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und von "Zweigelt" liegen 3 Flaschen in "Keller links"
    Wenn ich das Regal "Keller links" lösche
    Dann gibt es kein Regal "Keller links"
    Und enthält mein Keller 3 Flaschen "Zweigelt"
    Und sind von "Zweigelt" 0 Flaschen eingelagert und 3 nicht eingelagert

  # ----- Fachbelegung -----

  Szenario: Belegtes und freies Fach
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 2, Spalte 3 liegt eine Flasche "Sassicaia"
    Dann ist "Keller links" Reihe 2, Spalte 3 mit "Sassicaia" belegt
    Und hat das Regal "Keller links" 1 belegte und 29 freie Fächer

  Szenario: Flasche einlagern
    Angenommen mein Keller enthält 3 Flaschen "Blaufränkisch"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich eine Flasche "Blaufränkisch" in "Keller links" Reihe 1, Spalte 1 lege
    Dann ist "Keller links" Reihe 1, Spalte 1 mit "Blaufränkisch" belegt
    Und sind von "Blaufränkisch" 1 Flasche eingelagert und 2 nicht eingelagert

  Szenario: Fach bereits belegt
    Angenommen mein Keller enthält 3 Flaschen "Blaufränkisch"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Blaufränkisch"
    Wenn ich eine Flasche "Blaufränkisch" in "Keller links" Reihe 1, Spalte 1 lege
    Dann wird die Aktion als Konflikt abgelehnt
    Und sind von "Blaufränkisch" 1 Flasche eingelagert und 2 nicht eingelagert

  Szenariogrundriss: Fach außerhalb des Regals
    Angenommen mein Keller enthält 3 Flaschen "Blaufränkisch"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich eine Flasche "Blaufränkisch" in "Keller links" Reihe <Reihe>, Spalte <Spalte> lege
    Dann wird die Aktion abgelehnt mit "außerhalb"

    Beispiele:
      | Reihe | Spalte |
      | 6     | 1      |
      | 1     | 7      |
      | 0     | 1      |

  Szenario: Keine Flasche mehr übrig
    Angenommen mein Keller enthält 2 Flaschen "Merlot"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und von "Merlot" liegen 2 Flaschen in "Keller links"
    Wenn ich eine Flasche "Merlot" in "Keller links" Reihe 5, Spalte 6 lege
    Dann wird die Aktion abgelehnt mit "bereits eingelagert"
    Und ist "Keller links" Reihe 5, Spalte 6 frei

  Szenario: Fremder Wein in eigenes Regal
    Angenommen mein Keller enthält 1 Flasche "Annas Wein"
    Und ich bin als "ben" angemeldet
    Und ich habe ein Regal "Bens Regal" mit Höhe 2 und Breite 2
    Wenn ich eine Flasche "Annas Wein" in "Bens Regal" Reihe 1, Spalte 1 lege
    Dann wird die Aktion abgelehnt mit "nicht gefunden"

  Szenario: In anderes Regal umlagern
    Angenommen mein Keller enthält 1 Flasche "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und ich habe ein Regal "Keller rechts" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Zweigelt"
    Wenn ich die Flasche aus "Keller links" Reihe 1, Spalte 1 nach "Keller rechts" Reihe 3, Spalte 2 verschiebe
    Dann ist "Keller rechts" Reihe 3, Spalte 2 mit "Zweigelt" belegt
    Und ist "Keller links" Reihe 1, Spalte 1 frei

  Szenario: Im selben Regal umlagern
    Angenommen mein Keller enthält 1 Flasche "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Zweigelt"
    Wenn ich die Flasche aus "Keller links" Reihe 1, Spalte 1 nach "Keller links" Reihe 4, Spalte 4 verschiebe
    Dann ist "Keller links" Reihe 4, Spalte 4 mit "Zweigelt" belegt
    Und ist "Keller links" Reihe 1, Spalte 1 frei

  Szenario: Ziel belegt
    Angenommen mein Keller enthält 1 Flasche "Zweigelt"
    Und mein Keller enthält 1 Flasche "Riesling"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Zweigelt"
    Und in "Keller links" Reihe 1, Spalte 2 liegt eine Flasche "Riesling"
    Wenn ich die Flasche aus "Keller links" Reihe 1, Spalte 1 nach "Keller links" Reihe 1, Spalte 2 verschiebe
    Dann wird die Aktion als Konflikt abgelehnt
    Und ist "Keller links" Reihe 1, Spalte 1 mit "Zweigelt" belegt
    Und ist "Keller links" Reihe 1, Spalte 2 mit "Riesling" belegt

  Szenario: Auslagern
    Angenommen mein Keller enthält 2 Flaschen "Riesling"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 4 liegt eine Flasche "Riesling"
    Wenn ich die Flasche aus "Keller links" Reihe 1, Spalte 4 herausnehme
    Dann ist "Keller links" Reihe 1, Spalte 4 frei
    Und enthält mein Keller 2 Flaschen "Riesling"
    Und sind von "Riesling" 0 Flaschen eingelagert und 2 nicht eingelagert

  Szenario: Flasche aus Fach trinken
    Angenommen mein Keller enthält 2 Flaschen "Chianti"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 2, Spalte 2 liegt eine Flasche "Chianti"
    Wenn ich die Flasche aus "Keller links" Reihe 2, Spalte 2 trinke
    Dann ist "Keller links" Reihe 2, Spalte 2 frei
    Und enthält mein Keller 1 Flasche "Chianti"
    Und das Archiv enthält einen Eintrag "Getrunken" für "Chianti"

  # ----- Bestehende Abläufe -----

  Szenario: Genug nicht eingelagerte Flaschen
    Angenommen mein Keller enthält 3 Flaschen "Grüner Veltliner"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Grüner Veltliner"
    Wenn ich 2 Flaschen "Grüner Veltliner" an "Max" verschenke
    Dann ist "Keller links" Reihe 1, Spalte 1 mit "Grüner Veltliner" belegt
    Und werden keine Fächer als freigegeben gemeldet

  Szenario: Fächer müssen freigegeben werden
    Angenommen mein Keller enthält 3 Flaschen "Grüner Veltliner"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 2 liegt eine Flasche "Grüner Veltliner"
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Grüner Veltliner"
    Wenn ich 2 Flaschen "Grüner Veltliner" trinke
    Dann enthält mein Keller 1 Flasche "Grüner Veltliner"
    Und ist "Keller links" Reihe 1, Spalte 1 frei
    Und werden als freigegeben gemeldet "Keller links – Reihe 1, Spalte 1"
    Und ist "Keller links" Reihe 1, Spalte 2 mit "Grüner Veltliner" belegt

  Szenario: Anzahl zu klein
    Angenommen mein Keller enthält 3 Flaschen "Merlot"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und von "Merlot" liegen 2 Flaschen in "Keller links"
    Wenn ich die Flaschenanzahl von "Merlot" auf 1 ändere
    Dann wird die Aktion abgelehnt mit "zuerst Flaschen aus den Fächern"
    Und enthält mein Keller 3 Flaschen "Merlot"

  Szenario: Anzahl auf eingelagerte Anzahl senken
    Angenommen mein Keller enthält 3 Flaschen "Merlot"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und von "Merlot" liegen 2 Flaschen in "Keller links"
    Wenn ich die Flaschenanzahl von "Merlot" auf 2 ändere
    Dann enthält mein Keller 2 Flaschen "Merlot"
    Und sind von "Merlot" 2 Flaschen eingelagert und 0 nicht eingelagert

  Szenario: Rückgängig nach Trinken aus dem Fach
    Angenommen mein Keller enthält 1 Flasche "Barolo"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Barolo"
    Wenn ich die Flasche aus "Keller links" Reihe 1, Spalte 1 trinke
    Und ich den Archiveintrag für "Barolo" rückgängig mache
    Dann enthält mein Keller 1 Flasche "Barolo"
    Und sind von "Barolo" 0 Flaschen eingelagert und 1 nicht eingelagert
    Und ist "Keller links" Reihe 1, Spalte 1 frei

  Szenario: Wein mit eingelagerten Flaschen
    Angenommen mein Keller enthält 4 Flaschen "Sassicaia"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 2 liegt eine Flasche "Sassicaia"
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Sassicaia"
    Dann zeigt der Wein "Sassicaia" die Fächer "Keller links – Reihe 1, Spalte 1; Keller links – Reihe 1, Spalte 2"
    Und sind von "Sassicaia" 2 Flaschen eingelagert und 2 nicht eingelagert

  Szenario: Gelöschter Wein im Regal
    Angenommen mein Keller enthält 1 Flasche "Rosé"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Rosé"
    Wenn ich den Wein "Rosé" lösche
    Dann ist "Keller links" Reihe 1, Spalte 1 frei
