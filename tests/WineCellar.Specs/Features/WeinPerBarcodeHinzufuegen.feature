# language: de
Funktionalität: Wein per Barcode hinzufügen
  Als Weinsammler möchte ich Flaschen per Barcode erfassen,
  damit ich nicht alle Daten von Hand eintippen muss.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  Szenario: Unbekannter Barcode mit Treffer in der externen Datenbank
    Angenommen die externe Datenbank kennt den Barcode "3760123456789" als "Château Test 2019" von "Domaine Beispiel"
    Wenn ich den Barcode "3760123456789" nachschlage
    Dann erhalte ich einen Vorschlag mit dem Namen "Château Test 2019"
    Und der Vorschlag stammt aus der externen Datenbank

  Szenario: Unbekannter Barcode ohne Treffer
    Wenn ich den Barcode "4000000000000" nachschlage
    Dann wurde nichts gefunden

  Szenario: Barcode eines Weins, den ich schon im Keller habe
    Angenommen mein Keller enthält 2 Flaschen "Riesling Spätlese" mit dem Barcode "9001234567890"
    Wenn ich den Barcode "9001234567890" nachschlage
    Dann wird der vorhandene Wein "Riesling Spätlese" gefunden
    Wenn ich 3 Flaschen zum Wein "Riesling Spätlese" hinzufüge
    Dann enthält mein Keller 5 Flaschen "Riesling Spätlese"

  Szenario: Neuen Wein mit gescanntem Barcode anlegen
    Wenn ich den Wein "Zweigelt" mit dem Barcode "9001111111111" und 6 Flaschen anlege
    Dann enthält mein Keller 6 Flaschen "Zweigelt"

  Szenario: Derselbe Barcode kann nicht doppelt angelegt werden
    Angenommen mein Keller enthält 1 Flasche "Zweigelt" mit dem Barcode "9001111111111"
    Wenn ich den Wein "Zweigelt Reserve" mit dem Barcode "9001111111111" und 1 Flasche anlege
    Dann wird die Aktion abgelehnt mit "Barcode"

  Szenario: Ungültiger Barcode
    Wenn ich den Barcode "abc" nachschlage
    Dann wird die Aktion abgelehnt mit "Barcode"

  Szenario: Jeder Nutzer sieht nur seinen eigenen Keller
    Angenommen mein Keller enthält 2 Flaschen "Blaufränkisch"
    Und ich bin als "ben" angemeldet
    Dann zeigt die Kelleransicht keine Weine
