# language: de
Funktionalität: Getrunkene Weine bewerten
  Als Weinsammler möchte ich getrunkene Weine bewerten und Notizen festhalten,
  damit ich später weiß, welche Weine ich nachkaufen möchte.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  Szenario: Beim Trinken direkt bewerten
    Angenommen mein Keller enthält 2 Flaschen "St. Laurent"
    Wenn ich 1 Flasche "St. Laurent" trinke und mit 4,5 Sternen bewerte und anmerke "Elegant, langer Abgang"
    Dann hat der Archiveintrag für "St. Laurent" die Bewertung 4,5
    Und die Notiz des Archiveintrags für "St. Laurent" lautet "Elegant, langer Abgang"

  Szenario: Nachträglich bewerten
    Angenommen mein Keller enthält 1 Flasche "Welschriesling"
    Wenn ich 1 Flasche "Welschriesling" trinke
    Und ich den Archiveintrag für "Welschriesling" nachträglich mit 3 Sternen bewerte
    Dann hat der Archiveintrag für "Welschriesling" die Bewertung 3

  Szenario: Verkaufte Weine können nicht bewertet werden
    Angenommen mein Keller enthält 2 Flaschen "Cabernet"
    Wenn ich 1 Flasche "Cabernet" für 15 € an "Weinhandlung Müller" verkaufe
    Und ich den Archiveintrag für "Cabernet" nachträglich mit 4 Sternen bewerte
    Dann wird die Aktion abgelehnt mit "Bewertung"

  Szenario: Bewertung nur in Halbschritten von 0,5 bis 5 Sternen
    Angenommen mein Keller enthält 2 Flaschen "Pinot Noir"
    Wenn ich 1 Flasche "Pinot Noir" trinke und mit 5,5 Sternen bewerte und anmerke "zu gut"
    Dann wird die Aktion abgelehnt mit "Bewertung"
    Und enthält mein Keller 2 Flaschen "Pinot Noir"

  Szenario: Mit Hammer bewerten
    Angenommen mein Keller enthält 2 Flaschen "Barolo"
    Wenn ich 1 Flasche "Barolo" trinke und mit "Hammer" bewerte
    Dann hat der Archiveintrag für "Barolo" die Bewertung "Hammer"

  Szenario: Nachträglich mit Top bewerten
    Angenommen mein Keller enthält 1 Flasche "Riesling"
    Wenn ich 1 Flasche "Riesling" trinke
    Und ich den Archiveintrag für "Riesling" nachträglich mit "Top" bewerte
    Dann hat der Archiveintrag für "Riesling" die Bewertung "Top"

  Szenario: Bestehende Bewertung bleibt gültig
    Angenommen mein Keller enthält 1 Flasche "Zweigelt"
    Wenn ich 1 Flasche "Zweigelt" trinke
    Und ich den Archiveintrag für "Zweigelt" nachträglich mit 4,5 Sternen bewerte
    Dann hat der Archiveintrag für "Zweigelt" die Bewertung 4,5

  Szenario: Werte zwischen 5 Sternen und Top sind ungültig
    Angenommen mein Keller enthält 2 Flaschen "Grüner Veltliner"
    Wenn ich 1 Flasche "Grüner Veltliner" trinke und mit 6,5 Sternen bewerte und anmerke "dazwischen"
    Dann wird die Aktion abgelehnt mit "Bewertung"
    Und enthält mein Keller 2 Flaschen "Grüner Veltliner"

  Szenario: Werte über Hammer sind ungültig
    Angenommen mein Keller enthält 2 Flaschen "Blaufränkisch"
    Wenn ich 1 Flasche "Blaufränkisch" trinke und mit 8 Sternen bewerte und anmerke "zu viel"
    Dann wird die Aktion abgelehnt mit "Bewertung"
