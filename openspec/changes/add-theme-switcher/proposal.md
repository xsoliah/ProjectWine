## Why

Die App kennt nur ein Design (warmes Pergament/Bordeaux) und folgt dem Gerät nur beim Hell/Dunkel-Wechsel. Manche wünschen sich es farbiger, andere dunkler oder heller. Ein umschaltbares Theme-Angebot macht die App persönlicher und moderner.

## What Changes

- Neue Einstellung „Design“ mit Vorschaukacheln; die Wahl gilt sofort und wird auf dem Gerät gemerkt.
- Sechs Themes: **Klassik** (bisheriges Design, folgt weiter hell/dunkel des Geräts, Vorgabe), **Pergament** (immer hell), **Nacht** (immer dunkel), **Bordeaux** (dunkel, kräftig rot mit Gold), **Riesling** (hell, frisches Grün mit Gold), **Rosé** (hell, Rosa- und Pfirsichtöne).
- Alle Themes über dieselben CSS-Variablen; zusätzlich Verlauf im Kopf/Navigation, weiche Übergänge beim Wechsel (außer bei „weniger Bewegung“).
- DevExtreme (Tabelle, Pivot), Diagramme, Heatmap, 3D-Ansichten, `theme-color` und `color-scheme` folgen dem gewählten Theme.
- Kein Flackern beim Start: gemerktes Theme wird vor dem ersten Rendern angewendet.

Nicht Teil: eigene Farbwähler, Schriftwahl, Zeitplan (z. B. „nachts dunkel“), Speichern pro Konto auf dem Server.

## Capabilities

### New Capabilities
- `app-theming`: Auswahl, Anwenden und Merken von Themes; Geltung für alle Oberflächen inkl. DevExtreme und 3D.

### Modified Capabilities
<!-- keine bestehende Spezifikation ändert ihr Verhalten -->

## Impact

- `web/src/styles.css` (Tokens je Theme), `web/src/index.html` (Vorab-Skript), `web/src/app/core/theme.service.ts` (neu), `web/src/app/core/themes.ts` (Katalog), Einstellungsseite (`settings.html/.ts`), `app.css` (Navigation), `shared/dx/dx-theme.ts`, `rack-3d.ts`/`bottle-3d.ts` (Hintergrund/Holz je Theme), Pivot-Heatmap- und Diagrammfarben.
- Keine Backend- oder Datenbankänderung; Speicherung über `StorageService` (`theme`).
