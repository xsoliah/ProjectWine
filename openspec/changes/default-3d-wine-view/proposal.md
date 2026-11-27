# Proposal

## Why

Die Einzelansicht eines Weins zeigt heute zuerst das flache Etikettenbild; die 3D-Ansicht der Flasche muss erst über den Umschalter „3D-Ansicht“ geöffnet werden. Die 3D-Flasche mit größengetreuem Etikett ist die eigentliche Stärke der Ansicht und soll beim Öffnen eines Weins sofort zu sehen sein.

## What Changes

- Die Detailansicht öffnet standardmäßig die **3D-Ansicht** statt des flachen Etikettenbilds.
- Ist WebGL nicht verfügbar oder geht der Kontext verloren, bleibt es beim flachen Etikettenbild mit dem bestehenden Hinweis (kein Fehlerzustand beim Öffnen).
- Das flache Etikettenbild und das freigestellte Flaschenbild bleiben über den Umschalter erreichbar.
- Hat ein Wein weder Etikettenbild noch Flaschenmaß, bleibt die Ansicht bedienbar (Standardflasche ohne Etikett bzw. Platzhalter wie bisher).
- Keine Änderung an API, Datenmodell oder Kellerliste.

## Capabilities

### New Capabilities
<!-- Keine -->

### Modified Capabilities
- `wine-bottle-3d-view`: neue Anforderung „3D-Ansicht als Standardansicht“. Die Capability liegt noch im offenen Change `add-bottle-3d-view` und nicht in `openspec/specs`; dieser Change wird deshalb nach `add-bottle-3d-view` umgesetzt und archiviert und ergänzt die Capability.

## Impact

- **Frontend**: `web/src/app/pages/wine-detail/wine-detail.ts` (Startwert von `view`, Rückfall bei fehlendem WebGL) und ggf. `wine-detail.html`; Sichtprüfung im Browser.
- **Abhängigkeit**: `add-bottle-3d-view` (Komponente `bottle-3d`, Umschalter) muss vorhanden sein.
- **Nicht Teil**: 3D-Ansicht in der Kellerliste oder Regalansicht, Merken der zuletzt gewählten Ansicht, Rückseite in 3D.
