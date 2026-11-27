# language: de
Funktionalität: Foto-Erfassung und Etikettenbild
  Als Weinsammler möchte ich einen Wein per Foto des Etiketts erfassen. Ein KI-Agent recherchiert im Hintergrund,
  ich prüfe den Entwurf und übernehme ihn. Als Etikettenbild wird nur das Etikett gespeichert.

  Grundlage:
    Angenommen ich bin als "anna" angemeldet

  # ----- Aufnahme -----

  Szenario: Foto aufnehmen
    Wenn ich ein Foto des Etiketts aufnehme und 2 Flaschen angebe
    Dann entsteht ein Entwurf mit Status "wartet" und 2 Flaschen
    Und der Entwurf hat das Foto als Vorschaubild
    Und der Hintergrunddienst wurde geweckt

  Szenariogrundriss: Ungültige Datei
    Wenn ich als Foto <Datei> hochlade
    Dann wird die Aktion abgelehnt mit "<Hinweis>"
    Und es gibt keinen Entwurf
    Und ich habe heute 0 Recherchen verbraucht

    Beispiele:
      | Datei                      | Hinweis |
      | eine Textdatei             | JPEG    |
      | ein Bild größer als 10 MB  | 10 MB   |

  Szenario: Ohne Foto
    Wenn ich eine Erfassung ohne Foto starte
    Dann wird die Aktion abgelehnt mit "Foto"
    Und es gibt keinen Entwurf

  # ----- Recherche -----

  Szenario: Recherche erfolgreich
    Angenommen der Agent erkennt:
      | Feld     | Wert      | Herkunft |
      | Name     | Sassicaia | Etikett  |
      | Jahrgang | 2021      | Etikett  |
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fertig"
    Und der Entwurf heißt "Sassicaia" mit Jahrgang 2021

  Szenario: Server-Neustart während der Recherche
    Angenommen ich habe ein Foto des Etiketts aufgenommen
    Und die Recherche des Entwurfs läuft
    Wenn der Server neu startet
    Dann hat der Entwurf den Status "wartet"
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fertig"

  Szenario: Angaben mit Herkunft
    Angenommen der Agent erkennt:
      | Feld       | Wert                                      | Herkunft |
      | Name       | Sassicaia                                 | Etikett  |
      | Weingut    | Tenuta San Guido                          | Etikett  |
      | Jahrgang   | 2021                                      | Etikett  |
      | Rebsorten  | Cabernet Sauvignon 85, Cabernet Franc 15  | Web      |
      | Trinkreif  | 2028-2045                                 | Web      |
    Und der Agent nennt die Quelle "Tenuta San Guido – Sassicaia" unter "https://www.tenutasanguido.com/sassicaia"
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann sind im Entwurf "Name, Weingut, Jahrgang" als "Etikett" gekennzeichnet
    Und sind im Entwurf "Rebsorten, Trinkreif" als "Web" gekennzeichnet
    Und der Entwurf nennt die Quelle "https://www.tenutasanguido.com/sassicaia"

  Szenario: Nichts im Web gefunden
    Angenommen der Agent erkennt:
      | Feld     | Wert                  | Herkunft |
      | Name     | Rotwein trocken       | Etikett  |
      | Jahrgang | 2023                  | Etikett  |
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fertig"
    Und der Entwurf weist darauf hin, dass im Web nichts gefunden wurde

  Szenario: Kein Wein auf dem Foto
    Angenommen der Agent erkennt kein Weinetikett
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fehlgeschlagen" mit dem Hinweis "kein Weinetikett"

  Szenario: Ungültige Werte werden geleert
    Angenommen der Agent erkennt:
      | Feld       | Wert                | Herkunft |
      | Name       | Hauswein            | Etikett  |
      | Jahrgang   | 1650                | Etikett  |
      | Barcode    | 12345               | Web      |
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fertig"
    Und der Entwurf hat keinen Jahrgang und keinen Barcode

  Szenario: Ecken erkannt
    Angenommen der Agent erkennt die Ecken des Etiketts
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann enthält der Entwurf die vier Ecken des Etiketts
    Und der Entwurf zeigt ein ausgeschnittenes Etikett im Format 900 × 1200

  Szenario: Etikett angeschnitten
    Angenommen der Agent erkennt keine Ecken des Etiketts
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fertig"
    Und der Entwurf hat keine Etikett-Ecken und kein ausgeschnittenes Etikett

  Szenario: Unplausible Ecken werden verworfen
    Angenommen der Agent erkennt Ecken außerhalb des Bildes
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann der Entwurf hat keine Etikett-Ecken und kein ausgeschnittenes Etikett

  # ----- Flasche erkennen (bottle-recognition) -----

  Szenario: Flasche vollständig im Bild
    Angenommen der Agent erkennt die ganze Flasche
    Und ich habe ein Foto einer Flasche aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann enthält der Entwurf Flaschenumriss und Etikettenlage
    Und die Etikettenhöhe im Verhältnis zur Flaschenhöhe entspricht dem Foto

  Szenario: Kein zusätzlicher Aufruf
    Angenommen das Tageslimit ist 20 und ich habe heute 2 Recherchen gestartet
    Und der Agent erkennt die ganze Flasche
    Und ich habe ein Foto einer Flasche aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann ich habe heute 3 Recherchen verbraucht
    Und der Agent wurde 1-mal aufgerufen

  Szenario: Freigestellte Flasche
    Angenommen der Agent erkennt die ganze Flasche
    Und ich habe ein Foto einer Flasche aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann der Entwurf zeigt eine freigestellte Flasche mit dem Etikett in Originalgröße

  Szenario: Flasche abgeschnitten
    Angenommen der Agent erkennt eine abgeschnittene Flasche
    Und ich habe ein Foto einer Flasche aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fertig"
    Und der Entwurf zeigt den Hinweis "Flasche prüfen" mit einer Standardflasche
    Und der Entwurf hat noch kein Flaschenbild

  Szenario: Kein Flaschenumriss
    Angenommen der Agent erkennt keinen Flaschenumriss
    Und ich habe ein Foto einer Flasche aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann der Entwurf zeigt den Hinweis "Flasche prüfen" mit einer Standardflasche
    Und der Entwurf hat noch kein Flaschenbild

  Szenario: Etikett im Entwurf versetzen
    Angenommen der Agent erkennt keinen Flaschenumriss
    Und ich habe ein Foto einer Flasche aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich im Entwurf die Etikettenlage nach oben schiebe
    Dann sitzt das Etikett im Entwurf höher
    Und ich habe heute 1 Recherchen verbraucht
    Und der Agent wurde 1-mal aufgerufen

  Szenario: Flasche im Entwurf bestätigen
    Angenommen der Agent erkennt eine abgeschnittene Flasche
    Und ich habe ein Foto einer Flasche aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich im Entwurf den Flaschenumriss bestätige
    Dann der Entwurf hat ein Flaschenbild und keinen Hinweis "Flasche prüfen" mehr

  Szenario: Flasche übernehmen
    Angenommen der Agent erkennt die ganze Flasche
    Und der Agent erkennt:
      | Feld | Wert      | Herkunft |
      | Name | Sassicaia | Etikett  |
    Und ich habe ein Foto einer Flasche aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf als neuen Wein speichere
    Dann der Wein "Sassicaia" hat Flaschenmaß und Flaschenbild des Entwurfs
    Und es gibt keinen Entwurf

  Szenario: Wein löschen löscht das Flaschenbild
    Angenommen der Agent erkennt die ganze Flasche
    Und der Agent erkennt:
      | Feld | Wert      | Herkunft |
      | Name | Sassicaia | Etikett  |
    Und ich habe ein Foto einer Flasche aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf als neuen Wein speichere
    Und ich den Wein "Sassicaia" lösche
    Dann es sind keine Bilder mehr gespeichert

  Szenario: Dienst vorübergehend nicht erreichbar
    Angenommen der KI-Dienst ist beim ersten Versuch überlastet
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fertig"
    Und der Agent wurde 2-mal aufgerufen

  Szenario: Dienst dauerhaft nicht erreichbar
    Angenommen der KI-Dienst ist bei 3 Versuchen überlastet
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fehlgeschlagen" mit dem Hinweis "überlastet"
    Und der Agent wurde 3-mal aufgerufen

  Szenario: Abgelehnte Anfrage wird nicht wiederholt
    Angenommen der KI-Dienst lehnt die Anfrage ab
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Status "fehlgeschlagen"
    Und der Agent wurde 1-mal aufgerufen

  Szenario: Erneut recherchieren
    Angenommen der KI-Dienst lehnt die Anfrage ab
    Und ich habe ein Foto des Etiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich "Erneut recherchieren" wähle
    Dann hat der Entwurf den Status "wartet"
    Und ich habe heute 2 Recherchen verbraucht

  # ----- Entwürfe ansehen -----

  Szenario: Zähler in der Navigation
    Angenommen ich habe 3 Fotos aufgenommen
    Und für 2 davon ist die Recherche fertig
    Dann zeigt die Navigation bei „Entwürfe“ die Zahl 2

  Szenario: Fremde Entwürfe
    Angenommen ich habe ein Foto des Etiketts aufgenommen
    Und ich bin als "ben" angemeldet
    Dann sehe ich keine Entwürfe
    Wenn ich Annas Entwurf öffne
    Dann wird die Aktion abgelehnt mit "nicht gefunden"

  # ----- Entwurf prüfen und übernehmen -----

  Szenario: Unbekanntes Land wird vorgeschlagen, bekanntes zugeordnet
    Angenommen ich habe das Land "Italien"
    Und der Agent erkennt:
      | Feld  | Wert     | Herkunft |
      | Name  | Douro    | Etikett  |
      | Land  | Portugal | Web      |
    Und ich habe ein Foto des Etiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf öffne
    Dann schlägt der Entwurf das Land "Portugal" vor, ohne es zuzuordnen

  Szenario: Bekanntes Land und Rebsorte werden zugeordnet
    Angenommen ich habe das Land "Italien"
    Und ich habe die Rebsorte "Sangiovese"
    Und der Agent erkennt:
      | Feld      | Wert          | Herkunft |
      | Name      | Chianti       | Etikett  |
      | Land      | italien       | Web      |
      | Rebsorten | Sangiovese 90 | Web      |
    Und ich habe ein Foto des Etiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf öffne
    Dann ordnet der Entwurf das Land "Italien" und die Rebsorte "Sangiovese" zu

  Szenario: Übernehmen mit Korrektur
    Angenommen der Agent erkennt die Ecken des Etiketts
    Und der Agent erkennt:
      | Feld     | Wert      | Herkunft |
      | Name     | Sassicaia | Etikett  |
      | Jahrgang | 2021      | Etikett  |
    Und ich habe ein Foto des Etiketts aufgenommen und 2 Flaschen angegeben
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf mit Jahrgang 2020 als neuen Wein speichere
    Dann enthält mein Keller 2 Flaschen "Sassicaia"
    Und der Wein "Sassicaia" hat den Jahrgang 2020
    Und der Wein "Sassicaia" zeigt das ausgeschnittene Etikett als Etikettenbild
    Und es gibt keinen Entwurf

  Szenario: Übernehmen ohne bestätigte Ecken
    Angenommen der Agent erkennt keine Ecken des Etiketts
    Und der Agent erkennt:
      | Feld | Wert   | Herkunft |
      | Name | Barolo | Etikett  |
    Und ich habe ein Foto des Etiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf als neuen Wein speichere
    Dann hat der Wein "Barolo" kein Etikettenbild, aber das Originalfoto für den Zuschnitt

  Szenario: Abbrechen
    Angenommen ich habe ein Foto des Etiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Dann hat der Entwurf den Status "fertig"
    Und zeigt die Kelleransicht keine Weine

  Szenario: Wein schon im Keller
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und der Agent erkennt:
      | Feld | Wert      | Herkunft |
      | Name | Sassicaia | Etikett  |
    Und ich habe ein Foto des Etiketts aufgenommen und 2 Flaschen angegeben
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf öffne
    Dann erkennt der Entwurf den vorhandenen Wein "Sassicaia"
    Wenn ich die Flaschen zum vorhandenen Wein hinzufüge
    Dann enthält mein Keller 3 Flaschen "Sassicaia"
    Und es gibt keinen Entwurf

  Szenario: Laufenden Entwurf verwerfen
    Angenommen ich habe ein Foto des Etiketts aufgenommen
    Und ich verwerfe den Entwurf, während recherchiert wird
    Wenn der Agent die Recherche abschließt
    Dann es gibt keinen Entwurf
    Und es sind keine Bilder mehr gespeichert

  # ----- Tageslimit und Verfügbarkeit -----

  Szenario: Limit erreicht
    Angenommen das Tageslimit ist 20 und ich habe heute 20 Recherchen gestartet
    Wenn ich ein Foto des Etiketts aufnehme und 1 Flaschen angebe
    Dann wird die Aktion abgelehnt mit "Tageslimit"

  Szenario: Verbleibende Recherchen
    Angenommen das Tageslimit ist 20 und ich habe heute 3 Recherchen gestartet
    Dann habe ich heute noch 17 Recherchen

  Szenario: Kein Schlüssel konfiguriert
    Angenommen der Server hat keinen API-Schlüssel für den KI-Dienst
    Wenn ich ein Foto des Etiketts aufnehme und 1 Flaschen angebe
    Dann wird die Aktion abgelehnt mit "nicht verfügbar"
    Und die Foto-Erfassung wird als nicht verfügbar gemeldet

  # ----- Etikettenbild (wine-label-image) -----

  Szenario: Zuschnitt im Entwurf anpassen
    Angenommen der Agent erkennt die Ecken des Etiketts
    Und ich habe ein Foto des Etiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Zuschnitt des Entwurfs anpasse
    Dann zeigt der Entwurf ein neues ausgeschnittenes Etikett
    Und ich habe heute 1 Recherchen verbraucht

  Szenario: Bild nachträglich setzen und ersetzen
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Etikettenbild
    Wenn ich für "Sassicaia" ein neues Foto wähle und die Ecken des Etiketts bestätige
    Dann zeigt "Sassicaia" das neu ausgeschnittene Etikett
    Und das alte Etikettenbild samt Originalfoto ist gelöscht
    Und ich habe heute 0 Recherchen verbraucht

  Szenario: Ecken eines Weins korrigieren
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Etikettenbild
    Wenn ich bei "Sassicaia" den Zuschnitt anpasse
    Dann zeigt "Sassicaia" das neu ausgeschnittene Etikett
    Und das Originalfoto von "Sassicaia" ist unverändert

  Szenario: Ungültige Ecken
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Wenn ich für "Sassicaia" ein Foto mit Ecken außerhalb des Bildes wähle
    Dann wird die Aktion abgelehnt mit "Ecken"

  Szenario: Bild entfernen
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Etikettenbild
    Wenn ich bei "Sassicaia" das Etikettenbild entferne
    Dann hat "Sassicaia" kein Etikettenbild mehr
    Und es sind keine Bilder mehr gespeichert

  Szenario: Wein löschen löscht das Etikettenbild
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Etikettenbild
    Wenn ich den Wein "Sassicaia" lösche
    Dann es sind keine Bilder mehr gespeichert

  Szenario: Fremdes Bild
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Etikettenbild
    Und ich bin als "ben" angemeldet
    Wenn ich Annas Etikettenbild abrufe
    Dann wird die Aktion abgelehnt mit "nicht gefunden"
    Wenn ich Annas Originalfoto abrufe
    Dann wird die Aktion abgelehnt mit "nicht gefunden"

  # ----- Barcode zusammen mit dem Foto -----

  Szenario: Barcode wird mit dem Entwurf gespeichert
    Wenn ich ein Foto des Etiketts mit dem Barcode "4006381333931" aufnehme
    Und der Agent die Recherche abschließt
    Dann hat der Entwurf den Barcode "4006381333931" vom Etikett
    Und der Agent kannte den Barcode "4006381333931"

  Szenario: Falsche Prüfziffer eingegeben
    Wenn ich ein Foto des Etiketts mit dem Barcode "4006381333932" aufnehme
    Dann wird die Aktion abgelehnt mit "Prüfziffer"
    Und es gibt keinen Entwurf
    Und ich habe heute 0 Recherchen verbraucht

  # ----- Rückenetikett bleibt erhalten -----

  Szenario: Wein aus Entwurf mit Rückseite
    Angenommen der Agent erkennt:
      | Feld | Wert      | Herkunft |
      | Name | Sassicaia | Etikett  |
    Und ich habe ein Foto des Etiketts und ein Foto des Rückenetiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf als neuen Wein speichere
    Dann hat der Wein "Sassicaia" ein Rückseitenbild
    Und das Rückseitenbild von "Sassicaia" ist das Rückenfoto des Entwurfs

  Szenario: Entwurf ohne Rückseite
    Angenommen der Agent erkennt:
      | Feld | Wert      | Herkunft |
      | Name | Sassicaia | Etikett  |
    Und ich habe ein Foto des Etiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf als neuen Wein speichere
    Dann hat der Wein "Sassicaia" kein Rückseitenbild

  Szenario: Flaschen zu vorhandenem Wein ohne Rückseite
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und der Agent erkennt:
      | Feld | Wert      | Herkunft |
      | Name | Sassicaia | Etikett  |
    Und ich habe ein Foto des Etiketts und ein Foto des Rückenetiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf öffne
    Und ich die Flaschen zum vorhandenen Wein hinzufüge
    Dann hat der Wein "Sassicaia" ein Rückseitenbild
    Und das Rückseitenbild von "Sassicaia" ist das Rückenfoto des Entwurfs

  Szenario: Flaschen zu vorhandenem Wein mit Rückseite
    Angenommen mein Keller enthält 1 Flasche "Sassicaia"
    Und "Sassicaia" hat ein Rückseitenbild
    Und der Agent erkennt:
      | Feld | Wert      | Herkunft |
      | Name | Sassicaia | Etikett  |
    Und ich habe ein Foto des Etiketts und ein Foto des Rückenetiketts aufgenommen
    Und der Agent hat die Recherche abgeschlossen
    Wenn ich den Entwurf öffne
    Und ich die Flaschen zum vorhandenen Wein hinzufüge
    Dann bleibt das bisherige Rückseitenbild von "Sassicaia" erhalten
    Und das Rückenfoto des Entwurfs ist gelöscht

  Szenario: Angegebener Code hat Vorrang
    Angenommen der Agent erkennt:
      | Feld    | Wert          | Herkunft |
      | Name    | Hauswein      | Etikett  |
      | Barcode | 4001234567891 | Web      |
    Wenn ich ein Foto des Etiketts mit dem Barcode "4006381333931" aufnehme
    Und der Agent die Recherche abschließt
    Dann hat der Entwurf den Barcode "4006381333931" vom Etikett

  Szenario: Agent liest Barcode vom Foto
    Angenommen der Agent erkennt:
      | Feld    | Wert          | Herkunft |
      | Name    | Hauswein      | Etikett  |
      | Barcode | 4001234567891 | Etikett  |
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf den Barcode "4001234567891" vom Etikett

  Szenario: Gelesener Code mit falscher Prüfziffer
    Angenommen der Agent erkennt:
      | Feld    | Wert          | Herkunft |
      | Name    | Hauswein      | Etikett  |
      | Barcode | 4001234567892 | Etikett  |
    Und ich habe ein Foto des Etiketts aufgenommen
    Wenn der Agent die Recherche abschließt
    Dann hat der Entwurf keinen Barcode
