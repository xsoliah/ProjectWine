# Design

## Context

`ConsumptionRecord.Rating` ist ein `double?` (0,5–5 in Halbschritten), das Frontend rendert es über `app-star-rating` (SVG-Sterne, halbe Füllung per Zeigerposition, Tastatur in 0,5-Schritten). Filter „Bewertung ab“, Tabellenspalte, Pivot-Dimension und Ø-Kennzahl in `archive.views.ts` arbeiten numerisch auf `rating`.

## Goals / Non-Goals

**Goals:** Zwei Stufen über 5 Sternen („Top“, „Hammer“) speichern, eingeben, anzeigen und auswerten, ohne bestehende Daten anzufassen.

**Non-Goals:** Konfigurierbare Skalen, weitere Stufen, Änderungen am API-Format.

## Decisions

1. **Numerische Kodierung: Top = 6, Hammer = 7.**
   Das Feld bleibt `double?`; Sortierung, „Bewertung ab“, Pivot und Ø funktionieren ohne Sonderfälle, und es braucht keine Migration. Alternativen: separates Enum-Feld (zweites Feld, Migration, Filter/Pivot müssten kombinieren) oder Text-Spalte (verliert numerische Auswertung). Gültig: 0,5…5 in Halbschritten sowie genau 6 und 7.
2. **Eigene Darstellung statt Sterne.**
   Bei Wert > 5 zeigt `app-star-rating` (readonly) ein Icon plus Beschriftung („Top“, „Hammer“) statt Sterne; die Icons kommen als neue SVG-Pfade in `icon.ts` (Motivvorschlag: Krone/Stern-Medaille für Top, Blitz oder Hammer für Hammer; finale Wahl bei der Umsetzung, im Stil der vorhandenen Icons). Sie nutzen Themefarben (`--gold` bzw. Akzent), damit alle Themes passen.
3. **Eingabe:** Hinter den fünf Sternen kommen zwei Felder (Top, Hammer). Bei Top/Hammer erscheinen die fünf Sterne voll, das gewählte Feld ist hervorgehoben. Das Tastatur-Stepping läuft über die geordnete Stufenliste [0.5 … 5, 6, 7]; `aria-valuemax` wird 7, `aria-valuetext` die Beschriftung.
4. **Logik zentral in `star-rating.logic.ts`:** Konstanten für Top/Hammer, Stufenliste, Schritt, Label, `isTier`. UI und `archive.views.ts` nutzen sie (Spaltenformat, Filteroptionen, Pivot-Beschriftung); `ratingLabel` liefert „Top“/„Hammer“ bzw. „x von 5 Sternen“.
5. **Backend-Validierung:** `EnsureValidRating` erlaubt 0,5…5 in Halbschritten oder exakt 6 bzw. 7; die Fehlermeldung nennt alle erlaubten Stufen und enthält weiter „Bewertung“.
6. **Ø-Anzeige:** Der Durchschnitt wird numerisch (Top = 6, Hammer = 7) berechnet und mit einer Nachkommastelle als Zahl gezeigt; eine Rückübersetzung in Icons ist bewusst ausgespart.

## Risks / Trade-offs

- Die Zahlen 6/7 sind ein Kodierungsdetail der API; Clients müssen die Stufen kennen. Dokumentation im README ergänzen.
- Ø über Stufenpunkte ist inhaltlich eine Näherung; akzeptabel, da die Skala persönlich ist.
- Die Icon-Optik muss in allen Themes lesbar bleiben (visuell prüfen).
