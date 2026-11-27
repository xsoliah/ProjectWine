# Tasks

## 1. Standardansicht

- [x] 1.1 In `web/src/app/pages/wine-detail/wine-detail.ts` den Startwert von `view` auf `'3d'` setzen, eine abgeleitete aktive Ansicht ergänzen, die bei fehlendem WebGL `'label'` liefert, und `view` beim Wechsel der Wein-ID auf `'3d'` zurücksetzen; `wine-detail.html` nutzt die abgeleitete Ansicht für `aria-pressed`. Prüfen: `ng build` und `ng test` grün (inkl. Test für den Rückfall ohne WebGL und für das Zurücksetzen).

## 2. Abschluss

- [ ] 2.1 Sichtprüfung im Browser: Wein mit Etikett öffnet in 3D, Umschalter auf Etikett/Flasche funktioniert, erneutes Öffnen zeigt wieder 3D, Wein ohne Etikett bleibt bedienbar, WebGL deaktiviert zeigt flaches Etikett mit Hinweis und „Etikett“ als aktiv.
