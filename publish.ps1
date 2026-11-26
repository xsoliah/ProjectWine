<#
  Baut Angular, legt das Ergebnis in wwwroot der API und veröffentlicht alles als IIS-fähiges Paket.
  Aufruf:  .\publish.ps1 [-Output .\publish] [-SkipWeb]
#>
param(
    [string]$Output = (Join-Path $PSScriptRoot "publish"),
    [switch]$SkipWeb
)

$ErrorActionPreference = "Stop"

function Invoke-Step([string]$Description, [scriptblock]$Command) {
    Write-Host "==> $Description" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "Schritt fehlgeschlagen: $Description (Exit-Code $LASTEXITCODE)" }
}

$webDir  = Join-Path $PSScriptRoot "web"
$apiDir  = Join-Path $PSScriptRoot "src\WineCellar.Api"
$wwwroot = Join-Path $apiDir "wwwroot"

if (-not $SkipWeb) {
    Push-Location $webDir
    try {
        Invoke-Step "npm ci"        { npm ci }
        Invoke-Step "Angular Build" { npm run build }
    }
    finally { Pop-Location }

    if (Test-Path $wwwroot) { Remove-Item $wwwroot -Recurse -Force }
    Copy-Item (Join-Path $webDir "dist\web\browser") $wwwroot -Recurse
}

Invoke-Step "dotnet publish" {
    dotnet publish (Join-Path $apiDir "WineCellar.Api.csproj") -c Release -o $Output
}

Write-Host "Fertig: $Output" -ForegroundColor Green
Write-Host "Auf den Server kopieren, dabei appsettings.Production.json (Connection String) nicht überschreiben."
