# Tasks

## 1. Domäne und API

- [x] 1.1 `BottleForm`-Enum (Bordeaux, Burgundy, Champagne, Flute) in `src/WineCellar.Domain/Enums.cs`, nullable `Wine.BottleForm`, Auflösung nach Weintyp; `BottleShape.Standard(type, form)` mit eigenen Wandprofilen je Form (Radien ≤ 0,35 relativ), Sonderskalierung für Schaumwein entfernen; Aufrufer in `BottleAnalyzer` und `CaptureProcessor` anpassen. Prüfen: Unit-Tests in `tests/WineCellar.Specs/Unit/BottleShapeTests.cs` (jede Form plausibel, Schaumwein ohne Form = Champagner).
- [x] 1.2 EF-Migration (nullable Spalte, Alt-Weine `null`), `Contracts.cs`, `Mapping.cs` und `WineService` für `bottleForm` beim Anlegen, Ändern und Lesen; unbekannter Wert wird abgelehnt. Prüfen: Reqnroll-Feature „Flaschenform“ (speichern, ändern, auf automatisch zurücksetzen, ungültig, fremder Wein nicht sichtbar).

## 2. Frontend-Grundlagen

- [x] 2.1 `web/src/app/core/bottle.ts`: `BottleForm`-Typ, Profile und Kapselmaße je Form, Auflösung nach Weintyp, `standardShape(type, form)` (ohne 1,12-Faktor), Eckwerte identisch zum Server; `models.ts` um `bottleForm` erweitern. Prüfen: `bottle.spec.ts` (Profil je Form, Radien im erlaubten Bereich, Automatik, `bottleScale` für 375/750/1500/ungültig).
- [x] 2.2 `wine-form`: Auswahl „Flaschenform“ (automatisch, Bordeaux, Burgunder, Champagner, Schlegel); `wine-detail`: Anzeige der Form. Prüfen: `ng test` grün, Formular speichert und zeigt den Wert.

## 3. 3D-Ansichten

- [x] 3.1 `shared/bottle-3d.ts`: Form und Kapsel je Form verwenden, Kamera auf `max(Normalflasche, aktuelle Flasche)` einpassen; `bottle-shape-editor` und `draft-review` reichen die Form durch. Prüfen: Sichtprüfung 375 ml kleiner als 750 ml, 1500 ml vollständig im Bild.
- [x] 3.2 `shared/rack-3d.ts`: je Form ein `InstancedMesh` mit gemeinsamen Materialien, Größenfaktor je Wein (innerhalb des Fachs, Auflage unten), Kapsel und Etikett skaliert und mit Formkapsel; Auswahl, Herausziehen und Trefferprüfung je Form. Prüfen: Tests für die Zuordnung Instanz ↔ Fach (`racks.spec.ts`, `rack-3d-look.spec.ts`) und Sichtprüfung eines gemischten Regals.

## 4. Abschluss

- [ ] 4.1 Sichtprüfung im Browser: Champagner, Burgunder, Schlegel und Bordeaux in Einzelansicht und Regal, Halbflasche und Magnum in beiden Ansichten, Wein ohne Form unverändert, Etikett sitzt auf allen Formen richtig; Profilzahlen bei Bedarf nachziehen. `dotnet test`, `ng build` und `ng test` grün.
- [ ] 4.2 Beim Archivieren: den Satz „Alle Weine MUST dasselbe Modell einer Bordeaux-Flasche verwenden“ in `openspec/specs/wine-racks/spec.md` auf Formen nach Wein anpassen; README ergänzen, falls die Flaschenansicht dort beschrieben ist.
