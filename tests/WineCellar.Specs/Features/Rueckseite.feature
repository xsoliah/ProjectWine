# language: de
Funktionalität: Rückseitenbild eines Weins
  Als Weinsammler möchte ich das Rückenetikett eines Weins als Foto speichern, damit ich Angaben wie Rebsorten,
  Trinkfenster oder Importeur später nachlesen kann. Das Foto wird unbearbeitet gespeichert.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet
    Und mein Keller enthält 1 Flasche "Sassicaia"

  Szenario: Rückseite hinzufügen
    Wenn ich bei "Sassicaia" ein Foto des Rückenetiketts wähle
    Dann hat der Wein "Sassicaia" ein Rückseitenbild
    Und ich habe heute 0 Recherchen verbraucht

  Szenario: Rückseite wird unbearbeitet gespeichert
    Wenn ich bei "Sassicaia" ein Foto des Rückenetiketts wähle
    Dann ist das Rückseitenbild von "Sassicaia" das gewählte Foto

  Szenario: Rückseite ersetzen
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Wenn ich bei "Sassicaia" ein neues Foto des Rückenetiketts wähle
    Dann zeigt "Sassicaia" das neue Rückseitenbild
    Und das alte Rückseitenbild ist gelöscht

  Szenario: Rückseite entfernen
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Wenn ich bei "Sassicaia" das Rückseitenbild entferne
    Dann hat der Wein "Sassicaia" kein Rückseitenbild
    Und es sind keine Bilder mehr gespeichert

  Szenario: Rückseite unabhängig vom Vorderetikett
    Angenommen "Sassicaia" hat ein Etikettenbild
    Und "Sassicaia" hat ein Rückseitenbild
    Wenn ich bei "Sassicaia" das Etikettenbild entferne
    Dann hat der Wein "Sassicaia" ein Rückseitenbild

  Szenariogrundriss: Ungültige Datei
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Wenn ich bei "Sassicaia" als Rückseite <Datei> wähle
    Dann wird die Aktion abgelehnt mit "<Hinweis>"
    Und das bisherige Rückseitenbild von "Sassicaia" bleibt erhalten

    Beispiele:
      | Datei                       | Hinweis                         |
      | eine Textdatei              | Nur Bilder im Format JPEG, PNG  |
      | ein Bild größer als 10 MB   | größer als 10 MB                |

  Szenario: Wein löschen löscht das Rückseitenbild
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Wenn ich den Wein "Sassicaia" lösche
    Dann es sind keine Bilder mehr gespeichert

  Szenario: Fremdes Bild
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Und ich bin als "ben" angemeldet
    Wenn ich Annas Rückseitenbild abrufe
    Dann wird die Aktion abgelehnt mit "nicht gefunden"

  Szenario: Fremder Wein
    Angenommen ich bin als "ben" angemeldet
    Wenn ich bei "Sassicaia" von Anna ein Foto des Rückenetiketts wähle
    Dann wird die Aktion abgelehnt mit "nicht gefunden"
