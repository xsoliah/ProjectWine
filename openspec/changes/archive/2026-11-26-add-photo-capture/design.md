# Design

## Context

- Backend: ASP.NET Core 10 (Minimal API), Clean-Architecture-Schichten, EF Core mit SQL Server und Migrationen, Bearer-Token-Authentifizierung; Bereitstellung auf IIS (eine Site für API und Angular-App) und als Capacitor-App.
- Es gibt bereits einen Barcode-Ablauf mit Vorbelegung des Wein-Formulars (`WineDraft`, `decideLookupOutcome`) und den Abgleich von Land/Region per Name; `add-grape-varieties` ergänzt denselben Abgleich für Rebsorten. Die Foto-Erfassung baut darauf auf.
- Bisher gibt es keine Hintergrundverarbeitung, keine Dateiablage und keine Abhängigkeit zu einem KI-Dienst.
- `<img src>` kann keinen Bearer-Header mitschicken; geschützte Bilder müssen im Frontend per `HttpClient` geladen werden.

Motivation: `proposal.md`. Anforderungen: `specs/photo-capture/spec.md`, `specs/wine-label-image/spec.md`.

## Goals / Non-Goals

**Goals:**
- Foto aufnehmen in wenigen Sekunden, Recherche zuverlässig im Hintergrund, auch über Server-Neustarts hinweg.
- Der Agent erfindet nichts: leere Felder statt Vermutungen, jede Angabe mit Herkunft und Quellen.
- Klare Kosten- und Missbrauchsgrenzen (Tageslimit, Zeitlimit, begrenzte Websuchen pro Recherche).
- Testbar ohne echte API-Aufrufe.

**Non-Goals:**
- Push-Benachrichtigungen, wenn ein Entwurf fertig ist (die App zeigt es beim nächsten Öffnen).
- Mehrere Weine auf einem Foto, Erkennung ganzer Regale.
- Preisrecherche oder Bewertungen aus dem Web.
- Offline-Warteschlange in der App (ohne Verbindung schlägt das Hochladen fehl).
- Abrollen gewölbter Etiketten (Zylinder-Entzerrung): Das Etikett wird nur perspektivisch entzerrt; an den Rändern gewölbter Etiketten bleibt eine leichte Stauchung. Empfehlung in der App: Flasche gerade von vorne fotografieren.
- Automatische Eckenerkennung ohne KI (z. B. OpenCV im Browser) für nachträglich gesetzte Bilder: Dort setzt der Benutzer die Ecken selbst.

## Decisions

### D1: Claude über das offizielle C#-SDK, kein selbstgebauter Agent-Loop
- Paket `Anthropic` (NuGet) im Infrastructure-Projekt, Klasse `ClaudeWineResearchAgent : IWineResearchAgent`. Application kennt nur die Schnittstelle `IWineResearchAgent.ResearchAsync(images, hint, ct) → WineResearchResult`.
- Modell `claude-opus-5-5` (konfigurierbar über `Anthropic:Model`), `thinking: adaptive`, `output_config.effort` explizit `medium` (konfigurierbar; bei Opus 5.5 ist `medium` auch der Standard).
- Eine einzige Anfrage an die Messages-API mit den **Server-Tools** `web_search_20260209` (`max_uses: 5`) und `web_fetch_20260209` (`max_uses: 3`). Beide laufen auf Anthropic-Seite; die App führt keine Tools selbst aus. Antwortet die API mit `stop_reason: "pause_turn"`, wird die Antwort unverändert angehängt und die Anfrage fortgesetzt (höchstens 3 Fortsetzungen).
- Streaming mit `finalMessage`-Helfer, damit lange Recherchen nicht am HTTP-Timeout scheitern; `max_tokens` 16000.
- Ablehnungen durch Sicherheitsfilter: `stop_reason == "refusal"` wird geprüft, bevor der Inhalt gelesen wird. Serverseitiger Fallback ist eingeschaltet (`fallbacks: "default"` mit Beta `server-side-fallback-2026-07-01`). Bleibt es bei einer Ablehnung, wird der Entwurf „fehlgeschlagen“.
- *Alternative*: Managed Agents → eigene Sandbox und Sitzungen sind für eine einzelne Recherche unnötig schwer. Verworfen.
- *Alternative*: eigene Websuche (Bing/Google-API) plus Tool-Loop → zusätzlicher Dienst, Schlüssel und Code. Verworfen.

### D2: Strukturierte Antwort
- `output_config.format` mit JSON-Schema: je Feld `{ value, source: "label" | "web" }` für `name`, `producer`, `vintage`, `type` (Enum der App), `country`, `region`, `bottleSizeMl`, `drinkFrom`, `drinkUntil`, `barcode`, `notes`; `grapes: [{ name, percent?, source }]`; außerdem `isWineLabel: bool`, `summary` (ein Satz, was gefunden wurde) und `labelCorners`: die vier Ecken des Vorderetiketts auf dem Vorderfoto als Punkte `{ x, y }`, normiert auf 0–1 (oben links, oben rechts, unten rechts, unten links), oder `null`, wenn sie nicht sicher bestimmbar sind. Der Prompt verlangt die Kante des bedruckten Etikettenpapiers, nicht die der Flasche.
- Die Quellen werden **nicht** vom Modell abgeschrieben, sondern aus den `web_search_tool_result`- bzw. `web_fetch_tool_result`-Blöcken der Antwort gesammelt (Titel, URL, ohne Duplikate). So können sie nicht erfunden sein.
- Serverseitige Prüfung nach dem Parsen: Jahrgang 1800 bis aktuelles Jahr + 1, Flaschengröße 50–30000, Anteile 1–100 mit Summe ≤ 100, Barcode über den vorhandenen `BarcodeNormalizer` (ungültig → leer), Notiz auf 500 Zeichen gekürzt. Ungültige Einzelwerte werden geleert, nicht der ganze Entwurf verworfen. `labelCorners` wird verworfen, wenn ein Punkt außerhalb von 0–1 liegt, das Viereck nicht konvex ist oder weniger als 2 % der Bildfläche umfasst.
- Offener Prüfpunkt bei der Umsetzung: Kombination aus Server-Tools und `output_config.format` mit dem aktuellen SDK testen. Falls nicht kombinierbar: JSON im letzten Textblock anfordern und gegen dasselbe Schema validieren.

### D3: Prompt und Schutz vor Prompt-Injection
- System-Prompt (englisch, stabil, damit er gecacht werden kann): Aufgabe, Felder, „nur belegbare Angaben, sonst leer“, Vorrang des Etiketts vor dem Web bei Widersprüchen, Ausgabe der Notiz auf Deutsch.
- Inhalte aus Webseiten und vom Etikett sind **Daten, keine Anweisungen**; das steht ausdrücklich im System-Prompt. Zusätzlich hat der Agent keine Werkzeuge mit Wirkung (nur Suchen/Lesen), und das Ergebnis ist auf das Schema beschränkt und wird serverseitig geprüft.
- Die optionale Notiz des Benutzers wird als Hinweis in die Benutzernachricht gelegt (z. B. „Geschenk von Tante Gerda“), nicht in den System-Prompt.

### D4: Warteschlange in der Datenbank plus Hintergrunddienst
- Tabelle `capture_drafts`: `Id`, `OwnerId`, `Status` (`Pending`, `Researching`, `Ready`, `Failed`), `FrontImageId`, `BackImageId?`, `BottleCount`, `UserNote?`, `ResultJson?`, `Sources` (JSON), `LabelCorners?` (JSON, vom Agenten oder angepasst), `LabelPreviewImageId?`, `Error?`, `Attempts`, `CreatedAt`, `StartedAt?`, `CompletedAt?`, `RowVersion`.
- `CaptureWorker : BackgroundService` holt wartende Entwürfe (älteste zuerst) und verarbeitet höchstens `PhotoCapture:MaxParallel` (Standard 2) gleichzeitig. Die Übernahme eines Entwurfs geschieht per Update `Pending → Researching` mit Prüfung von `RowVersion`, damit ihn nicht zwei Durchläufe gleichzeitig bekommen. Neue Aufnahmen wecken den Worker über einen `Channel`; zusätzlich prüft er alle 30 Sekunden.
- Beim Start setzt der Worker alle `Researching`-Einträge auf `Pending` zurück (Neustart-Anforderung).
- Pro Versuch 5 Minuten Zeitlimit; vorübergehende Fehler (429, 5xx, 529, Netzwerk, Zeitüberschreitung) werden bis zu zweimal mit 10 s / 30 s Pause wiederholt, danach `Failed`. Das SDK selbst bekommt `MaxRetries = 0`, damit die Wiederholung nur an einer Stelle geregelt ist.
- Die eigentliche Logik steckt in `CaptureProcessor.ProcessAsync(draftId)` im Application-Layer; der Worker ist nur der Auslöser. So lässt sich der Ablauf mit einem simulierten Agenten in Reqnroll testen.
- IIS: Der App-Pool muss „AlwaysRunning“ und Preload aktiviert haben, sonst schläft der Hintergrunddienst bei Leerlauf ein. Das kommt in die README (Abschnitt Bereitstellung).
- *Alternative*: Hangfire/Quartz → zusätzliche Abhängigkeit und Tabellen für eine einzige Art von Aufgabe. Verworfen.

### D5: Tageslimit
Tabelle `capture_usage` (`OwnerId`, `Day`, `Count`) mit Primärschlüssel (`OwnerId`, `Day`). Aufnahme und „Erneut recherchieren“ erhöhen den Zähler in derselben Transaktion, in der der Entwurf entsteht bzw. zurückgesetzt wird (Upsert mit Prüfung `Count < Limit`, sonst 429 mit Problem-Details). Verworfene Entwürfe senken den Zähler nicht. Das Limit kommt aus `PhotoCapture:DailyLimitPerUser` (Standard 20). `GET /api/captures/quota` liefert `{ limit, used, remaining, enabled }`.

### D6: Bilder
- Die App verkleinert Fotos vor dem Hochladen im Browser (Canvas) auf höchstens 1568 px an der langen Kante, JPEG-Qualität 0,85 – das ist die Größe, die das Modell ohne weitere Verkleinerung verarbeitet, und hält Uploads meist unter 1 MB. Ausrichtung nach EXIF wird dabei angewendet.
- Server prüft Dateityp anhand der ersten Bytes (JPEG/PNG/WebP), Größe ≤ 10 MB, und speichert unverändert in `stored_images` (`Id`, `OwnerId`, `ContentType`, `Data varbinary(max)`, `CreatedAt`). Ablage in der Datenbank statt im Dateisystem, damit Sicherung und IIS-Berechtigungen einfach bleiben.
- `Wine.LabelImageId` (das ausgeschnittene Etikett) und `Wine.LabelSourceImageId` (das Originalfoto, nur für den Ecken-Editor), beide nullable mit FK `SetNull`; beide Bilder löscht der `WineService` beim Löschen des Weins, beim Entfernen und beim Ersetzen. Die zuletzt verwendeten Ecken stehen als JSON in `Wine.LabelCorners`, damit der Editor dort weitermacht.
- `GET /api/images/{id}` prüft den Besitzer und liefert das Bild mit `Cache-Control: private, max-age=86400`. Im Frontend lädt eine Direktive `appAuthImage` das Bild per `HttpClient` als Blob und setzt eine Object-URL (und gibt sie beim Zerstören frei).
- Fotos gehen als Base64-`image`-Blöcke an die API (keine Files-API nötig, je Recherche nur 1–2 Bilder).

### D7: API
| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/captures/quota` | Limit, verbraucht, verbleibend, aktiviert |
| POST | `/api/captures` | Multipart: `front`, optional `back`, `bottleCount`, `note` → 202 mit Entwurf |
| GET | `/api/captures` | Eigene Entwürfe (ohne übernommene), neueste zuerst |
| GET | `/api/captures/{id}` | Entwurf mit Ergebnis, Quellen und Abgleich (Land/Region/Rebsorten-IDs, passender vorhandener Wein) |
| POST | `/api/captures/{id}/retry` | Erneut recherchieren (zählt aufs Limit) |
| PUT | `/api/captures/{id}/label-corners` | Ecken des Etiketts im Entwurf anpassen; erzeugt die Vorschau neu (zählt nicht aufs Limit) |
| POST | `/api/captures/{id}/accept` | Body `{ wineId }` (neuer Wein) oder `{ addToWineId, count }` (Flaschen zu vorhandenem Wein); schneidet das Etikett aus dem Vorderfoto aus (D9), speichert es als Etikettenbild und das Vorderfoto als Originalfoto, löscht den Entwurf |
| DELETE | `/api/captures/{id}` | Verwerfen inklusive Fotos |
| GET | `/api/images/{id}` | Bild abrufen |
| PUT/DELETE | `/api/wines/{id}/label-image` | Etikettenbild setzen (Multipart: `image` plus `corners` als JSON; Server schneidet aus) / entfernen inklusive Originalfoto |
| PUT | `/api/wines/{id}/label-image/corners` | Ecken anpassen; Etikett wird aus dem gespeicherten Originalfoto neu ausgeschnitten |

Der neue Wein selbst wird über das vorhandene `POST /api/wines` angelegt (das Formular bleibt die einzige Stelle, an der Weine entstehen); danach ruft die App `accept` mit der neuen `wineId` auf. Fehlt der Schlüssel, antworten alle `POST`-Endpunkte unter `/api/captures` mit 503 und `quota.enabled = false`.

### D8: Frontend
- „Wein hinzufügen“: neuer Button „Per Foto erfassen“ (nur wenn `quota.enabled`). Er öffnet die Dateiauswahl mit `accept="image/*" capture="environment"` – das öffnet auf dem Handy und in der Capacitor-WebView direkt die Kamera, ohne neues Capacitor-Plugin. Danach: Vorschau, optional zweites Foto, Anzahl, Notiz, „Recherche starten“, Anzeige „Heute noch n Recherchen“.
- Einmaliger Hinweis zur Datenübertragung (Bestätigung im `localStorage` bzw. Capacitor Preferences über den vorhandenen `StorageService`).
- Neue Seite `drafts` und Navigationseintrag „Entwürfe“ mit Zähler. Solange laufende Entwürfe existieren und die Seite offen ist, wird alle 5 Sekunden neu geladen; den Zähler aktualisiert die Navigation beim Seitenwechsel und alle 60 Sekunden.
- Ecken-Editor `label-corner-editor`: zeigt das Originalfoto mit vier ziehbaren Eckpunkten (Maus, Touch, Pfeiltasten für den gewählten Punkt) und einer Lupe am gezogenen Punkt; „Übernehmen“ sendet die Ecken normiert auf 0–1. Er wird beim nachträglichen Setzen, über „Zuschnitt anpassen“ und bei fehlenden Ecken im Entwurf geöffnet. Angezeigt wird sonst immer nur das ausgeschnittene Etikett im Hochformat 3:4.
- Entwurf öffnen → bekannter Wein: Ansicht „Wein bereits im Keller“ (wie beim Barcode) mit „Flaschen hinzufügen“ und „Trotzdem neu anlegen“; sonst `wine-form` mit Vorbelegung aus dem Entwurf (`WineFormInitial` + Markierungen „Etikett“/„Web“ je Feld + Quellenliste).
- Navigation: Übersicht, Keller, Entwürfe, Archiv, Einstellungen (mit `add-wine-racks` kommt „Regale“ als sechster dazu). Auf dem Handy wird „Entwürfe“ nur angezeigt, wenn es Entwürfe gibt, damit die Tab-Leiste nicht überladen wird.

### D9: Etikett ausschneiden (Extraktion)
- Abstraktion `ILabelImageExtractor.Extract(original, corners) → byte[]` im Application-Layer, Umsetzung `SkiaLabelImageExtractor` im Infrastructure-Projekt mit **SkiaSharp** (MIT-Lizenz, läuft unter IIS ohne zusätzliche Installation).
- Ablauf: (1) Ecken um 2 % der jeweiligen Kantenlänge zur Mitte einziehen – lieber ein schmaler Etikettrand weniger als Hintergrund. (2) Natürliches Seitenverhältnis des Etiketts aus den Kantenlängen schätzen (Mittel gegenüberliegender Kanten). (3) Homographie (4-Punkt-Abbildung, eigene kleine Funktion, unit-getestet) vom Viereck auf ein Rechteck in diesem Seitenverhältnis berechnen und mit `SKMatrix` (Perspektive) und hochwertiger Abtastung zeichnen. (4) Das Rechteck in die Zielfläche **900 × 1200 px (3:4)** proportional und zentriert einpassen; freie Fläche mit der mittleren Farbe eines schmalen Randstreifens des entzerrten Etiketts füllen (Papierfarbe). (5) Als JPEG mit Qualität 85 speichern.
- Wann: bei `accept` eines Entwurfs (aus dessen Ecken oder angepassten Ecken), bei `PUT /api/wines/{id}/label-image` und beim Anpassen der Ecken. Für die Anzeige im Entwurf erzeugt der Server nach der Recherche eine Vorschau im selben Format und speichert sie am Entwurf (`LabelPreviewImageId`).
- Ohne Ecken (Agent unsicher, nachträgliches Bild) schlägt die App ein Viereck in der Bildmitte vor (10 % Abstand zu jedem Rand) und öffnet den Editor; ein Etikettenbild entsteht erst nach Bestätigung.
- *Alternative*: Freistellen per Segmentierung (Hintergrund transparent) → zeigt weiter die Flaschenform und ist ohne eigenes Modell kaum machbar. Verworfen.
- *Alternative*: Entzerren im Browser per WebGL → doppelte Logik für Server-Vorschau und App. Verworfen.


## Risks / Trade-offs

- [Kosten pro Recherche schwanken mit der Zahl der Websuchen und gelesenen Seiten] → `max_uses` für Suche und Abruf, `effort: medium`, Tageslimit; bei der Umsetzung echte Kosten für 3–5 Beispielfotos messen und in der README angeben.
- [Fehlerkennung, z. B. falscher Jahrgang aus dem Web] → Etikett hat Vorrang, jede Angabe ist gekennzeichnet, der Benutzer prüft vor dem Speichern.
- [Prompt-Injection über Webseiten oder Etiketten] → Agent hat nur lesende Server-Tools, Ausgabe ist auf ein Schema beschränkt und wird serverseitig geprüft; Webinhalte gelten laut System-Prompt als Daten.
- [Ecken vom Modell ungenau (Abweichung von wenigen Prozent)] → 2 % Einzug, Plausibilitätsprüfung, sichtbare Vorschau und „Zuschnitt anpassen“; bei unsicheren Ecken öffnet der Editor von selbst.
- [Gewölbte Etiketten wirken an den Rändern gestaucht] → bewusst in Kauf genommen (Non-Goal), Hinweis zum geraden Fotografieren.
- [Doppelter Speicherplatz durch Originalfoto plus Etikettenbild] → Originalfoto auf 1568 px begrenzt, Etikettenbild etwa 100–200 KB; bei einem privaten Keller unkritisch.
- [Datenschutz: Fotos verlassen den eigenen Server] → Hinweis vor der ersten Nutzung; nur Etikettenfotos, keine weiteren personenbezogenen Daten in der Anfrage.
- [Hintergrunddienst unter IIS schläft ein] → AlwaysRunning/Preload dokumentieren; zusätzlich holt jeder `GET /api/captures` liegengebliebene wartende Entwürfe nach, indem er den Worker weckt.
- [Server-Tools nicht auf allen Plattformen verfügbar] → Es wird die Anthropic-API direkt genutzt; andere Anbieter sind nicht vorgesehen.
- [Konflikt mit `add-wine-racks` und `add-grape-varieties` an `WineDto`, Formular und Navigation] → Reihenfolge: Rebsorten, dann Foto-Erfassung; Regale übernehmen die Änderungen.

## Migration Plan

1. Migration `AddPhotoCapture` (neue Tabellen, Spalten `wines.LabelImageId`, `wines.LabelSourceImageId`, `wines.LabelCorners`) – keine Datenübernahme nötig.
2. API-Schlüssel lokal über User Secrets setzen (`dotnet user-secrets set Anthropic:ApiKey …` im Api-Projekt), auf dem Server über eine Umgebungsvariable `Anthropic__ApiKey` im App-Pool. Niemals in `appsettings.json` einchecken.
3. Ohne Schlüssel startet die App wie bisher, die Foto-Erfassung ist ausgeblendet.
4. Rollback: Migration zurücknehmen; Entwürfe und Etikettenbilder gehen dabei verloren.

## Umsetzungsnotizen

- **D1, kein Streaming:** Das C#-SDK (Anthropic 13.14) hat keinen dokumentierten `finalMessage`-Helfer. Der Agent nutzt deshalb eine normale Anfrage mit eigenem Zeitlimit von 5 Minuten je Versuch und `max_tokens` 16000 (der für nicht-gestreamte Anfragen empfohlene Wert). Bei `pause_turn` werden die Inhaltsblöcke unverändert (als Roh-JSON) zurückgeschickt.
- **D2, Quellen und Antwort:** Das Auslesen arbeitet auf dem Roh-JSON der Blöcke (`ResearchResponseReader`), damit es ohne Netzwerk mit aufgezeichneten Antworten testbar ist.
- **D4, Nebenläufigkeit:** Statt `RowVersion` ein `Guid`-Konkurrenztoken `Version`, das bei jedem Statuswechsel neu gesetzt wird (funktioniert identisch auf SQL Server und in den SQLite-Tests).
- **D6, keine Fremdschlüssel zu `stored_images`:** `wines.LabelImageId`/`LabelSourceImageId` und die Bild-IDs am Entwurf sind einfache Spalten ohne FK. Ein FK mit `SetNull` gäbe SQL Server einen zweiten Kaskadenpfad vom Benutzer (wie bei den Regalen). Die Services löschen die Bilder selbst.
- **D7, Zähler:** `GET /api/captures/counts` liefert `{ ready, total }` (statt nur der fertigen), damit die Navigation „Entwürfe“ auf dem Handy nur bei vorhandenen Entwürfen zeigt.
- **D9, Ecken-JSON:** Ecken werden auf 4 Nachkommastellen gerundet gespeichert (feiner als ein Pixel bei 1568 px).
- **D2, strukturierte Ausgabe (Live-Test):** `output_config.format` mit dem Schema wurde von der API abgelehnt („compiled grammar is too large“). Umgesetzt ist der vorgesehene Ausweichweg: Das Schema steht im System-Prompt, die Antwort kommt als JSON im letzten Textblock (auch in einem Codeblock toleriert) und wird von `ResearchResponseReader` streng geprüft.
- **D1, Modellwahl:** Mit `claude-haiku-5-5` nutzt der Agent die Basis-Tools `web_search_20250305`/`web_fetch_20250910` und keinen serverseitigen Refusal-Fallback (für Haiku 5.5 nicht angeboten).
- **D1, Standardmodell:** Auf Wunsch des Benutzers ist `claude-haiku-5-5` das Standardmodell (≈ 2,4 Cent statt ≈ 25–30 Cent pro Recherche). `claude-opus-5-5` bleibt per `Anthropic:Model` wählbar, z. B. für genauere Etikett-Ecken.
