# Weinkeller

Verwaltung deines Weinkellers: Weine per Barcode erfassen, Flaschen trinken, verkaufen oder verschenken (Archiv),
getrunkene Weine bewerten. Zugriff per Web-Oberfläche sowie Android/iOS-App.

| Schicht | Technik |
|---|---|
| Backend | ASP.NET Core (net10.0), EF Core, SQL Server, ASP.NET Identity (Bearer-Token, mehrere Benutzer) |
| Frontend | Angular (`web/`), Capacitor für Android/iOS |
| Specs | Reqnroll (Nachfolger von SpecFlow) + xUnit, Gherkin auf Deutsch |
| Hosting | IIS, ein einziger Site: die API liefert auch das gebaute Angular aus (`wwwroot`) |

```
src/WineCellar.Domain          Entitäten + Geschäftsregeln (Wine, ConsumptionRecord)
src/WineCellar.Application     Services (WineService, ArchiveService), DTOs, Schnittstellen
src/WineCellar.Infrastructure  EF Core DbContext (SQL Server), Barcode-Lookup (Open Food Facts)
src/WineCellar.Api             Minimal-API-Endpunkte, Auth, liefert Angular aus
tests/WineCellar.Specs         Feature-Dateien (Gherkin) + Step-Definitionen
web/                           Angular + Capacitor
```

## Voraussetzungen

- .NET SDK (du hast 11 installiert; das Projekt zielt auf `net10.0`, was mit dem SDK 11 gebaut wird)
- Node.js 22+ (nur zum Bauen des Frontends)
- SQL Server (deine vorhandene Instanz)
- Auf dem Server: IIS + **ASP.NET Core Hosting Bundle** passend zur Ziel-Runtime (10.x für `net10.0`)

Willst du auf `net11.0` wechseln: `TargetFramework` in `Directory.Build.props` ändern, die Paketversionen `10.0.*`
in den `.csproj`-Dateien auf `11.0.*` anheben und auf dem Server das Hosting Bundle 11 installieren.

## Erster Start (Entwicklung)

```powershell
# 1. Datenbank-Verbindung prüfen: src/WineCellar.Api/appsettings.json (Standard: lokale Instanz, Windows-Authentifizierung)
# 2. EF-Tool wiederherstellen (lokales Tool aus dotnet-tools.json, passend zu EF Core 10)
dotnet tool restore

# 3. Backend starten (legt/migriert die Datenbank beim Start)
dotnet run --project src/WineCellar.Api --urls http://localhost:5000

# 4. Frontend im Dev-Modus (Proxy auf :5000)
cd web; npm ci; npm start
```

Schritte 3 und 4 in einem: `.\dev.ps1` startet API (Development, :5000) und Angular (:4200) zusammen im selben
Fenster und öffnet den Browser (`-NoBrowser` unterdrückt das). Strg+C beendet beide; stürzt einer ab, wird der
andere mit beendet. Sind die Ports schon belegt (alte Instanz), bricht das Skript mit einem Hinweis ab.
Andere Ports: `-ApiUrl http://localhost:5055 -WebPort 4300` (der Proxy in `web/proxy.conf.mjs` folgt `-ApiUrl`).
**Am Handy testen (iPhone/Android im selben WLAN):** `.\dev.ps1 -Lan` startet das Frontend per HTTPS mit selbst
signiertem Zertifikat im ganzen Netz und zeigt die Adresse als **QR-Code in der Konsole** an (mit der Handy-Kamera scannen; `-NoQr`
unterdrückt ihn, die Adresse steht weiterhin als Text da, z. B. `https://192.168.1.20:4200`). HTTPS ist nötig,
sonst bleibt die Kamera für den Barcode-Scan gesperrt. Die Zertifikatswarnung in Safari einmal über „Details
einblenden“ → „Diese Website besuchen“ bestätigen. Voraussetzungen: Das WLAN ist in Windows als *Privates Netzwerk*
eingestuft, und Port 4200 ist einmalig freigegeben (Admin-PowerShell):
`New-NetFirewallRule -DisplayName "Weinkeller Dev-Server (TCP 4200)" -Direction Inbound -Protocol TCP -LocalPort 4200 -Action Allow -Profile Private`.
In öffentlichen WLANs (Hotel, Flughafen) sind Geräte meist voneinander abgeschottet. Dort den PC stattdessen mit dem
persönlichen Hotspot des iPhones verbinden.
Ist die Ausführung von Skripts deaktiviert („…kann nicht geladen werden…“), stattdessen `.\dev.cmd` aufrufen.

### Datenbank-Migrationen

Das Schema wird über EF-Core-Migrationen in `src/WineCellar.Infrastructure/Migrations` verwaltet und beim Start
der API automatisch eingespielt. Nach einer Änderung am Datenmodell eine neue Migration erzeugen:

```powershell
dotnet ef migrations add <Name> --project src/WineCellar.Infrastructure --startup-project src/WineCellar.Api
```

Läuft die API gerade (gesperrte DLLs), mit `--configuration Release` bauen. Manuell einspielen:
`dotnet ef database update --project src/WineCellar.Infrastructure --startup-project src/WineCellar.Api`.

## Tests / Specs

```powershell
dotnet test
```

Die Specs (`tests/WineCellar.Specs/Features/*.feature`) laufen gegen die echten Services und eine In-Memory-SQLite-DB;
nur die externe Barcode-Datenbank und der angemeldete Benutzer sind ersetzt.

**Spec-driven weiterentwickeln:** neues Verhalten zuerst als Szenario in einer `.feature`-Datei beschreiben, `dotnet test`
(Schritt ist „pending/undefined“), Step-Definitionen ergänzen, dann Domain/Service implementieren, bis das Szenario grün ist.

Hinweis: SpecFlow wird nicht mehr weiterentwickelt, Reqnroll ist der Community-Nachfolger mit derselben Gherkin-Syntax und
fast identischen Attributen (`[Given]`, `[When]`, `[Then]`, `[Binding]`). Die Feature-Dateien sind 1:1 kompatibel.

## Deployment auf IIS

1. **Datenbank anlegen** (Beispiel, Windows-Authentifizierung über die App-Pool-Identität):
   ```sql
   CREATE DATABASE WineCellar;
   GO
   CREATE LOGIN [IIS APPPOOL\Weinkeller] FROM WINDOWS;   -- erst nach dem Anlegen des App-Pools (Schritt 3)
   USE WineCellar;
   CREATE USER [IIS APPPOOL\Weinkeller] FOR LOGIN [IIS APPPOOL\Weinkeller];
   ALTER ROLE db_owner ADD MEMBER [IIS APPPOOL\Weinkeller];
   ```
   Läuft SQL Server auf einem anderen Rechner, nimm stattdessen einen SQL-Login im Connection String.
2. **Paket bauen:** `.\publish.ps1` (baut Angular, kopiert es nach `wwwroot`, `dotnet publish` nach `.\publish`).
3. **IIS einrichten:** App-Pool „Weinkeller“ mit *Kein verwalteter Code*; neue Website auf den Publish-Ordner; HTTPS-Bindung mit Zertifikat.
   HTTPS ist Pflicht: der Kamera-Scan im Browser und die Android-App funktionieren nur über HTTPS.
4. **Connection String** in `appsettings.Production.json` im Zielordner (nicht im Repo; beim Update nicht überschreiben):
   ```json
   {
     "ConnectionStrings": { "Default": "Server=MEINSERVER;Database=WineCellar;Trusted_Connection=True;TrustServerCertificate=True" },
     "Auth": { "AllowRegistration": true }
   }
   ```
5. **Registrierung schließen:** nachdem alle Familienmitglieder ein Konto haben, `Auth:AllowRegistration` auf `false` setzen.
6. **Updates:** `app_offline.htm` in den Zielordner legen, Dateien kopieren (ohne `appsettings.Production.json`), `app_offline.htm` löschen.
   Datenbank-Änderungen werden beim Start per Migration eingespielt.

## Mobile Apps (Capacitor)

```powershell
cd web
npm run build
npx cap add android      # und/oder: npx cap add ios (nur auf macOS)
npm run cap:sync
npx cap open android
```

- Beim ersten Start der App die Server-URL eintragen (z. B. `https://wein.example.com`).
- Android: Kamera-Berechtigung ist durch das ML-Kit-Plugin abgedeckt, ggf. `AndroidManifest.xml` laut Plugin-README ergänzen.
- iOS: in `Info.plist` `NSCameraUsageDescription` setzen.
- Die CORS-Origins für die Apps (`https://localhost`, `capacitor://localhost`) stehen in `appsettings.json` unter `Cors:Origins`.

## Ansichten: Kacheln, Tabelle, Pivot

Keller, Archiv und Regale lassen sich über den Umschalter „Ansicht“ als **Kacheln** (Standard), **Tabelle** oder **Pivot**
anzeigen; die Wahl wird je Liste im Gerät gemerkt. Die Tabelle hat sortierbare Spalten (Antippen des Spaltenkopfs),
wählbare Spalten und führt per Zeile zur Einzelansicht. Filter (Suche, Weinart, Land, Region, Rebsorte, Jahrgang,
Trinkfenster, Zeitraum, Bewertung, Belegung …) wirken in allen drei Ansichten und stehen in der Adresse. Das Pivot
wertet die gefilterten Einträge als Kreuztabelle aus (z. B. Flaschen je Land und Weinart); ein Antippen einer Zelle
zeigt die zugehörigen Einträge als Tabelle. Tabelle und Pivot lassen sich als CSV exportieren (UTF-8 mit BOM,
Semikolon). Sortieren, Filtern und Pivotieren laufen im Frontend, das Backend ist unverändert.

## Barcode-Erfassung

`GET /api/wines/lookup/{barcode}` prüft zuerst deinen Keller (Flasche hinzufügen statt Duplikat), dann Open Food Facts.
Die Abdeckung für Weine ist lückenhaft: bei unbekannten Barcodes gibst du die Daten einmal manuell ein, danach erkennt
die App den Barcode aus deinem Keller.

## Foto-Erfassung (KI-Recherche)

Unter „Wein hinzufügen“ → „Per Foto erfassen“ fotografierst du das Etikett. Ein Agent (Claude Opus 5.5 mit Websuche)
recherchiert im Hintergrund Name, Weingut, Jahrgang, Herkunft, Rebsorten, Trinkfenster usw. Das Ergebnis erscheint unter
„Entwürfe“, wo du es prüfst und als Wein übernimmst. Als Etikettenbild wird nur das Etikett gespeichert: entzerrt,
ohne Hintergrund, im Hochformat 900 × 1200 px; den Zuschnitt kannst du jederzeit über „Zuschnitt anpassen“ korrigieren.

**Barcode und Foto in einer Maske:** Foto und Barcode sind dieselbe Erfassung. Auf „Wein hinzufügen“ nimmst du Vorder- und optional Rückenetikett auf; die App sucht auf beiden Fotos automatisch nach einem Barcode (EAN/UPC, Prüfziffer wird geprüft) und zeigt ihn an. Du kannst ihn ändern, scannen oder eintippen. Der Barcode wird mit dem Entwurf gespeichert und hat Vorrang vor dem, was der Agent liest. Ist der Wein per Barcode schon im Keller, bietet die Maske vor der Recherche „Flaschen hinzufügen“ an (ohne Kontingent). „Nur Barcode, ohne Foto“ bleibt als Nebenweg; ohne API-Schlüssel gilt der bisherige Barcode-Ablauf.

**API-Schlüssel einrichten** (ohne Schlüssel ist die Foto-Erfassung ausgeblendet, alles andere funktioniert):

```powershell
# lokal (User Secrets im Api-Projekt, landen nicht im Repo)
dotnet user-secrets init --project src/WineCellar.Api
dotnet user-secrets set "Anthropic:ApiKey" "<dein Schlüssel>" --project src/WineCellar.Api
```

Auf dem Server: Umgebungsvariable `Anthropic__ApiKey` im IIS-App-Pool setzen (IIS-Manager → Konfigurations-Editor →
`system.applicationHost/applicationPools` → Umgebungsvariablen), **niemals** in `appsettings*.json`.

Weitere Einstellungen (optional, `appsettings.Production.json`):

```json
{
  "Anthropic": { "Model": "claude-haiku-5-5", "Effort": "medium" },
  "PhotoCapture": { "DailyLimitPerUser": 20, "MaxParallel": 2 }
}
```

**IIS:** Die Recherche läuft als Hintergrunddienst im App-Pool. Damit er nicht einschläft, im App-Pool
„Startmodus“ = `AlwaysRunning` und bei der Website „Vorabladen aktiviert“ = `True` setzen (benötigt das IIS-Feature
„Anwendungsinitialisierung“). Liegengebliebene Entwürfe werden zusätzlich beim nächsten Öffnen der Entwurfsliste angestoßen.

**Datenschutz und Kosten:** Die Fotos werden zur Auswertung an die Anthropic-API übertragen; die App weist bei der ersten
Foto-Erfassung pro Gerät darauf hin. Jede Recherche verursacht API-Kosten; das Tageslimit pro Benutzer begrenzt sie.

**Gemessen (26.11.2026, 4 Fotos von Wikimedia Commons, Modell `claude-haiku-5-5`):** etwa 31.000 Eingabe- und 2.500
Ausgabe-Tokens plus 2 Websuchen pro Wein, rund 18 Sekunden. Kosten ≈ **2,4 Cent pro Wein**, davon 2 Cent für die
Websuchen; ein Foto ohne Wein ≈ 0,1 Cent. Haiku ist deshalb das Standardmodell. Mit `claude-opus-5-5` (40-fach teurere Tokens) wären es
grob 25–30 Cent. Haiku erkannte alle drei Weine richtig, setzte die Etikett-Ecken aber bei einem gewölbten, schräg
fotografierten Etikett zu ungenau (Glas sichtbar) – dann hilft „Zuschnitt anpassen“, oder Opus für genauere Ecken.
Für genauere Etikett-Ecken auf Opus umstellen: `"Anthropic": { "Model": "claude-opus-5-5" }`.

**Flasche und 3D-Ansicht:** Dieselbe Recherche erkennt zusätzlich die ganze Flasche (Umriss, Lage und Größe des Etiketts);
daraus entstehen ein Flaschenmaß, ein freigestelltes Flaschenbild und die drehbare 3D-Ansicht in der Einzelansicht.
Dafür die Flasche beim Fotografieren **aufrecht und ganz im Bild** halten (Mündung und Boden sichtbar). Sonst wird eine
Standardflasche mit dem Hinweis „Flasche prüfen“ gezeigt; Umriss und Etikettenlage lassen sich im Editor anpassen (ohne
Recherche, ohne Tageslimit). Bei bestehenden Weinen mit Originalfoto erkennt „Flasche erkennen“ die Flasche nachträglich
(eine Recherche, zählt aufs Tageslimit). Kosten und Dauer der erweiterten Recherche sind noch nicht mit echtem
API-Schlüssel gemessen.

## API (alle Endpunkte außer `/api/auth/*` und `/health` brauchen `Authorization: Bearer …`)

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/refresh` | Konto, Anmeldung, Token erneuern |
| GET | `/api/wines?search=&type=&inCellarOnly=` | Keller auflisten |
| GET | `/api/wines/lookup/{barcode}` | Barcode nachschlagen |
| POST/PUT/DELETE | `/api/wines`, `/api/wines/{id}` | Wein anlegen/ändern/löschen (Löschen entfernt auch das Archiv des Weins) |
| POST | `/api/wines/{id}/bottles` | Flaschen hinzufügen |
| POST | `/api/wines/{id}/consume` | Trinken/Verkaufen/Verschenken (Archiveintrag, optional mit Bewertung) |
| GET | `/api/archive?kind=` | Archiv |
| PUT | `/api/archive/{id}` | Bewertung, Notiz, Käufer/Beschenkte/r, Preis ändern |
| DELETE | `/api/archive/{id}` | Rückgängig (Flaschen kommen zurück in den Keller) |
| GET | `/api/captures/quota`, `/api/captures/counts` | Tageslimit und Verfügbarkeit; Anzahl fertiger/aller Entwürfe |
| POST | `/api/captures` | Foto-Erfassung starten (Multipart: `front`, optional `back`, `bottleCount`, `note`, `barcode`) → 202 |
| GET/DELETE | `/api/captures`, `/api/captures/{id}` | Entwürfe auflisten, ansehen, verwerfen |
| POST | `/api/captures/{id}/retry`, `/api/captures/{id}/accept` | Erneut recherchieren; übernehmen (`wineId` oder `addToWineId`) |
| PUT | `/api/captures/{id}/label-corners` | Etikett-Ecken im Entwurf anpassen |
| GET | `/api/images/{id}` | Bild (nur für den Besitzer) |
| PUT | `/api/wines/{id}/bottle-shape`, `/api/captures/{id}/bottle-shape` | Flaschenumriss und Etikettenlage anpassen (kein Limit) |
| POST | `/api/wines/{id}/bottle-shape/detect` | Flasche auf dem Originalfoto erkennen (zählt aufs Tageslimit) |
| PUT/DELETE | `/api/wines/{id}/label-image`, PUT `/api/wines/{id}/label-image/corners` | Etikettenbild setzen (Foto + Ecken), Zuschnitt anpassen, entfernen |

## Stand der Verifikation

Das Backend wurde ohne .NET SDK geschrieben und ist noch nicht kompiliert oder getestet. Erster Schritt bei dir:
`dotnet build` und `dotnet test`.
