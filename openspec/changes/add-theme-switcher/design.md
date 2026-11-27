## Context

Beobachtet: `web/src/styles.css` definiert Tokens in `:root` (Hell) und überschreibt sie per `@media (prefers-color-scheme: dark)`; Komponenten-CSS nutzt diese Variablen, einige Stellen haben feste Hex-Werte (`app.css` Navigation, `rack-3d.ts` Holz, `scanner-overlay.ts`, `bottle-3d.ts`). `shared/dx/dx-theme.ts` lädt `dx/dx.light.css` oder `dx.dark.css` anhand der Medienabfrage und wartet per Top-Level-await. `StorageService` kapselt `localStorage`/Capacitor-Preferences (asynchron). Die Einstellungsseite hat keinen Design-Bereich. `index.html` hat ein festes `theme-color`.

Annahmen: „fancy“ heißt Farbigkeit, Verläufe und weiche Übergänge, keine neue Bedienung. Palette und Anzahl sind ein Vorschlag und bleiben als Daten leicht änderbar.

## Decisions

1. **Themes über `data-theme` am `<html>`**: Tokens je Theme in `styles.css` als `:root[data-theme='nacht'] { … }`. „Klassik“ setzt kein Attribut und behält die Medienabfrage; die festen Themes setzen alle Tokens vollständig, damit der Gerätemodus keinen Einfluss hat. `color-scheme` je Theme (`light`/`dark`), Klassik `light dark`.
2. **Katalog als Daten** (`core/themes.ts`): `{ id, title, scheme: 'light'|'dark'|'auto', themeColor, swatch[] }`. Einstellungsseite, Service und DevExtreme lesen nur den Katalog.
3. **`ThemeService`** (`core/theme.service.ts`): Signal `theme`, `set(id)` setzt `data-theme` und `meta[theme-color]` und speichert über `StorageService` (`theme`); `effective()` liefert hell/dunkel (bei Klassik aus der Medienabfrage). Ungültige Werte fallen auf Klassik zurück (reine Funktion `parseTheme`, getestet).
4. **Kein Flackern**: kleines Inline-Skript in `index.html` liest `localStorage['theme']` synchron und setzt `data-theme` vor dem Rendern. Auf Native (asynchrone Capacitor-Preferences) schreibt der Service zusätzlich einen `localStorage`-Spiegel, damit das Skript auch dort greift. Skript und Service nutzen denselben Schlüssel.
5. **DevExtreme** (`dx-theme.ts`): hört auf `ThemeService.effective()` statt auf die Medienabfrage und tauscht `href` zwischen `dx.light.css` und `dx.dark.css` (beide bereits Assets). Eine kleine Überbrückung (CSS-Variablen auf DevExtreme-Klassen) färbt Akzent und Hintergrund passend, ohne eigene DevExtreme-Themes zu bauen.
6. **Weitere feste Farben** werden zu Tokens (`--nav-bg`, `--nav-ink`, `--nav-active`, `--header-gradient`, `--glow`, `--scene-bg`, `--wood`). Heatmap (`heat-1…4`) und Diagramm (`--chart-*`) bekommen je Hell/Dunkel eine geprüfte Variante.
7. **3D**: `rack-3d.ts`/`bottle-3d.ts` lesen Hintergrund und Holz bei Szenenaufbau und bei Themewechsel aus den Tokens (`getComputedStyle`), ohne die Szene neu aufzubauen.
8. **Übergang**: kurzes `transition` auf `background-color`, `color`, `border-color` nur während des Wechsels (Klasse `theme-changing`, ca. 250 ms), nicht dauerhaft; entfällt bei `prefers-reduced-motion`.
9. **Auswahl-UI**: Radiogruppe mit Kacheln (Farbmuster, Name, Sonne/Mond-Symbol) in `settings.html` oberhalb „Stammdaten“, auch ohne Anmeldung sichtbar; die Login-Seite folgt dem gemerkten Theme.
10. **Themes (Vorschlag)**: Klassik (Auto), Pergament (hell, Bordeaux/Gold wie bisher), Nacht (dunkel, neutral mit Gold), Bordeaux (dunkel, tiefrot/Gold), Riesling (hell, Salbeigrün/Gold), Rosé (hell, Rosa/Pfirsich mit Beerenakzent).

## Risks / Trade-offs

- Kontrast ist pro Theme zu prüfen (Texte, Badges, Heatmap, Weinart-Farben); ein Test prüft Token-Paare per Kontrastfunktion.
- Übersehene feste Hex-Werte fallen in dunklen oder farbigen Themes auf; eine Suche nach Hex in `*.ts/*.css` und Sichtprüfung je Theme und Seite sind Teil der Aufgaben.
- Der DevExtreme-Wechsel zur Laufzeit lädt ein anderes Stylesheet; kurzes Flackern möglich, durch Vorladen des zweiten Stylesheets abgemildert.
- Native: asynchrone Preferences könnten verspätet greifen; durch den `localStorage`-Spiegel abgefangen.
