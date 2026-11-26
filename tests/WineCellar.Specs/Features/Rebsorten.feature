# language: de
Funktionalität: Rebsorten
  Als Weinsammler möchte ich die Rebsorten meiner Weine aus einer eigenen Liste wählen,
  damit ich sehe, welche Weine rebsortenrein und welche Cuvées sind.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  Szenario: Neue Rebsorte
    Wenn ich die Rebsorte "Sangiovese" anlege
    Dann erscheint "Sangiovese" in meiner Rebsortenliste

  Szenario: Doppelte Rebsorte
    Angenommen ich habe die Rebsorte "Spätburgunder"
    Wenn ich die Rebsorte "spätburgunder " anlege
    Dann wird die Aktion als Konflikt abgelehnt

  Szenario: Leerer Name
    Wenn ich die Rebsorte "  " anlege
    Dann wird die Aktion abgelehnt mit "leer"

  Szenario: Rebsorten anderer Nutzer sind nicht sichtbar
    Angenommen ich habe die Rebsorte "Furmint"
    Und ich bin als "ben" angemeldet
    Dann enthält meine Rebsortenliste nicht "Furmint"
    Wenn ich einem Wein "Tokajer" die Rebsorte "Furmint" zuweise
    Dann wird die Aktion abgelehnt mit "nicht gefunden"

  Szenario: Rebsortenliste mit Verwendung
    Angenommen der Wein "Wein1" hat die Rebsorte "Merlot"
    Und der Wein "Wein2" hat die Rebsorte "Merlot"
    Und ich habe die Rebsorte "Cabernet Franc"
    Dann zeigt meine Rebsortenliste "Cabernet Franc (0), Merlot (2)"

  Szenario: Mehrere Rebsorten in Reihenfolge
    Wenn ich einen Wein "Sassicaia" mit den Rebsorten "Cabernet Sauvignon" und "Cabernet Franc" speichere
    Dann zeigt der Wein "Sassicaia" die Rebsorten "Cabernet Sauvignon, Cabernet Franc"
    Und ist der Wein "Sassicaia" eine Cuvée

  Szenario: Ohne Rebsorte
    Wenn ich einen Wein "Hauswein" ohne Rebsorte speichere
    Dann hat der Wein "Hauswein" keine Rebsorten
    Und ist der Wein "Hauswein" weder rebsortenrein noch Cuvée

  Szenario: Rebsorte doppelt
    Wenn ich einen Wein "Merlot" mit den Rebsorten "Merlot" und "Merlot" speichere
    Dann wird die Aktion abgelehnt mit "nur einmal"

  Szenario: Anteile angeben
    Wenn ich einen Wein "Sassicaia" mit den Rebsorten "Cabernet Sauvignon" 85 % und "Cabernet Franc" 15 % speichere
    Dann zeigt der Wein "Sassicaia" die Rebsorten "Cabernet Sauvignon 85 %, Cabernet Franc 15 %"

  Szenario: Anteile über 100 Prozent
    Wenn ich einen Wein "Bordeaux" mit den Rebsorten "Merlot" 70 % und "Cabernet Franc" 40 % speichere
    Dann wird die Aktion abgelehnt mit "höchstens 100 %"

  Szenariogrundriss: Ungültiger Anteil
    Wenn ich einen Wein "Test" mit der Rebsorte "Merlot" <Anteil> % speichere
    Dann wird die Aktion abgelehnt mit "zwischen 1 und 100"

    Beispiele:
      | Anteil |
      | 0      |
      | 120    |

  Szenario: Rebsortenrein
    Wenn ich einen Wein "Riesling Kabinett" nur mit der Rebsorte "Riesling" speichere
    Dann ist der Wein "Riesling Kabinett" rebsortenrein

  Szenario: Cuvée aus zwei Rebsorten
    Wenn ich einen Wein "Bordeaux" mit den Rebsorten "Cabernet Sauvignon" und "Merlot" speichere
    Dann ist der Wein "Bordeaux" eine Cuvée

  Szenario: Aus Cuvée wird rebsortenrein
    Angenommen der Wein "Hauscuvée" hat die Rebsorten "Zweigelt" und "Blaufränkisch"
    Wenn ich bei "Hauscuvée" die Rebsorte "Blaufränkisch" entferne
    Dann ist "Hauscuvée" rebsortenrein

  Szenario: Suche nach Rebsorte
    Angenommen der Wein "Sassicaia" hat die Rebsorten "Cabernet Sauvignon" und "Cabernet Franc"
    Und der Wein "Barolo" hat die Rebsorte "Nebbiolo"
    Wenn ich im Keller nach "franc" suche
    Dann finde ich "Sassicaia", aber nicht "Barolo"

  Szenario: Barcode-Vorschlag mit bekannter und unbekannter Rebsorte
    Angenommen ich habe die Rebsorte "Merlot"
    Und die externe Datenbank kennt den Barcode "7804320000000" als "Casillero" mit den Rebsorten "Merlot / Carménère"
    Wenn ich den Barcode "7804320000000" nachschlage
    Dann ist im Vorschlag die Rebsorte "Merlot" zugeordnet
    Und wird "Carménère" als neue Rebsorte vorgeschlagen

  Szenariogrundriss: Trennregel für Rebsorten-Texte
    Dann zerlegt die Trennregel "<Text>" in "<Rebsorten>"

    Beispiele:
      | Text                               | Rebsorten                             |
      | Cabernet Sauvignon, Cabernet Franc | Cabernet Sauvignon \| Cabernet Franc |
      | Merlot / Carménère                 | Merlot \| Carménère                  |
      | Zweigelt und Blaufränkisch         | Zweigelt \| Blaufränkisch            |
      | merlot;Merlot                      | merlot                                |
      | Grenache & Syrah,                  | Grenache \| Syrah                    |

  Szenario: Umbenennen
    Angenommen der Wein "Wein1" hat die Rebsorte "Pinot Nero"
    Und der Wein "Wein2" hat die Rebsorte "Pinot Nero"
    Wenn ich die Rebsorte "Pinot Nero" in "Pinot Noir" umbenenne
    Dann zeigt der Wein "Wein1" die Rebsorten "Pinot Noir"
    Und zeigt der Wein "Wein2" die Rebsorten "Pinot Noir"

  Szenario: Zusammenführen
    Angenommen der Wein "Wein A" hat die Rebsorte "Spätburgunder"
    Und der Wein "Wein B" hat die Rebsorte "Pinot Noir"
    Wenn ich die Rebsorte "Spätburgunder" in "Pinot Noir" zusammenführe
    Dann zeigt der Wein "Wein A" die Rebsorten "Pinot Noir"
    Und zeigt der Wein "Wein B" die Rebsorten "Pinot Noir"
    Und gibt es keine Rebsorte "Spätburgunder"

  Szenario: Zusammenführen bei einem Wein mit beiden Rebsorten
    Angenommen der Wein "Wein C" hat die Rebsorten "Spätburgunder" 60 % und "Pinot Noir" 20 %
    Wenn ich die Rebsorte "Spätburgunder" in "Pinot Noir" zusammenführe
    Dann zeigt der Wein "Wein C" die Rebsorten "Pinot Noir 80 %"
    Und ist "Wein C" rebsortenrein

  Szenario: Verwendete Rebsorte löschen
    Angenommen der Wein "Bordeaux" hat die Rebsorte "Merlot"
    Wenn ich die Rebsorte "Merlot" lösche
    Dann wird die Aktion als Konflikt abgelehnt mit "1 Wein"

  Szenario: Unbenutzte Rebsorte löschen
    Angenommen ich habe die Rebsorte "Cabernet Franc"
    Wenn ich die Rebsorte "Cabernet Franc" lösche
    Dann gibt es keine Rebsorte "Cabernet Franc"
