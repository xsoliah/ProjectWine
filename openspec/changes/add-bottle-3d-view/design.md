# Design

## Context

Siehe proposal.md – Why. Beobachtet: `ResearchPrompt` lässt den Agenten `labelCorners` (normiert 0–1) auf dem ersten Foto liefern; `SkiaLabelImageExtractor` entzerrt daraus ein 3:4-Bild. `rack-3d.ts` baut die Flasche mit `LatheGeometry` aus einem Profil (Radius 0,36, Länge 2,9) plus Kapsel-Zylinder und einem Etikett als Zylinderabschnitt, Farbe je Weintyp, `OrbitControls` mit begrenzter Drehung. `Wine` kennt Etikettenbild, Originalfoto, Ecken und `BottleSizeMl`.

## Goals / Non-Goals

**Goals:** Flaschenform und Etikettenlage aus dem Foto, Flaschenbild freigestellt, größengetreue 3D-Ansicht, Anpassbarkeit.

**Non-Goals:** Regal mit Foto-Etiketten, Glas-/Kapselfarbe aus dem Foto, Rückseite in 3D, mehrere Flaschen pro Foto.

## Decisions

- **Ein Aufruf, erweitertes Schema.** Der Agent liefert zusätzlich `bottle` auf dem ersten Foto: `outline` (Polygon der Flasche, normiert 0–1, Vorgabe etwa 24 Punkte von Boden bis Mündung, links und rechts), daraus werden Höhe und Breiten abgeleitet, sowie `isComplete` (Mündung und Boden im Bild). Etikettenlage ergibt sich ohne weitere Angabe aus den bereits gelieferten `labelCorners` und dem Umriss. Alternative: eigenes Segmentierungsmodell (z. B. ONNX) – genauer, aber neue Abhängigkeit und Modell im Deployment; vorerst nicht nötig. Alternative: zweiter Agentenaufruf – verdoppelt Kosten und Limit-Verbrauch.
- **Flaschenmaß als kleines JSON an `Wine`** (`BottleShapeJson`): Profil als Liste `(höhe, radius)` relativ zur Flaschenhöhe (aus Umriss, links/rechts gemittelt und geglättet), Etikett als `top`, `bottom`, `widthFraction`, `centerAngle` relativ zur Flasche. Spalte `Wine.BottleImageId` für das Flaschenbild. Maß und Bild sind aus Originalfoto und Eingaben jederzeit neu berechenbar.
- **Größentreue.** Maße bleiben relativ zur Flaschenhöhe; absolute Größe in der 3D-Ansicht kommt aus `BottleSizeMl` (750 ml ≈ 30 cm Höhe, Radius aus dem Profil). Die Etikettenbreite wird aus dem Foto als Anteil am sichtbaren Körperdurchmesser bestimmt und mit dem Umfang des Zylinders in einen Winkel umgerechnet. Die Rundung des Etiketts im Foto wird nicht herausgerechnet (Näherung, siehe Risiken).
- **Freistellen per Polygonmaske** mit SkiaSharp (bereits vorhanden): Umriss als Clip, Ergebnis als PNG mit Alpha, auf 1600 px begrenzt. Kein Hintergrundentfernen per KI.
- **Rückfall Standardflasche**: `isComplete == false` oder kein Umriss → Profil aus `rack-3d` (nach Weintyp/-größe), Etikettenlage geschätzt (unteres Drittel mittig), Status „Flasche prüfen“, kein Flaschenbild bis zur Bestätigung.
- **Editor**: erweitert den bestehenden Ecken-Editor um zwei Griffe für Umriss (Höhe und Breite je Abschnitt) und einen Rahmen für die Etikettenlage; Änderungen laufen über `PUT /api/wines/{id}/bottle-shape`, ohne Agent.
- **3D-Komponente `bottle-3d`**: nutzt das Profil aus dem Flaschenmaß (`LatheGeometry`), das Etikettenbild als Textur auf einem Zylinderabschnitt an Etikettenlage (Radius leicht über Glas), `MeshStandardMaterial` in der Typfarbe wie `rack-3d`; Profil-/Konstanten-Code aus `rack-3d` wird in ein gemeinsames Modul ausgelagert. `OrbitControls` mit begrenzter Drehung, Tastatursteuerung, Rendern nur bei Änderung, Aufräumen bei Zerstörung, WebGL-Prüfung mit Rückfall.
- **Nachträgliches Erkennen** nutzt den vorhandenen Forschungspfad mit nur dem Originalfoto und zählt aufs Limit.

## Risks / Trade-offs

- [Agent liefert ungenaue Umrisse] → Plausibilitätsprüfung (Fläche, Seitenverhältnis, Symmetrie), sonst Rückfall; Editor zum Korrigieren.
- [Schräg oder von nahem fotografierte Flaschen verfälschen Maße] → Hinweis im Aufnahmedialog (Flasche aufrecht, ganz im Bild); Editor.
- [Etikettenbreite aus ebenem Foto ist bei gewölbtem Etikett zu klein am Rand] → Näherung akzeptiert; Winkelbreite wird auf maximal Umfang begrenzt.
- [Mehr Ausgabe pro Recherche, eventuell Kosten und Dauer höher] → bei der Umsetzung messen und in der README notieren.
- [Überschneidung mit `add-photo-capture` und `add-wine-back-label`] → nach Abschluss von `add-photo-capture` umsetzen; Detailansicht gemeinsam abstimmen.

## Migration Plan

Migration `AddBottleShape` fügt nullable Spalten hinzu; bestehende Weine behalten ihre Darstellung und können über „Flasche erkennen“ nachgezogen werden. Rollback durch Zurücknehmen der Migration.

## Open Questions

- Soll die Rückseite später in der 3D-Ansicht auf die Rückseite der Flasche gelegt werden (Folgechange)?
