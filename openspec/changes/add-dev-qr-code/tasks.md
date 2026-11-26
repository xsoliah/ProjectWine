## 1. QR-Ausgabe im Frontend-Projekt

- [x] 1.1 `qrcode-terminal` als Dev-Abhängigkeit in `web/package.json` aufnehmen (`npm install -D`, Lockfile aktualisieren)
- [x] 1.2 `web/scripts/qr.mjs` anlegen: URL als Argument lesen, QR-Code und URL-Text ausgeben, bei fehlendem Argument mit Fehlercode enden

## 2. dev.ps1 erweitern

- [x] 2.1 Parameter `-NoQr` ergänzen und im Kommentarkopf dokumentieren
- [x] 2.2 Funktion zum Ermitteln der LAN-IPv4 (Adapter mit Standard-Gateway, ohne 169.254.x.x) ergänzen; ohne Treffer Hinweis ausgeben
- [x] 2.3 `ng start` mit `--host 0.0.0.0` starten (nur in `dev.ps1`, nicht in `angular.json`)
- [x] 2.4 In der Warteschleife prüfen, ob der Frontend-Port lauscht (Timeout ca. 120 s); danach einmalig `node web/scripts/qr.mjs http://<IP>:<Port>` aufrufen, Fehler abfangen und nur als Hinweis ausgeben
- [x] 2.5 Konsolen-Encoding für die QR-Ausgabe auf UTF-8 setzen und danach wiederherstellen

## 3. Dokumentation und Prüfung

- [x] 3.1 README-Abschnitt „Erster Start“ ergänzen: QR-Code, `-NoQr`, gleiches WLAN, Windows-Firewall-Freigabe, Hinweis zur Kamera (nur HTTPS)
- [x] 3.2 Manuell prüfen: Start mit Standardport und mit `-WebPort 4300` zeigt QR-Code mit passendem Port; Handy öffnet die Seite und lädt Daten über den Proxy
- [x] 3.3 Manuell prüfen: `-NoQr` unterdrückt den Code; ohne Netzwerk startet die Entwicklung normal mit Hinweis
