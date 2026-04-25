@echo off
title App Mezzi (locale)
echo.
echo  ==========================================
echo   App Mezzi - server locale (sviluppo)
echo  ==========================================
echo.

cd /d "%~dp0"

REM Installa Flask se manca
python -c "import flask" 2>nul || (
  echo  Installazione Flask...
  python -m pip install -r requirements.txt
)

echo  Avvio su http://127.0.0.1:5001/mobile
echo.
python app.py
