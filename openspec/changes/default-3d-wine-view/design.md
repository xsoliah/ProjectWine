# Design

## Context

`wine-detail.ts` hält die Anzeige im Signal `view` (`'label' | 'bottle' | '3d'`), Startwert `'label'`. `show3d` ist `view() === '3d' && webglOk()`; `webglOk` ist falsch, wenn `hasWebGl()` fehlschlägt oder `bottle-3d` `unavailable` meldet. Fällt `show3d` aus, rendert das Template ohnehin das flache Etikett bzw. den Platzhalter. Der Umschalter (`wine-detail.html`) ist nur sichtbar, wenn WebGL ok ist oder ein Flaschenbild existiert.

## Goals / Non-Goals

**Goals:**
- Standardansicht ist die 3D-Flasche, wenn WebGL verfügbar ist.
- Rückfall auf das flache Etikett ohne Zusatzlogik und ohne Flackern.

**Non-Goals:**
- Merken der gewählten Ansicht (Einstellung oder lokaler Speicher).
- Änderungen an Kellerliste, Regal, API oder Datenmodell.

## Decisions

- **Startwert `'3d'`**: `view = signal<'label' | 'bottle' | '3d'>('3d')`. Bei fehlendem WebGL greift `show3d` nicht, das Template zeigt bereits das flache Etikett mit Hinweis. Alternative (Startwert abhängig von `hasWebGl()`) wäre redundant. Allerdings darf der Umschalter bei Rückfall keinen Button als aktiv markieren, der nicht existiert; „Etikett“ MUST dann als aktiv gelten: `aria-pressed` für „Etikett“ wird auf eine abgeleitete Größe (`effectiveView`) gestützt, die bei `!webglOk()` und `view()==='3d'` `'label'` liefert.
- **Ansicht je Öffnen zurückgesetzt**: Die Komponente wird je Wein-Route neu erzeugt; ein Wechsel der Wein-ID bei wiederverwendeter Komponente setzt `view` auf `'3d'` zurück, damit kein Zustand vom vorigen Wein bleibt.
- **Ladezeit**: three.js ist bereits per `bottle-3d` eingebunden; falls es lazy geladen wird, bleibt der Platzhalter-Bereich in fester Höhe, damit die Seite nicht springt.

## Risks / Trade-offs

- Das Öffnen jeder Einzelansicht erzeugt einen WebGL-Kontext; auf schwachen Geräten kann das langsamer sein als ein Bild. Abmilderung: Rückfall über `unavailable` besteht, Umschalter erlaubt flache Ansicht.
- Nutzer, die vor allem das Etikett lesen wollen, brauchen einen Klick mehr; bewusst akzeptiert, da das so gewünscht ist.
