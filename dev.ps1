<#
  Startet Backend (API auf http://localhost:5000) und Frontend (Angular-Dev-Server auf http://localhost:4200)
  gemeinsam im selben Fenster. Strg+C beendet beide; stürzt einer der beiden ab, wird auch der andere beendet.
  Aufruf:  .\dev.ps1 [-ApiUrl http://localhost:5000] [-WebPort 4200] [-NoBrowser] [-Lan]
  -Lan: Frontend per HTTPS (selbst signiertes Zertifikat) im ganzen Netz erreichbar, z. B. fürs iPhone im WLAN.
        Die API bleibt auf localhost, das Handy spricht sie über den /api-Proxy des Dev-Servers an.
#>
param(
    [string]$ApiUrl = "http://localhost:5000",
    [int]$WebPort = 4200,
    [switch]$NoBrowser,
    [switch]$Lan
)

$ErrorActionPreference = "Stop"

$webDir = Join-Path $PSScriptRoot "web"
$apiProject = Join-Path $PSScriptRoot "src\WineCellar.Api"
$apiPort = ([Uri]$ApiUrl).Port

function Assert-PortFree([int]$Port, [string]$Name) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
        $proc = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
        throw "Port $Port ($Name) ist schon belegt von '$($proc.ProcessName)' (PID $($listener.OwningProcess)). " +
              "Läuft noch eine alte Instanz? Beenden mit:  Stop-Process -Id $($listener.OwningProcess)"
    }
}

function Stop-Tree($Process) {
    if ($Process -and -not $Process.HasExited) {
        # /T beendet auch Kindprozesse (dotnet run -> WineCellar.Api.exe, npm -> node)
        taskkill /PID $Process.Id /T /F 2>$null | Out-Null
    }
}

Assert-PortFree $apiPort "Backend"
Assert-PortFree $WebPort "Frontend"

if ($Lan) {
    $ruleName = "Weinkeller Dev-Server (TCP $WebPort)"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        Write-Host "==> Keine Firewall-Freigabe für Port $WebPort gefunden. Einmalig in einer Admin-PowerShell ausführen:" -ForegroundColor Yellow
        Write-Host "    New-NetFirewallRule -DisplayName `"$ruleName`" -Direction Inbound -Protocol TCP -LocalPort $WebPort -Action Allow -Profile Private" -ForegroundColor Yellow
        Write-Host "    (Das WLAN muss in Windows als 'Privates Netzwerk' eingestuft sein.)" -ForegroundColor Yellow
    }
}

if (-not (Test-Path (Join-Path $webDir "node_modules"))) {
    Write-Host "==> npm ci (node_modules fehlt)" -ForegroundColor Cyan
    Push-Location $webDir
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci fehlgeschlagen (Exit-Code $LASTEXITCODE)" }
    }
    finally { Pop-Location }
}

$api = $null
$web = $null
try {
    Write-Host "==> Backend starten ($ApiUrl, Development)" -ForegroundColor Cyan
    $previousEnv = $env:ASPNETCORE_ENVIRONMENT
    $env:ASPNETCORE_ENVIRONMENT = "Development"
    $api = Start-Process dotnet -ArgumentList @("run", "--project", "`"$apiProject`"", "--urls", $ApiUrl) `
        -WorkingDirectory $PSScriptRoot -NoNewWindow -PassThru
    $env:ASPNETCORE_ENVIRONMENT = $previousEnv
    $env:API_URL = $ApiUrl   # liest web/proxy.conf.mjs

    $scheme = if ($Lan) { "https" } else { "http" }
    Write-Host "==> Frontend starten ($($scheme)://localhost:$WebPort, Proxy auf $ApiUrl)" -ForegroundColor Cyan
    $ngArgs = @("start", "--", "--port", $WebPort)
    if ($Lan) {
        $ngArgs += @("--host", "0.0.0.0", "--ssl")
        $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
            Select-Object -ExpandProperty IPAddress
        foreach ($ip in $ips) {
            Write-Host "==> Am Handy öffnen: https://$($ip):$WebPort  (Zertifikatswarnung einmal bestätigen)" -ForegroundColor Green
        }
    }
    if (-not $NoBrowser) { $ngArgs += "--open" }
    $web = Start-Process npm.cmd -ArgumentList $ngArgs -WorkingDirectory $webDir -NoNewWindow -PassThru

    # Warten, bis einer der beiden endet (Absturz) oder Strg+C gedrückt wird
    while (-not $api.HasExited -and -not $web.HasExited) { Start-Sleep -Milliseconds 500 }

    if ($api.HasExited) { Write-Host "==> Backend wurde beendet, Frontend wird gestoppt." -ForegroundColor Red }
    else { Write-Host "==> Frontend wurde beendet, Backend wird gestoppt." -ForegroundColor Red }
}
finally {
    Write-Host "==> Beende Backend und Frontend" -ForegroundColor Cyan
    Stop-Tree $web
    Stop-Tree $api
    Remove-Item Env:API_URL -ErrorAction SilentlyContinue
}
