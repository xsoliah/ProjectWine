# language: de
Funktionalität: Trinkkurve
  Als Weinkenner möchte ich wissen, wann ein Wein am besten schmeckt und wie lange er rund um den Höhepunkt gut ist.
  Dafür hat jeder Wein einen optimalen Trinkzeitpunkt und eine Streuung; die Angaben werden bei der Erfassung geschätzt.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  # ----- Werte am Wein -----

  Szenario: Werte speichern
    Wenn ich den Wein "Barolo" mit Trinkzeitpunkt 2031 und Streuung 3 speichere
    Dann hat der Wein "Barolo" den Trinkzeitpunkt 2031 mit Streuung 3

  Szenario: Unvollständige Angabe
    Wenn ich den Wein "Barolo" mit Trinkzeitpunkt 2031 ohne Streuung speichere
    Dann wird die Aktion abgelehnt mit "gemeinsam"

  Szenariogrundriss: Ungültige Streuung
    Wenn ich den Wein "Barolo" mit Trinkzeitpunkt 2031 und Streuung <Streuung> speichere
    Dann wird die Aktion abgelehnt mit "Streuung"

    Beispiele:
      | Streuung |
      | 0        |
      | -2       |
      | 80       |

  Szenario: Trinkfenster bleibt unabhängig
    Wenn ich den Wein "Barolo" mit Trinkzeitpunkt 2031 und Streuung 3 speichere
    Dann hat der Wein "Barolo" kein Trinkfenster

  # ----- Erfassung -----

  Szenario: Entwurf mit Trinkkurve
    Angenommen der Agent ermittelt den Trinkzeitpunkt 2031 mit Streuung 3 aus dem Web
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann zeigt der Entwurf den Trinkzeitpunkt 2031 mit Streuung 3 aus dem Web
    Wenn ich den Entwurf mit seinen Trinkwerten als Wein "Barolo" speichere
    Dann hat der Wein "Barolo" den Trinkzeitpunkt 2031 mit Streuung 3

  Szenario: Geschätzt statt belegt
    Angenommen der Agent ermittelt den Trinkzeitpunkt 2031 mit Streuung 3 geschätzt
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann zeigt der Entwurf den Trinkzeitpunkt 2031 mit Streuung 3 geschätzt

  Szenario: Aus dem Fenster abgeleitet
    Angenommen der Agent erkennt:
      | Feld      | Wert      | Herkunft |
      | Trinkreif | 2026-2034 | Web      |
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann zeigt der Entwurf den Trinkzeitpunkt 2030 mit Streuung 2 abgeleitet

  Szenario: Unplausible Werte
    Angenommen der Agent erkennt:
      | Feld     | Wert      | Herkunft |
      | Jahrgang | 2020      | Etikett  |
    Und der Agent ermittelt den Trinkzeitpunkt 1850 mit Streuung 3 aus dem Web
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf keinen Trinkzeitpunkt und keine Streuung

  Szenario: Streuung außerhalb der Grenzen
    Angenommen der Agent ermittelt den Trinkzeitpunkt 2031 mit Streuung 0,1 aus dem Web
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf keinen Trinkzeitpunkt und keine Streuung

  # ----- Nachschätzen -----

  Szenario: Schätzung für Bestandswein
    Angenommen ich habe den Wein "Barolo" mit 2 Flaschen
    Und der Agent ermittelt den Trinkzeitpunkt 2031 mit Streuung 4 geschätzt
    Wenn ich bei "Barolo" "Trinkzeitpunkt schätzen" wähle
    Dann hat der Wein "Barolo" den Trinkzeitpunkt 2031 mit Streuung 4
    Und der Agent hat die Daten von "Barolo" ohne Foto erhalten
    Und ich habe heute 1 Recherchen verbraucht

  Szenario: Tageslimit erreicht
    Angenommen ich habe den Wein "Barolo" mit 2 Flaschen
    Und das Tageslimit ist 2 und ich habe heute 2 Recherchen gestartet
    Wenn ich bei "Barolo" "Trinkzeitpunkt schätzen" wähle
    Dann wird die Aktion abgelehnt mit "Limit"
    Und der Wein "Barolo" hat keine Trinkkurve

  Szenario: Nichts gefunden
    Angenommen ich habe den Wein "Barolo" mit 2 Flaschen
    Wenn ich bei "Barolo" "Trinkzeitpunkt schätzen" wähle
    Dann wird die Aktion abgelehnt mit "ermittelt"
    Und der Wein "Barolo" hat keine Trinkkurve

  Szenario: Foto-Erfassung nicht verfügbar
    Angenommen ich habe den Wein "Barolo" mit 2 Flaschen
    Und der Server hat keinen API-Schlüssel für den KI-Dienst
    Wenn ich bei "Barolo" "Trinkzeitpunkt schätzen" wähle
    Dann wird die Aktion abgelehnt mit "nicht"
