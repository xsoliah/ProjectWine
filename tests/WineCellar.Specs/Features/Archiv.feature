# language: de
Funktionalität: Archiv für getrunkene, verkaufte und verschenkte Weine
  Als Weinsammler möchte ich nachvollziehen können, was mit meinen Flaschen passiert ist.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  Szenario: Eine Flasche trinken
    Angenommen mein Keller enthält 3 Flaschen "Blaufränkisch"
    Wenn ich 1 Flasche "Blaufränkisch" trinke
    Dann enthält mein Keller 2 Flaschen "Blaufränkisch"
    Und das Archiv enthält einen Eintrag "Getrunken" für "Blaufränkisch"

  Szenario: Flaschen verkaufen
    Angenommen mein Keller enthält 6 Flaschen "Grüner Veltliner"
    Wenn ich 2 Flaschen "Grüner Veltliner" für 24,50 € an "Weinhandlung Müller" verkaufe
    Dann enthält mein Keller 4 Flaschen "Grüner Veltliner"
    Und das Archiv enthält einen Eintrag "Verkauft" für "Grüner Veltliner"

  Szenario: Flaschen verschenken
    Angenommen mein Keller enthält 3 Flaschen "Sekt Rosé"
    Wenn ich 1 Flasche "Sekt Rosé" an "Tante Gerda" verschenke
    Dann enthält mein Keller 2 Flaschen "Sekt Rosé"
    Und das Archiv enthält einen Eintrag "Verschenkt" für "Sekt Rosé"

  Szenario: Mehr Flaschen entnehmen als vorhanden sind
    Angenommen mein Keller enthält 2 Flaschen "Merlot"
    Wenn ich 3 Flaschen "Merlot" trinke
    Dann wird die Aktion abgelehnt mit "Keller"
    Und enthält mein Keller 2 Flaschen "Merlot"
    Und das Archiv enthält 0 Einträge

  Szenario: Ausgetrunkener Wein verschwindet aus dem Keller, bleibt aber im Archiv
    Angenommen mein Keller enthält 1 Flasche "Chardonnay"
    Wenn ich 1 Flasche "Chardonnay" trinke
    Dann zeigt die Kelleransicht keine Weine
    Und das Archiv enthält 1 Eintrag

  Szenario: Archiv nach Art filtern
    Angenommen mein Keller enthält 5 Flaschen "Zweigelt"
    Wenn ich 1 Flasche "Zweigelt" trinke
    Und ich 1 Flasche "Zweigelt" an "Max" verschenke
    Dann zeigt das Archiv gefiltert nach "Verschenkt" genau 1 Eintrag
    Und zeigt das Archiv gefiltert nach "Getrunken" genau 1 Eintrag

  Szenario: Archiveintrag rückgängig machen
    Angenommen mein Keller enthält 3 Flaschen "Blaufränkisch"
    Wenn ich 2 Flaschen "Blaufränkisch" trinke
    Und ich den Archiveintrag für "Blaufränkisch" rückgängig mache
    Dann enthält mein Keller 3 Flaschen "Blaufränkisch"
    Und das Archiv enthält 0 Einträge
