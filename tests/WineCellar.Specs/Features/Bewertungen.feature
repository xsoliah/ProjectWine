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
