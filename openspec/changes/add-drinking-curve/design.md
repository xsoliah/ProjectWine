# Design

## Context

`Wine` hat bereits `DrinkFrom`/`DrinkUntil` (Ganzzahl-Jahre). Der Recherche-Agent kann sie liefern (Feld mit Herkunft `label`/`web`); Liste, Filter, Pivot, Einlagerungsvorschlag und die Kurzanzeige `drinkWindow()` nutzen sie. Der Agent läuft pro Erfassung einmal (Tageslimit) und antwortet mit einem JSON-Schema (`ResearchSchema`); `CaptureProcessor` plausibilisiert die Werte, `ResearchResponseReader` liest sie. Siehe proposal.md für die Motivation.

## Goals / Non-Goals

**Goals:**
- Ein einfaches, erklärbares Modell: Normalverteilung um einen Höhepunkt, Breite = Streuung in Jahren.
- Schätzung ohne zusätzlichen Recherche-Aufruf bei der Erfassung (im selben Agentenlauf).
- Diagramm ohne neue Abhängigkeit, mit reiner, getesteter Kurvenlogik.

**Non-Goals:**
- Keine Ablösung des Trinkfensters; keine schiefen oder mehrgipfligen Kurven.
- Keine Statistik- oder Filterfunktionen auf Basis der Kurve.

## Decisions

1. **Zwei neue Felder statt Ersatz des Fensters.** `DrinkPeak` (Jahr) und `DrinkSpread` (σ in Jahren, > 0, höchstens 50). Das Fenster bleibt eigenständig, weil es von Liste/Filter/Pivot genutzt und bewusst gesetzt wird. Alternative „Fenster nur noch aus der Kurve berechnen“ verworfen: bricht Filter, Bestandsdaten und Quellen wie „Händler nennt 2026–2034“.
2. **Kurve auf Höhepunkt = 100 % normiert.** Wert `exp(−(t−μ)²/(2σ²))`. Große Streuung ergibt eine breite, kleine eine schmale Glocke, beide gleich hoch – so bleibt das Diagramm vergleichbar lesbar. Alternative flächennormiert (breite Kurven flacher) verworfen: wirkt, als sei ein robuster Wein „schlechter“.
3. **Einordnung über die Kurvenhöhe heute.** Wert ≥ 80 % → „Nahe am Höhepunkt“; darunter und heute < Höhepunkt → „Noch zu jung – Höhepunkt <Jahr>“; darunter und heute > Höhepunkt → „Über den Höhepunkt hinaus“. Die Schwelle ist eine Konstante in der Kurvenlogik, mit Tests.
4. **Schätzung im bestehenden Agentenlauf.** Prompt und Schema erhalten `drinkPeak` und `drinkSpread` (Feld mit Quelle `label`/`web`/`estimate`). `estimate` heißt: aus Rebsorte, Region, Jahrgang, Stil und Webangaben abgeleitet, nicht wörtlich belegt. Der Prompt gibt Orientierung für σ (leichte Weiß-/Roséweine ca. 1; typische Rotweine 2–3; große Lagerweine, Süß- und Schaumweine mit Reifepotenzial 4–8), verlangt Belege aus gefundenen Seiten und erlaubt `null`, wenn nichts Belastbares existiert. Alternative zweiter Agentenlauf verworfen (Kosten, Tageslimit).
5. **Plausibilisierung serverseitig** in `CaptureProcessor`: Höhepunkt zwischen Jahrgang (falls bekannt, sonst 1800) und aktuellem Jahr + 100, Streuung 0,5–50; fehlt eines der beiden, werden beide verworfen. Ist ein Fenster vorhanden, aber keine Kurve, wird die Kurve abgeleitet (μ = Mitte, σ = Breite / 4, mindestens 0,5) und als `derived` markiert. Ist eine Kurve vorhanden, aber kein Fenster, bleibt das Fenster leer.
6. **Ableitung auch im Frontend für Bestandsweine.** Weine mit Fenster, aber ohne gespeicherte Kurve, zeigen die abgeleitete Kurve mit Hinweis „aus dem Trinkfenster abgeleitet“, ohne Migration oder Rückschreiben. Gespeichert wird erst, wenn der Benutzer speichert oder nachschätzen lässt.
7. **Nachschätzung als eigener Aufruf.** `POST /api/wines/{id}/estimate-drinking-curve` startet eine Recherche nur mit Textangaben (Name, Winzer, Jahrgang, Art, Region, Rebsorten; keine Fotos), schreibt Höhepunkt und Streuung in den Wein und verbraucht ein Tageslimit. Die Oberfläche fragt vorher wie bei „Flasche erkennen“ nach und bestätigt zusätzlich das Überschreiben einer vorhandenen Kurve. Das Trinkfenster bleibt unberührt.
8. **Herkunftskennzeichnung nur im Entwurf.** Nur der Entwurf trägt die Quelle (`label`/`web`/`estimate`/`derived`); der Wein speichert Werte ohne Quelle. Die Einzelansicht beschriftet jede Kurve daher als „Schätzung“ (abgeleitete zusätzlich mit Hinweis), ohne Zusatzspalte.
9. **Diagramm als eigene Komponente `drinking-curve-chart`** (SVG, Breite = Container, Jahresachse mit sinnvollen Teilstrichen, Fläche unter der Kurve, gestrichelte Linie „heute“, Punkt am Höhepunkt). Berechnung in einer reinen Logikdatei (wie `donut-chart.logic.ts`, mit Vitest). Achsenbereich: μ ± 3σ, erweitert um „heute“, höchstens 40 Jahre Spanne. Farben aus den vorhandenen Theme-Variablen; Textalternative für Screenreader.

## Risks / Trade-offs

- [Schätzung wirkt genauer, als sie ist] → Kennzeichnung „Schätzung“, Quelle „geschätzt“ im Entwurf, Prompt erlaubt `web` nur für belegte Angaben; Werte bleiben editierbar.
- [Agent liefert unplausible Zahlen] → serverseitige Grenzen (Entscheidung 5), Verwerfen statt Raten.
- [Antwortschema wird größer] → nur zwei kleine Felder, kein zusätzlicher Suchlauf.
- [Nachschätzung kostet Tageslimit] → Bestätigungsdialog, nur auf Wunsch, nie automatisch für den Bestand.
- [Symmetrische Glocke passt schlecht zu Weinen mit langem Abklingen] → bewusst vereinfacht; als Nicht-Ziel dokumentiert.

## Migration Plan

Migration `AddDrinkingCurve` fügt zwei nullable Spalten an die Weintabelle; der Entwurf speichert die Werte samt Quelle im bestehenden Ergebnis-JSON, daher keine Entwurfs-Spalten; keine Datenmigration. Rollback: Spalten entfernen. Alte Clients ignorieren die neuen Felder.
