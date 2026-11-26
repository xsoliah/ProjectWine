# language: de
Funktionalität: Übersicht mit Statistiken zum Keller
  Als Weinsammler möchte ich beim Einstieg sehen, wie viele Flaschen ich habe
  und wie sie sich auf Weintypen, Länder, Regionen und Winzer verteilen.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  Szenario: Kennzahlen berechnen
    Angenommen mein Keller enthält folgende Weine:
      | Wein      | Flaschen | Preis  |
      | Zweigelt  | 6        | 12,00  |
      | Sassicaia | 2        | 250,00 |
      | Hauswein  | 3        |        |
      | Merlot    | 0        | 9,00   |
    Wenn ich die Übersicht öffne
    Dann sehe ich 11 Flaschen, 3 Weine und einen Gesamtwert von 572,00 €
    Und einen Hinweis, dass 1 Wein keinen Einkaufspreis hat

  Szenario: Getrunkene Flaschen zählen nicht
    Angenommen mein Keller enthält folgende Weine:
      | Wein     | Flaschen |
      | Zweigelt | 3        |
    Wenn ich 2 Flaschen "Zweigelt" trinke
    Und ich die Übersicht öffne
    Dann sehe ich 1 Flaschen

  Szenario: Fremde Weine zählen nicht
    Angenommen mein Keller enthält folgende Weine:
      | Wein     | Flaschen |
      | Zweigelt | 5        |
    Und ich bin als "ben" angemeldet
    Und mein Keller enthält folgende Weine:
      | Wein   | Flaschen |
      | Merlot | 2        |
    Wenn er die Übersicht öffnet
    Dann sieht er 2 Flaschen

  Szenario: Verteilung nach Weintyp
    Angenommen mein Keller enthält folgende Weine:
      | Wein       | Flaschen | Typ        |
      | Zweigelt   | 6        | Rotwein    |
      | Riesling   | 3        | Weißwein   |
      | Sekt Brut  | 1        | Schaumwein |
    Wenn ich die Übersicht öffne
    Dann zeigt das Diagramm:
      | Segment    | Flaschen | Prozent |
      | Rotwein    | 6        | 60      |
      | Weißwein   | 3        | 30      |
      | Schaumwein | 1        | 10      |

  Szenario: Verteilung nach Land
    Angenommen mein Keller enthält folgende Weine:
      | Wein     | Flaschen | Land       |
      | Chianti  | 5        | Italien    |
      | Zweigelt | 3        | Österreich |
    Wenn ich die Gruppierung "Land" wähle
    Dann zeigt das Diagramm:
      | Segment    | Flaschen |
      | Italien    | 5        |
      | Österreich | 3        |

  Szenario: Verteilung nach Region
    Angenommen mein Keller enthält folgende Weine:
      | Wein             | Flaschen | Land       | Region  |
      | Chianti          | 4        | Italien    | Toskana |
      | Barolo           | 1        | Italien    | Piemont |
      | Grüner Veltliner | 3        | Österreich | Wachau  |
    Wenn ich die Gruppierung "Region" wähle
    Dann zeigt das Diagramm:
      | Segment              | Flaschen |
      | Toskana (Italien)    | 4        |
      | Wachau (Österreich)  | 3        |
      | Piemont (Italien)    | 1        |

  Szenario: Verteilung nach Winzer mit unterschiedlicher Schreibweise
    Angenommen mein Keller enthält folgende Weine:
      | Wein        | Flaschen | Winzer               |
      | Sassicaia   | 2        | Tenuta San Guido     |
      | Guidalberto | 3        | tenuta san guido     |
      | Riesling    | 1        | Weingut Bründlmayer  |
    Wenn ich die Gruppierung "Winzer" wähle
    Dann zeigt das Diagramm:
      | Segment             | Flaschen |
      | Tenuta San Guido    | 5        |
      | Weingut Bründlmayer | 1        |

  Szenario: Weine ohne Land stehen als letztes Segment
    Angenommen mein Keller enthält folgende Weine:
      | Wein     | Flaschen | Land    |
      | Hauswein | 2        |         |
      | Chianti  | 1        | Italien |
    Wenn ich die Gruppierung "Land" wähle
    Dann zeigt das Diagramm:
      | Segment     | Flaschen |
      | Italien     | 1        |
      | Ohne Angabe | 2        |

  Szenario: Land ohne Region
    Angenommen mein Keller enthält folgende Weine:
      | Wein    | Flaschen | Land    | Region  |
      | Chianti | 2        | Italien |         |
      | Brunello| 1        | Italien | Toskana |
    Wenn ich die Gruppierung "Region" wähle
    Dann zeigt das Diagramm:
      | Segment               | Flaschen |
      | Ohne Region (Italien) | 2        |
      | Toskana (Italien)     | 1        |

  Szenario: Viele Winzer werden zu Sonstige zusammengefasst
    Angenommen mein Keller enthält Weine von 12 verschiedenen Winzern
    Wenn ich die Gruppierung "Winzer" wähle
    Dann zeigt das Diagramm:
      | Segment   | Flaschen |
      | Winzer 01 | 12       |
      | Winzer 02 | 11       |
      | Winzer 03 | 10       |
      | Winzer 04 | 9        |
      | Winzer 05 | 8        |
      | Winzer 06 | 7        |
      | Winzer 07 | 6        |
      | Sonstige  | 15       |
    Und fasst "Sonstige" 5 Winzer mit zusammen 15 Flaschen zusammen

  Szenario: Drill-down vom Land zu den Regionen
    Angenommen mein Keller enthält folgende Weine:
      | Wein     | Flaschen | Land       | Region  |
      | Chianti  | 4        | Italien    | Toskana |
      | Hauswein | 1        | Italien    |         |
      | Zweigelt | 3        | Österreich |         |
    Wenn ich in der Gruppierung "Land" auf "Italien" tippe
    Dann lautet die Überschrift "Italien"
    Und zeigt das Diagramm:
      | Segment     | Flaschen | Prozent |
      | Toskana     | 4        | 80      |
      | Ohne Region | 1        | 20      |

  Szenario: Leerer Keller
    Wenn ich die Übersicht öffne
    Dann zeigt die Übersicht keine Verteilung

  Szenario: Verteilung nach Rebsorte mit Cuvées
    Angenommen mein Keller enthält folgende Weine:
      | Wein       | Flaschen | Rebsorten                              |
      | Riesling   | 5        | "Riesling"                             |
      | Pinot      | 1        | "Pinot Noir"                           |
      | Bordeaux   | 3        | "Cabernet Sauvignon" und "Merlot"      |
      | Hauscuvée  | 1        | "Zweigelt" und "Blaufränkisch"         |
    Wenn ich die Gruppierung "Rebsorte" wähle
    Dann zeigt das Diagramm:
      | Segment    | Flaschen | Prozent |
      | Riesling   | 5        | 50      |
      | Cuvée      | 4        | 40      |
      | Pinot Noir | 1        | 10      |

  Szenario: Weine ohne Rebsorte
    Angenommen mein Keller enthält folgende Weine:
      | Wein     | Flaschen | Rebsorten  |
      | Riesling | 3        | "Riesling" |
      | Hauswein | 1        |            |
    Wenn ich die Gruppierung "Rebsorte" wähle
    Dann zeigt das Diagramm:
      | Segment     | Flaschen |
      | Riesling    | 3        |
      | Ohne Angabe | 1        |

  Szenario: Cuvée zählt nicht bei ihren Rebsorten
    Angenommen mein Keller enthält folgende Weine:
      | Wein      | Flaschen | Rebsorten                        |
      | Merlot    | 2        | "Merlot"                         |
      | Bordeaux  | 5        | "Merlot" und "Cabernet Franc"    |
    Wenn ich die Gruppierung "Rebsorte" wähle
    Dann zeigt das Diagramm:
      | Segment | Flaschen |
      | Cuvée   | 5        |
      | Merlot  | 2        |

  Szenario: Cuvée aufklappen
    Angenommen mein Keller enthält folgende Weine:
      | Wein       | Flaschen | Rebsorten                                       |
      | Sassicaia  | 3        | "Cabernet Sauvignon" 85 % und "Cabernet Franc" 15 % |
      | Bolgheri   | 2        | "Cabernet Franc" und "Cabernet Sauvignon"       |
      | Hauscuvée  | 1        | "Zweigelt" und "Blaufränkisch"                  |
      | Riesling   | 4        | "Riesling"                                      |
    Wenn ich in der Gruppierung "Rebsorte" auf "Cuvée" tippe
    Dann lautet die Überschrift "Cuvées"
    Und zeigt das Diagramm:
      | Segment                            | Flaschen | Prozent |
      | Cabernet Franc, Cabernet Sauvignon | 5        | 83      |
      | Blaufränkisch, Zweigelt            | 1        | 17      |

  Szenario: Viele Cuvée-Zusammensetzungen
    Angenommen mein Keller enthält Cuvées in 10 verschiedenen Zusammensetzungen
    Wenn ich auf "Cuvée" tippe
    Dann zeigt das Diagramm:
      | Segment           | Flaschen |
      | Basis, Partner 01 | 10       |
      | Basis, Partner 02 | 9        |
      | Basis, Partner 03 | 8        |
      | Basis, Partner 04 | 7        |
      | Basis, Partner 05 | 6        |
      | Basis, Partner 06 | 5        |
      | Basis, Partner 07 | 4        |
      | Sonstige          | 6        |
