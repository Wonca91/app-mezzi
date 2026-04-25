@echo off
title App Mezzi - Raspberry Pi
echo.
echo  ==========================================
echo   App Mezzi - apertura sul Raspberry Pi
echo  ==========================================
echo.

REM Apre l'app sul Pi via Tailscale
start "" "http://100.83.67.14:5001/mobile"

echo  Browser aperto su http://100.83.67.14:5001/mobile
echo  (assicurati che Tailscale sia attivo)
echo.
timeout /t 3 > nul
