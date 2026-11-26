## Context

`dev.ps1` startet `dotnet run` (API, :5000) und `npm start` (Angular-Dev-Server, :4200, Proxy `/api` → API über `web/proxy.conf.mjs`). Der Dev-Server lauscht standardmäßig nur auf `localhost`, ein Handy im WLAN kommt nicht heran.

## Goals / Non-Goals

**Goals:**
- Ein Scan genügt, um die Dev-Oberfläche auf dem Handy zu öffnen; der QR-Code erscheint direkt in der Konsole.
- Keine Änderung an Produktionsbuild, API oder Datenbank.
- Fehler bei Netzwerkermittlung oder QR-Ausgabe dürfen den Dev-Start nie verhindern.

**Non-Goals:**
- HTTPS im Dev-Server. Browser erlauben Kamerazugriff nur in sicheren Kontexten; über `http://<LAN-IP>` funktioniert die Kamera-Barcode-Erfassung auf dem Handy daher nicht. Layout, Navigation und Daten lassen sich aber testen. Kamera per Capacitor/HTTPS wäre ein eigener Change.
- Zugriff aus fremden Netzen, Tunneling.

## Decisions

- **Host-Bindung per CLI**: `dev.ps1` hängt `--host 0.0.0.0` an `ng start`, statt `angular.json` zu ändern. So bleibt `npm start` allein lokal; nur der Dev-Start per Skript öffnet das Netz.
- **LAN-Adresse ermitteln** in PowerShell: IPv4 der Schnittstelle mit Standard-Gateway (`Get-NetIPConfiguration`), ohne APIPA-Adressen (169.254.x.x). Bei mehreren Treffern der erste; die URL steht zusätzlich als Text, sodass eine falsche Wahl erkennbar ist.
- **QR-Erzeugung per Node-Skript** `web/scripts/qr.mjs` mit Dev-Abhängigkeit `qrcode-terminal` (Ausgabe in Terminal-Blockzeichen). PowerShell hat keine QR-Funktion; ein eigener Encoder wäre unnötiger Aufwand. Das Skript bekommt die URL als Argument.
- **Zeitpunkt**: Innerhalb der bestehenden 500-ms-Warteschleife in `dev.ps1` wird geprüft, ob der Frontend-Port lauscht (Timeout ca. 120 s); dann einmalig QR-Ausgabe. Timeout → Hinweis statt QR-Code.
- **UTF-8-Ausgabe**: Konsolen-Encoding für die QR-Ausgabe auf UTF-8 setzen, damit die Blockzeichen korrekt erscheinen.
- **Windows-Firewall**: Beim ersten Start fragt Windows ggf. nach Netzwerkfreigabe für Node; das wird im README dokumentiert, das Skript ändert keine Firewall-Regeln.

## Risks / Trade-offs

- Mehrere Netzwerkadapter (VPN, Hyper-V, WSL) → evtl. falsche IP im QR-Code → Text-URL und `-NoQr` bleiben verfügbar; Adapter mit Gateway wird bevorzugt.
- Dev-Server samt Proxy auf die Dev-API ist im lokalen Netz sichtbar → nur in vertrauenswürdigen Netzen nutzen; im README erwähnt.
- Angular-Dev-Server prüft den Host-Header; IP-Adressen sind erlaubt, Rechnernamen nicht → deshalb wird die IP statt des Rechnernamens verwendet.

## Nachtrag (Umsetzung)

Auf main existierte bereits der Schalter `-Lan` (HTTPS, `--host 0.0.0.0`, Textausgabe der URLs, Firewall-Hinweis). Der QR-Code erweitert diesen Modus, statt ein zweites Netzwerk-Verfahren einzuführen: Er erscheint nur mit `-Lan`, die URL ist `https://<LAN-IP>:<Port>`. Damit entfällt auch die Einschränung zur Kamera (HTTPS ist vorhanden); der Non-Goal „HTTPS“ ist erledigt. Aufgaben 2.3 (Host-Bindung) war durch `-Lan` bereits erfüllt.
