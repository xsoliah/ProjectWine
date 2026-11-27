# language: de
Funktionalität: Einlagerungsvorschlag
  Als Weinsammler möchte ich nach dem Hinzufügen eines Weins einen Vorschlag bekommen, wohin die Flaschen
  im Regal passen, und ihn mit einem Tipp übernehmen können, damit mein Keller geordnet bleibt.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  Szenario: Erstes Einlagern im leeren Regal
    Angenommen mein Keller enthält 2 Flaschen "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich einen Einlagerungsvorschlag für "Zweigelt" anfordere
    Dann lautet der Vorschlag "Keller links – Reihe 1, Spalte 1; Keller links – Reihe 1, Spalte 2"
    Und nennt die Begründung "noch keine Weine"

  Szenario: Gleicher Wein liegt zusammen
    Angenommen mein Keller enthält 3 Flaschen "Sassicaia"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Sassicaia"
    Und in "Keller links" Reihe 1, Spalte 2 liegt eine Flasche "Sassicaia"
    Wenn ich einen Einlagerungsvorschlag für "Sassicaia" anfordere
    Dann lautet der Vorschlag "Keller links – Reihe 1, Spalte 3"
    Und nennt die Begründung "Sassicaia"

  Szenario: Nicht eingelagerte Flaschen sind der Standard, mehr Flaschen als nötig werden gekürzt
    Angenommen mein Keller enthält 2 Flaschen "Barolo"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich einen Einlagerungsvorschlag für "Barolo" mit 5 Flaschen anfordere
    Dann lautet der Vorschlag "Keller links – Reihe 1, Spalte 1; Keller links – Reihe 1, Spalte 2"

  Szenario: Zu wenig freie Fächer
    Angenommen mein Keller enthält 3 Flaschen "Zweigelt"
    Und mein Keller enthält 2 Flaschen "Merlot"
    Und ich habe ein Regal "Klein" mit Höhe 1 und Breite 4
    Und in "Klein" Reihe 1, Spalte 1 liegt eine Flasche "Merlot"
    Und in "Klein" Reihe 1, Spalte 2 liegt eine Flasche "Merlot"
    Wenn ich einen Einlagerungsvorschlag für "Zweigelt" anfordere
    Dann lautet der Vorschlag "Klein – Reihe 1, Spalte 3; Klein – Reihe 1, Spalte 4"
    Und können 1 Flaschen nicht untergebracht werden

  Szenario: Vorschlag übernehmen
    Angenommen mein Keller enthält 3 Flaschen "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich einen Einlagerungsvorschlag für "Zweigelt" anfordere
    Und ich den Vorschlag übernehme
    Dann zeigt der Wein "Zweigelt" die Fächer "Keller links – Reihe 1, Spalte 1; Keller links – Reihe 1, Spalte 2; Keller links – Reihe 1, Spalte 3"
    Und sind von "Zweigelt" 3 Flaschen eingelagert und 0 nicht eingelagert

  Szenario: Der Vorschlag allein lagert nichts ein
    Angenommen mein Keller enthält 2 Flaschen "Zweigelt"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich einen Einlagerungsvorschlag für "Zweigelt" anfordere
    Dann sind von "Zweigelt" 0 Flaschen eingelagert und 2 nicht eingelagert

  Szenario: Fach inzwischen belegt
    Angenommen mein Keller enthält 3 Flaschen "Zweigelt"
    Und mein Keller enthält 1 Flasche "Merlot"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich einen Einlagerungsvorschlag für "Zweigelt" anfordere
    Und in der Zwischenzeit wird "Keller links" Reihe 1, Spalte 2 mit "Merlot" belegt
    Und ich den Vorschlag übernehme
    Dann wird die Aktion als Konflikt abgelehnt mit "bereits mit"
    Und sind von "Zweigelt" 0 Flaschen eingelagert und 3 nicht eingelagert
    Und ist "Keller links" Reihe 1, Spalte 1 frei

  Szenario: Nach einem Konflikt gibt es einen neuen Vorschlag
    Angenommen mein Keller enthält 2 Flaschen "Zweigelt"
    Und mein Keller enthält 1 Flasche "Merlot"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich einen Einlagerungsvorschlag für "Zweigelt" anfordere
    Und in der Zwischenzeit wird "Keller links" Reihe 1, Spalte 2 mit "Merlot" belegt
    Und ich einen Einlagerungsvorschlag für "Zweigelt" anfordere
    Dann lautet der Vorschlag "Keller links – Reihe 1, Spalte 3; Keller links – Reihe 1, Spalte 4"

  Szenario: Zu viele Flaschen
    Angenommen mein Keller enthält 2 Flaschen "Merlot"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Und in "Keller links" Reihe 1, Spalte 1 liegt eine Flasche "Merlot"
    Wenn ich versuche, 2 Flaschen "Merlot" in "Keller links" Reihe 2 ab Spalte 1 einzulagern
    Dann wird die Aktion abgelehnt mit "nur noch 1"
    Und sind von "Merlot" 1 Flasche eingelagert und 1 nicht eingelagert
    Und ist "Keller links" Reihe 2, Spalte 1 frei

  Szenario: Mehrere Flaschen in einer Aktion einlagern
    Angenommen mein Keller enthält 2 Flaschen "Merlot"
    Und ich habe ein Regal "Keller links" mit Höhe 5 und Breite 6
    Wenn ich versuche, 2 Flaschen "Merlot" in "Keller links" Reihe 2 ab Spalte 1 einzulagern
    Dann sind von "Merlot" 2 Flaschen eingelagert und 0 nicht eingelagert

  Szenario: Fremder Wein
    Angenommen mein Keller enthält 1 Flasche "Annas Riesling"
    Und ich bin als "ben" angemeldet
    Wenn ich einen Einlagerungsvorschlag für "Annas Riesling" anfordere
    Dann wird die Aktion abgelehnt mit "nicht gefunden"
