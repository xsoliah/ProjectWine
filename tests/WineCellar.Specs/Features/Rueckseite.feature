# language: de
Funktionalität: Rückseitenbild eines Weins
  Als Weinsammler möchte ich das Rückenetikett eines Weins als zugeschnittenes Bild speichern, damit ich Angaben wie
  Rebsorten, Trinkfenster oder Importeur später nachlesen kann. Der Zuschnitt funktioniert wie beim Vorderetikett.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet
    Und mein Keller enthält 1 Flasche "Sassicaia"

  Szenario: Rückseite hinzufügen
    Wenn ich bei "Sassicaia" ein Foto des Rückenetiketts wähle und die Ecken bestätige
    Dann hat der Wein "Sassicaia" ein Rückseitenbild
    Und ich habe heute 0 Recherchen verbraucht

  Szenario: Rückenetikett wird zugeschnitten
    Wenn ich bei "Sassicaia" ein Foto des Rückenetiketts wähle und die Ecken bestätige
    Dann zeigt das Rückseitenbild von "Sassicaia" nur das Etikett im Format 900 × 1200
    Und das Originalfoto der Rückseite von "Sassicaia" ist gespeichert

  Szenario: Rückseite ersetzen
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Wenn ich bei "Sassicaia" ein neues Foto des Rückenetiketts wähle und die Ecken bestätige
    Dann zeigt "Sassicaia" das neue Rückseitenbild
    Und das alte Rückseitenbild samt Originalfoto ist gelöscht

  Szenario: Zuschnitt der Rückseite anpassen
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Wenn ich bei "Sassicaia" den Zuschnitt der Rückseite anpasse
    Dann zeigt "Sassicaia" das neue Rückseitenbild
    Und das Originalfoto der Rückseite von "Sassicaia" ist unverändert

  Szenario: Unbearbeitetes Rückseitenbild zuschneiden
    Angenommen "Sassicaia" hat ein unbearbeitetes Rückseitenbild
    Wenn ich bei "Sassicaia" den Zuschnitt der Rückseite anpasse
    Dann zeigt das Rückseitenbild von "Sassicaia" nur das Etikett im Format 900 × 1200
    Und das bisherige Rückseitenbild ist jetzt das Originalfoto von "Sassicaia"

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

  Szenario: Ungültige Ecken
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Wenn ich bei "Sassicaia" ein Foto der Rückseite mit Ecken außerhalb des Bildes wähle
    Dann wird die Aktion abgelehnt mit "Ecken"
    Und das bisherige Rückseitenbild von "Sassicaia" bleibt erhalten

  Szenario: Wein löschen löscht Rückseitenbild und Originalfoto
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Wenn ich den Wein "Sassicaia" lösche
    Dann es sind keine Bilder mehr gespeichert

  Szenario: Fremdes Originalfoto
    Angenommen "Sassicaia" hat ein Rückseitenbild
    Und ich bin als "ben" angemeldet
    Wenn ich Annas Originalfoto der Rückseite abrufe
    Dann wird die Aktion abgelehnt mit "nicht gefunden"

  Szenario: Fremder Wein
    Angenommen ich bin als "ben" angemeldet
    Wenn ich bei "Sassicaia" von Anna ein Foto des Rückenetiketts wähle und die Ecken bestätige
    Dann wird die Aktion abgelehnt mit "nicht gefunden"
