# Proposal

## Why

Heute erkennt die Foto-Erfassung nur das Etikett (vier Ecken) und speichert es als flaches 3:4-Bild. Wie groß das Etikett auf der Flasche ist und wo es sitzt, geht dabei verloren. Dadurch lässt sich der Wein weder realistisch darstellen noch in 3D zeigen. Gewünscht ist, dass das Etikett möglichst echt und größengetreu auf die Flasche übertragen wird, damit der Wein in den Ansichten gut aussieht, und dass die Einzelansicht wie das Regal eine 3D-Ansicht bekommt.

## What Changes

- Neu: Zusätzlich zu den Etikettenecken erkennt die Foto-Erfassung die **ganze Flasche** auf dem Vorderfoto: Umriss (Silhouette), Höhe und Breite von Hals, Schulter und Körper sowie die Lage des Etiketts auf der Flasche. Daraus entsteht ein **Flaschenmaß** (Flaschenform plus Position und Größe des Etiketts relativ zur Flasche) und ein **Flaschenbild** (Flasche freigestellt, transparenter Hintergrund).
- Neu: Die Erkennung läuft in derselben Recherche wie das Etikett, verursacht also keinen zusätzlichen Aufruf. Konnte die Flasche nicht sicher erkannt werden, werden eine Standardflasche nach Weintyp und Flaschengröße sowie eine geschätzte Etikettenlage verwendet, und der Benutzer wird zum Prüfen aufgefordert.
- Neu: Der Benutzer kann die erkannte Flasche prüfen und im Editor anpassen (Flaschenumriss und Etikettenlage), ohne neue Recherche und ohne Tageslimit.
- Neu: Die Einzelansicht bekommt eine **3D-Ansicht** (wie im Regal): eine drehbare Flasche mit erkannter Form, auf die das Etikett in echter Größe und Lage um den Flaschenkörper gewickelt ist. Die Ansicht lässt sich neben dem flachen Etikettenbild (und der Rückseite, falls vorhanden) umschalten.
- Neu: Kellerliste und Detailansicht nutzen das Flaschenbild, wo vorhanden, damit Etikett und Flasche stimmig aussehen. Ohne Flaschenmaß bleibt die bisherige Darstellung.
- Bestehende Weine mit Originalfoto lassen sich nachträglich über „Flasche erkennen“ auswerten (ein Aufruf, zählt auf das Tageslimit).
- `WineDto` bekommt zusätzlich `bottleImageId` und `bottleShape`; kein Breaking Change.

## Capabilities

### New Capabilities
- `bottle-recognition`: Erkennung der ganzen Flasche auf dem Foto (Umriss, Maße, Etikettenlage), Flaschenbild mit transparentem Hintergrund, Prüfen/Anpassen, Rückfall auf Standardflasche, nachträgliches Erkennen.
- `wine-bottle-3d-view`: 3D-Ansicht der Flasche in der Einzelansicht mit größengetreu aufgebrachtem Etikett.

### Modified Capabilities
<!-- Keine: `photo-capture` und `wine-label-image` stehen im offenen Change `add-photo-capture` und noch nicht in openspec/specs. Die Erkennung der Flasche wird hier als eigene Capability beschrieben. -->

## Impact

- **Abhängigkeit**: baut auf `add-photo-capture` auf (Recherche-Agent, Originalfoto, Etikettenecken, `LabelImageService`, Entwurfs-Prüfung); sollte danach umgesetzt werden. Berührt dieselben Dateien wie `add-wine-back-label` (Detailansicht); die Rückseite kann in der 3D-Ansicht später ergänzt werden (nicht Teil dieses Changes).
- **Domain/Application**: `Wine.BottleShapeJson`, `Wine.BottleImageId`; `CaptureDraft` erhält Flaschenmaß und Vorschau; `WineResearchResult` erhält `bottle` (Umrissmaße, Etikettenlage); neue Abstraktion `IBottleImageExtractor`.
- **Infrastructure**: Erweiterung von `ResearchPrompt`/`ClaudeWineResearchAgent` um das Flaschenmaß; SkiaSharp-Freistellung per Polygonmaske; Migration `AddBottleShape`.
- **API**: Flaschenmaß in Entwurf und Wein; `PUT /api/wines/{id}/bottle-shape` (anpassen), `POST /api/wines/{id}/bottle-shape/detect` (erkennen, zählt aufs Limit).
- **Frontend**: neue Komponente `bottle-3d` (three.js, Flaschenprofil aus `rack-3d` wiederverwendet), Editor für Flaschenumriss und Etikettenlage, Umschalter in der Detailansicht, Flaschenbild in der Kellerliste.
- **Kosten**: Die Recherche liefert etwas mehr Ausgabe, aber keinen zusätzlichen Aufruf; die Kosten je Recherche werden bei der Umsetzung neu gemessen.
- **Nicht Teil**: Flaschen im Regal mit echtem Etikett, Kapsel- und Glasdarstellung nach Foto, Rückseite in 3D, Erkennung mehrerer Flaschen auf einem Foto.
