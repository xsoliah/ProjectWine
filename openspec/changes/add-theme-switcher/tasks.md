## 1. Grundlagen (reine Logik mit Tests)

- [x] 1.1 `core/themes.ts`: Katalog (Klassik, Pergament, Nacht, Bordeaux, Riesling, Rosé) mit `id`, Titel, Schema, `themeColor`, Farbmuster; `parseTheme` mit Rückfall auf Klassik + Tests (unbekannt, leer, `null`)
- [x] 1.2 `core/contrast.ts` (WCAG-Kontrast) + Test, der je Theme Text/Fläche, Akzent/Fläche und Knopf-Paare prüft

## 2. Service und Start

- [x] 2.1 `core/theme.service.ts`: Signale `theme`/`effective`, `set()`, Merken über `StorageService` (+ `localStorage`-Spiegel), `data-theme`, `theme-color`; Medienabfrage nur für Klassik + Tests
- [x] 2.2 Inline-Skript in `index.html`, das das gemerkte Theme vor dem Rendern setzt; Service beim App-Start initialisieren
- [x] 2.3 `theme-changing`-Übergang (ca. 250 ms), bei `prefers-reduced-motion` ohne

## 3. Gestaltung

- [x] 3.1 `styles.css`: Tokens je Theme (`:root[data-theme=…]`), neue Tokens (`--nav-*`, `--header-gradient`, `--glow`, `--scene-bg`, `--wood`), `color-scheme` je Theme
- [x] 3.2 Feste Farben in `app.css` (Navigation) durch Tokens ersetzt, Verläufe für Navigation, Hintergrund und Hauptknöpfe; Scanner-Overlay und Bild-Editoren bleiben bewusst themeunabhängig (feste Kontrastfarben auf Fotos)
- [x] 3.3 Weinart-, Zustands-, Diagramm- und Heatmap-Farben je Hell/Dunkel-Theme abstimmen und unterscheidbar halten
- [x] 3.4 `dx-theme.ts` auf `ThemeService.effective()` umstellen, zweites Stylesheet vorladen, Akzent-Überbrückung per CSS-Variablen
- [x] 3.5 3D-Ansichten: Hintergrund kommt bereits aus den Tokens (transparente Szene), Holz bleibt bewusst naturfarben; kein Szenenumbau nötig

## 4. Einstellungen

- [x] 4.1 `settings`: Bereich „Design“ als Radiogruppe mit Kacheln (Farbmuster, Name, Sonne/Mond), Tastaturbedienung, aktives Theme markiert
- [x] 4.2 Login-Seite folgt dem gemerkten Theme

## 5. Prüfung

- [ ] 5.1 Jede Seite (Übersicht, Keller, Pivot, Archiv, Regale + 3D, Einzelwein, Entwürfe, Einstellungen, Login) in allen Themes sichten; Kontrast und übersehene Festfarben beheben
- [ ] 5.2 Wechsel bei geöffneter Tabelle/Pivot behält Filter und Anordnung; Neustart zeigt das gemerkte Theme ohne Aufblitzen
- [x] 5.3 `ng test` (157 Tests) und Build grün
