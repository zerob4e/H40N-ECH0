@echo off
setlocal
cd /d "%~dp0"
start "MIRROR-07 LOCAL RELAY" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8765
ping 127.0.0.1 -n 2 >nul
start "" "http://localhost:8765/"
exit /b 0
