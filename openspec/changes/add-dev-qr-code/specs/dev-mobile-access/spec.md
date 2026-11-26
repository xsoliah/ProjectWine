# Spec Delta

## Purpose

Beim Start der Entwicklungsumgebung lässt sich die laufende Oberfläche per QR-Code auf einem Handy im selben Netzwerk öffnen, ohne Adressen abzutippen.

## ADDED Requirements

### Requirement: Dev-Start mit -Lan zeigt QR-Code zur Netzwerk-Adresse
Das System SHALL beim Start der Entwicklungsumgebung im Netzwerk-Modus (`dev.ps1 -Lan`) in der Konsole einen QR-Code ausgeben, der die im lokalen Netz erreichbare URL der Web-Oberfläche kodiert. Die URL MUST zusätzlich als Text ausgegeben werden. Der QR-Code MUST erst erscheinen, wenn die Oberfläche erreichbar ist, und MUST den tatsächlich verwendeten Frontend-Port enthalten.

#### Scenario: Start mit -Lan und Standardport
- **GIVEN** der Rechner hat die LAN-Adresse 192.168.1.23
- **WHEN** ich die Entwicklungsumgebung mit `-Lan` starte
- **THEN** erscheint in der Konsole ein QR-Code für `https://192.168.1.23:4200`
- **AND** die URL steht zusätzlich als Text darunter

#### Scenario: Anderer Port
- **GIVEN** ich starte mit dem Frontend-Port 4300
- **WHEN** die Oberfläche läuft
- **THEN** kodiert der QR-Code die URL mit Port 4300

#### Scenario: Handy öffnet die Oberfläche
- **GIVEN** das Handy ist im selben Netzwerk wie der Rechner
- **WHEN** ich den QR-Code mit der Handy-Kamera scanne und den Link öffne
- **THEN** lädt die Weinkeller-Oberfläche und kann die API nutzen

### Requirement: Oberfläche im lokalen Netz erreichbar
Das System SHALL die Web-Oberfläche im Netzwerk-Modus (`-Lan`, HTTPS) nicht nur über `localhost`, sondern auch über die LAN-Adresse des Rechners ausliefern, damit ein Handy sie öffnen kann. Der Zugriff auf die API MUST dabei über die Oberfläche (Proxy) laufen, sodass das Handy keine zweite Adresse braucht.

#### Scenario: API-Aufruf vom Handy
- **GIVEN** die Oberfläche wurde auf dem Handy über die LAN-Adresse geöffnet
- **WHEN** die Oberfläche Daten lädt
- **THEN** werden die API-Aufrufe über den Dev-Server an das Backend weitergeleitet

### Requirement: QR-Code abschaltbar und ausfallsicher
Das System SHALL den QR-Code mit der Option `-NoQr` unterdrücken lassen. Lässt sich keine LAN-Adresse ermitteln oder schlägt die QR-Ausgabe fehl, MUST die Entwicklungsumgebung trotzdem normal starten und einen kurzen Hinweis statt des QR-Codes ausgeben.

#### Scenario: Option -NoQr
- **WHEN** ich mit `-NoQr` starte
- **THEN** wird kein QR-Code ausgegeben

#### Scenario: Keine Netzwerkverbindung
- **GIVEN** der Rechner hat keine LAN-Adresse
- **WHEN** ich die Entwicklungsumgebung starte
- **THEN** laufen Backend und Frontend wie gewohnt
- **AND** ein Hinweis nennt, dass kein QR-Code erzeugt werden konnte
