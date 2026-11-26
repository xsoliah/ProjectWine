@echo off
rem Startet dev.ps1 (Backend + Frontend), auch wenn die Ausfuehrung von PowerShell-Skripts deaktiviert ist.
rem Argumente werden durchgereicht, z. B.:  dev.cmd -NoBrowser
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
