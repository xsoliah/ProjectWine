# language: de
Funktionalität: Herkunft der Weine (Länder und Regionen)
  Als Weinsammler möchte ich Länder und Regionen als verknüpfte Liste pflegen,
  damit die Herkunft meiner Weine eindeutig ist und sich auswerten lässt.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  Szenario: Neues Land
    Wenn ich das Land "Italien" anlege
    Dann zeigt meine Herkunftsliste "Italien"

  Szenario: Doppeltes Land
    Angenommen ich habe das Land "Italien"
    Wenn ich das Land "italien " anlege
    Dann wird die Aktion als Konflikt abgelehnt

  Szenario: Leerer Name
    Wenn ich das Land "  " anlege
    Dann wird die Aktion abgelehnt mit "leer"

  Szenario: Region anlegen
    Angenommen ich habe das Land "Italien"
    Wenn ich unter "Italien" die Region "Toskana" anlege
    Dann zeigt meine Herkunftsliste "Italien (Toskana)"

  Szenario: Doppelte Region im selben Land
    Angenommen "Italien" hat die Region "Toskana"
    Wenn ich unter "Italien" die Region "toskana" anlege
    Dann wird die Aktion als Konflikt abgelehnt

  Szenario: Gleicher Regionsname in anderem Land
    Angenommen "Italien" hat die Region "Piemont"
    Und ich habe das Land "Frankreich"
    Wenn ich unter "Frankreich" die Region "Piemont" anlege
    Dann zeigt meine Herkunftsliste "Frankreich (Piemont); Italien (Piemont)"

  Szenario: Länder und Regionen anderer Nutzer sind nicht sichtbar
    Angenommen ich habe das Land "Spanien"
    Und ich bin als "ben" angemeldet
    Dann enthält meine Länderliste nicht "Spanien"
    Wenn ich einem Wein "Rioja" das Land "Spanien" zuweise
    Dann wird die Aktion abgelehnt mit "nicht gefunden"

  Szenario: Herkunftsliste sortiert mit Regionen
    Angenommen "Österreich" hat die Regionen "Wachau" und "Burgenland"
    Und "Italien" hat die Region "Toskana"
    Dann zeigt meine Herkunftsliste "Italien (Toskana); Österreich (Burgenland, Wachau)"

  Szenario: Wein mit Land und Region
    Angenommen "Italien" hat die Region "Toskana"
    Wenn ich einen Wein "Sassicaia" mit dem Land "Italien" und der Region "Toskana" speichere
    Dann zeigt der Wein "Sassicaia" die Herkunft "Toskana, Italien"

  Szenario: Wein nur mit Land
    Angenommen ich habe das Land "Italien"
    Wenn ich einen Wein "Chianti" nur mit dem Land "Italien" speichere
    Dann zeigt der Wein "Chianti" die Herkunft "Italien"

  Szenario: Region passt nicht zum Land
    Angenommen "Österreich" hat die Region "Wachau"
    Und ich habe das Land "Italien"
    Wenn ich einen Wein "Grüner Veltliner" mit dem Land "Italien" und der Region "Wachau" speichere
    Dann wird die Aktion abgelehnt mit "gehört nicht"

  Szenario: Region ohne Land
    Angenommen "Italien" hat die Region "Toskana"
    Wenn ich einen Wein "Chianti" mit der Region "Toskana", aber ohne Land speichere
    Dann wird die Aktion abgelehnt mit "Land"

  Szenario: Barcode-Vorschlag mit vorhandenem Land
    Angenommen ich habe das Land "Italy"
    Und die externe Datenbank kennt den Barcode "8001234567890" als "Chianti Classico" aus "Italy"
    Wenn ich den Barcode "8001234567890" nachschlage
    Dann ist im Vorschlag das Land "Italy" ausgewählt

  Szenario: Barcode-Vorschlag mit unbekanntem Land
    Angenommen die externe Datenbank kennt den Barcode "8001234567890" als "Chianti Classico" aus "Italy"
    Wenn ich den Barcode "8001234567890" nachschlage
    Dann schlägt der Vorschlag das neue Land "Italy" vor

  Szenario: Region umbenennen
    Angenommen mein Keller enthält folgende Weine:
      | Wein  | Flaschen | Land    | Region  |
      | Wein1 | 1        | Italien | Toscana |
      | Wein2 | 1        | Italien | Toscana |
    Wenn ich die Region "Toscana" in "Toskana" umbenenne
    Dann hat der Wein "Wein1" die Herkunft "Toskana, Italien"
    Und hat der Wein "Wein2" die Herkunft "Toskana, Italien"

  Szenario: Länder zusammenführen
    Angenommen mein Keller enthält folgende Weine:
      | Wein  | Flaschen | Land    | Region  |
      | Wein1 | 1        | Italy   | Tuscany |
      | Wein2 | 1        | Italien | Toskana |
      | Wein3 | 1        | Italien | Toskana |
    Wenn ich das Land "Italy" in "Italien" zusammenführe
    Dann gibt es kein Land "Italy"
    Und hat der Wein "Wein1" die Herkunft "Tuscany, Italien"
    Und hat der Wein "Wein2" die Herkunft "Toskana, Italien"
    Und zeigt meine Herkunftsliste "Italien (Toskana, Tuscany)"

  Szenario: Länder mit gleichnamiger Region zusammenführen
    Angenommen mein Keller enthält folgende Weine:
      | Wein  | Flaschen | Land    | Region  |
      | Wein1 | 1        | Italy   | Toskana |
      | Wein2 | 1        | Italien | Toskana |
    Wenn ich das Land "Italy" in "Italien" zusammenführe
    Dann zeigt meine Herkunftsliste "Italien (Toskana)"
    Und hat der Wein "Wein1" die Herkunft "Toskana, Italien"

  Szenario: Regionen zusammenführen
    Angenommen mein Keller enthält folgende Weine:
      | Wein  | Flaschen | Land    | Region  |
      | Wein1 | 1        | Italien | Tuscany |
      | Wein2 | 1        | Italien | Toskana |
      | Wein3 | 1        | Italien | Toskana |
    Wenn ich die Region "Tuscany" in "Toskana" zusammenführe
    Dann gibt es keine Region "Tuscany"
    Und hat der Wein "Wein1" die Herkunft "Toskana, Italien"

  Szenario: Region in ein anderes Land zusammenführen
    Angenommen "Italien" hat die Region "Toskana"
    Und "Österreich" hat die Region "Wachau"
    Wenn ich die Region "Toskana" in "Wachau" zusammenführe
    Dann wird die Aktion abgelehnt mit "desselben Landes"

  Szenario: Unbenutzte Region löschen
    Angenommen "Österreich" hat die Region "Wachau"
    Wenn ich die Region "Wachau" lösche
    Dann gibt es keine Region "Wachau"

  Szenario: Verwendetes Land löschen
    Angenommen mein Keller enthält folgende Weine:
      | Wein    | Flaschen | Land    |
      | Chianti | 1        | Italien |
    Wenn ich das Land "Italien" lösche
    Dann wird die Aktion als Konflikt abgelehnt mit "1 Wein"

  Szenario: Land, dessen Wein nur noch im Archiv steht, kann nicht gelöscht werden
    Angenommen mein Keller enthält folgende Weine:
      | Wein    | Flaschen | Land    |
      | Chianti | 1        | Italien |
    Wenn ich 1 Flasche "Chianti" trinke
    Und ich das Land "Italien" lösche
    Dann wird die Aktion als Konflikt abgelehnt
