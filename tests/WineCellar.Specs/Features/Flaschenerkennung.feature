# language: de
Funktionalität: Flaschenerkennung und Flaschenmaß eines Weins
  Als Weinsammler möchte ich, dass zu meinem Wein die ganze Flasche samt Lage des Etiketts bekannt ist, damit er
  größengetreu in 3D dargestellt werden kann. Ich kann das Flaschenmaß anpassen und bei bestehenden Weinen
  nachträglich erkennen lassen.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  Szenario: Etikett versetzen
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Originalfoto einer Flasche
    Und "Sassicaia" hat ein Flaschenmaß
    Wenn ich bei "Sassicaia" die Etikettenlage nach oben schiebe
    Dann sitzt das Etikett von "Sassicaia" höher
    Und ich habe heute 0 Recherchen verbraucht
    Und der Agent wurde nicht aufgerufen

  Szenario: Flaschenumriss anpassen
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Originalfoto einer Flasche
    Und "Sassicaia" hat ein Flaschenmaß
    Wenn ich bei "Sassicaia" einen schmaleren Flaschenumriss bestätige
    Dann hat "Sassicaia" ein neues, schmaleres Flaschenbild
    Und ich habe heute 0 Recherchen verbraucht

  Szenario: Unplausibler Umriss
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Originalfoto einer Flasche
    Und "Sassicaia" hat ein Flaschenmaß
    Wenn ich bei "Sassicaia" einen Flaschenumriss mit nur 3 Punkten bestätige
    Dann wird die Aktion abgelehnt mit "Umriss"

  Szenario: Nachträglich erkennen
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Originalfoto einer Flasche
    Und der Agent erkennt die ganze Flasche
    Wenn ich bei "Sassicaia" "Flasche erkennen" wähle
    Dann hat "Sassicaia" ein Flaschenmaß und ein Flaschenbild
    Und ich habe heute 1 Recherchen verbraucht
    Und der Agent hat nur nach der Flasche gesucht

  Szenario: Nachträglich erkennen, Flasche nicht erkennbar
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Originalfoto einer Flasche
    Und der Agent erkennt eine abgeschnittene Flasche
    Wenn ich bei "Sassicaia" "Flasche erkennen" wähle
    Dann hat "Sassicaia" eine Standardflasche zum Prüfen und kein Flaschenbild
    Und ich habe heute 1 Recherchen verbraucht

  Szenario: Limit erreicht
    Angenommen das Tageslimit ist 2 und ich habe heute 2 Recherchen gestartet
    Und mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Originalfoto einer Flasche
    Und der Agent erkennt die ganze Flasche
    Wenn ich bei "Sassicaia" "Flasche erkennen" wähle
    Dann wird die Aktion abgelehnt mit "Tageslimit"
    Und der Agent wurde nicht aufgerufen
    Und ich habe heute 2 Recherchen verbraucht

  Szenario: Ohne Originalfoto
    Angenommen mein Keller enthält 1 Flasche "Zweigelt"
    Und der Agent erkennt die ganze Flasche
    Wenn ich bei "Zweigelt" "Flasche erkennen" wähle
    Dann wird die Aktion abgelehnt mit "Originalfoto"
    Und der Agent wurde nicht aufgerufen
    Und ich habe heute 0 Recherchen verbraucht

  Szenario: Wein löschen löscht Flaschenmaß und Flaschenbild
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Originalfoto einer Flasche
    Und "Sassicaia" hat ein Flaschenmaß
    Wenn ich den Wein "Sassicaia" lösche
    Dann es sind keine Bilder mehr gespeichert

  Szenario: Fremdes Flaschenbild
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Originalfoto einer Flasche
    Und "Sassicaia" hat ein Flaschenmaß
    Und ich bin als "ben" angemeldet
    Wenn ich Annas Flaschenbild abrufe
    Dann wird die Aktion abgelehnt mit "nicht gefunden"
