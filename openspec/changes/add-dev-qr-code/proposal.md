## Why

Beim Entwickeln will ich die Web-Oberfläche schnell auf dem Handy ausprobieren (Touch-Bedienung, Layout). Dafür muss ich heute die IP-Adresse des Rechners herausfinden, den Port zusammensetzen und die URL am Handy abtippen – und der Angular-Dev-Server ist ohnehin nur über `localhost` erreichbar.

## What Changes

- `dev.ps1` (und damit `dev.cmd`) ermittelt beim Start die LAN-Adresse des Rechners und startet den Angular-Dev-Server so, dass er im lokalen Netz erreichbar ist.
- Sobald das Frontend läuft, gibt `dev.ps1` einen **QR-Code in der Konsole** aus, der die Netzwerk-URL (z. B. `http://192.168.1.23:4200`) enthält; zusätzlich wird die URL als Text angezeigt.
- Neuer Schalter `-NoQr`, um die Ausgabe zu unterdrücken; findet sich keine LAN-Adresse, startet die Entwicklung wie bisher mit einem Hinweis statt QR-Code.
- Die QR-Code-Erzeugung läuft über ein kleines Node-Skript im `web/`-Projekt (Dev-Abhängigkeit), damit `dev.ps1` keine eigene QR-Logik braucht.

## Capabilities

### New Capabilities
- `dev-mobile-access`: Verhalten des Entwicklungsstarts, damit die laufende Entwicklungsinstanz per QR-Code vom Handy im selben Netz geöffnet werden kann.

### Modified Capabilities

(keine)

## Impact

- `dev.ps1`, `README.md` (Abschnitt „Erster Start“), `web/package.json` (+ `package-lock.json`, neue Dev-Abhängigkeit für QR-Ausgabe), neues Skript unter `web/scripts/`.
- Keine Änderung an API, Datenbank oder App-Code; nur Entwicklungswerkzeug, nicht Teil des Produktions-Builds.
- Außerhalb des Umfangs: HTTPS im Dev-Server (Kamerazugriff im Handy-Browser setzt einen sicheren Kontext voraus – siehe design.md), Zugriff über das Internet, Capacitor-Live-Reload.
