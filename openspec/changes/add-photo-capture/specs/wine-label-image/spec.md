# Spec Delta

## Purpose

Ein Wein kann ein Etikettenbild haben, damit man Flaschen im Keller auf einen Blick wiedererkennt. Das Etikettenbild zeigt nur das Etikett selbst – entzerrt und in einem einheitlichen Hochformat, ohne Hintergrund und ohne Teile der Flasche. Es entsteht aus der Foto-Erfassung oder wird nachträglich hinzugefügt.

## ADDED Requirements

### Requirement: Nur das Etikett
Das System SHALL als Etikettenbild ausschließlich das Vorderetikett aus einem Foto ausschneiden. Dazu MUST es die vier Ecken des Etiketts bestimmen, das Etikett perspektivisch entzerren und alles außerhalb verwerfen. Hintergrund und Teile der Flasche (Glas, Hals, Kapsel) MUST NOT im Etikettenbild zu sehen sein; im Zweifel MUST eher ein schmaler Etikettrand fehlen als Hintergrund sichtbar sein.

#### Scenario: Schräg fotografiertes Etikett
- **GIVEN** ich habe die Flasche „Sassicaia“ leicht schräg vor einem Küchentisch fotografiert
- **WHEN** das Etikettenbild entsteht
- **THEN** zeigt es nur das Etikett, gerade ausgerichtet
- **AND** vom Tisch, vom Glas der Flasche und von der Kapsel ist nichts zu sehen

#### Scenario: Ecken aus der Foto-Erfassung
- **GIVEN** die Recherche eines Entwurfs hat die vier Ecken des Vorderetiketts erkannt
- **WHEN** ich den Entwurf öffne
- **THEN** sehe ich das ausgeschnittene Etikett und nicht das ganze Foto

### Requirement: Standardformat
Jedes Etikettenbild SHALL im Hochformat 3:4 mit 900 × 1200 Pixeln als JPEG gespeichert werden. Die Proportionen des Etiketts MUST erhalten bleiben: Passt ein Etikett nicht genau in 3:4, MUST es vollständig und zentriert eingepasst und die freie Fläche einfarbig in der gemittelten Papierfarbe des Etiketts gefüllt werden. Das Etikett MUST dabei weder verzerrt noch beschnitten werden.

#### Scenario: Hochformatiges Etikett
- **GIVEN** ein Etikett im Seitenverhältnis 3:4
- **WHEN** das Etikettenbild entsteht
- **THEN** ist es 900 × 1200 Pixel groß und das Etikett füllt die ganze Fläche

#### Scenario: Breites Etikett
- **GIVEN** ein Etikett, das breiter als hoch ist
- **WHEN** das Etikettenbild entsteht
- **THEN** ist es 900 × 1200 Pixel groß und zeigt das ganze Etikett unverzerrt in voller Breite
- **AND** oberhalb und unterhalb ist eine einfarbige Fläche in der Papierfarbe des Etiketts, aber nichts vom Foto

### Requirement: Zuschnitt prüfen und anpassen
Der Benutzer SHALL den Zuschnitt eines Etikettenbilds im Entwurf und in der Detailansicht des Weins prüfen und über „Zuschnitt anpassen“ die vier Ecken auf dem Originalfoto verschieben können; danach MUST das Etikettenbild neu entstehen. Dafür MUST das Originalfoto gespeichert bleiben, es SHALL aber nirgends angezeigt werden außer im Ecken-Editor. Das Anpassen MUST keine Recherche auslösen und nicht auf das Tageslimit angerechnet werden.

#### Scenario: Ecken korrigieren
- **GIVEN** beim Etikettenbild von „Sassicaia“ fehlt oben ein Stück des Etiketts
- **WHEN** ich „Zuschnitt anpassen“ wähle und die oberen Ecken nach oben ziehe
- **THEN** zeigt das neue Etikettenbild das ganze Etikett im Standardformat

### Requirement: Zuschnitt ohne erkannte Ecken
Konnten die Ecken des Etiketts nicht erkannt werden, SHALL der Ecken-Editor mit einem Vorschlag in der Bildmitte und dem Hinweis „Zuschnitt prüfen“ erscheinen. Ein Etikettenbild MUST erst nach Bestätigung der Ecken entstehen.

#### Scenario: Kein Etikett erkannt
- **GIVEN** die Recherche konnte die Ecken des Etiketts nicht sicher bestimmen
- **WHEN** ich den Entwurf öffne
- **THEN** sehe ich den Ecken-Editor mit einem Vorschlag in der Bildmitte und dem Hinweis „Zuschnitt prüfen“

### Requirement: Etikettenbild anzeigen
Hat ein Wein ein Etikettenbild, SHALL die App es in der Kellerliste als kleines Vorschaubild und in der Detailansicht groß anzeigen, jeweils im Hochformat 3:4. Ohne Etikettenbild MUST die bisherige Darstellung erhalten bleiben. Bilder MUST einen Textersatz mit dem Weinnamen haben.

#### Scenario: Wein aus Foto-Erfassung
- **GIVEN** ich habe „Sassicaia“ per Foto erfasst
- **WHEN** ich den Keller öffne
- **THEN** zeigt der Eintrag „Sassicaia“ ein Vorschaubild, auf dem nur das Etikett zu sehen ist

#### Scenario: Wein ohne Bild
- **GIVEN** „Zweigelt“ wurde ohne Foto angelegt
- **WHEN** ich den Keller öffne
- **THEN** wird „Zweigelt“ wie bisher ohne Bild angezeigt

### Requirement: Etikettenbild nachträglich setzen
Das System SHALL erlauben, einem Wein in der Detailansicht ein Etikettenbild aus einem Foto (JPEG, PNG oder WebP, höchstens 10 MB) hinzuzufügen oder ein vorhandenes zu ersetzen. Die Ecken des Etiketts setzt der Benutzer im Ecken-Editor (Vorschlag in der Bildmitte). Das ersetzte Etikettenbild und sein Originalfoto MUST gelöscht werden. Das Setzen MUST keine Recherche auslösen und nicht auf das Tageslimit angerechnet werden.

#### Scenario: Bild ersetzen
- **GIVEN** „Sassicaia“ hat ein Etikettenbild
- **WHEN** ich ein neues Foto wähle und die Ecken des Etiketts bestätige
- **THEN** zeigt „Sassicaia“ das neu ausgeschnittene Etikett und das alte Bild samt Originalfoto ist gelöscht

### Requirement: Etikettenbild entfernen
Das System SHALL erlauben, das Etikettenbild eines Weins zu entfernen. Dabei und beim Löschen eines Weins MUST das Etikettenbild samt Originalfoto gelöscht werden.

#### Scenario: Bild entfernen
- **WHEN** ich bei „Sassicaia“ das Etikettenbild entferne
- **THEN** hat „Sassicaia“ kein Etikettenbild mehr und Etikettenbild und Originalfoto sind gelöscht

### Requirement: Bilder sind privat
Etikettenbilder, Originalfotos und Entwurfsfotos SHALL nur für ihren Besitzer abrufbar sein; jeder Abruf MUST eine gültige Anmeldung erfordern.

#### Scenario: Fremdes Bild
- **GIVEN** Benutzerin „anna“ hat ein Etikettenbild
- **WHEN** Benutzer „ben“ dieses Bild oder das zugehörige Originalfoto abruft
- **THEN** erhält er „nicht gefunden“

#### Scenario: Ohne Anmeldung
- **WHEN** jemand ein Bild ohne Anmeldung abruft
- **THEN** wird der Abruf abgelehnt
