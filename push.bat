@echo off
REM App Mezzi - push one-click a GitHub
setlocal
cd /d "%~dp0"

echo.
echo === App Mezzi - Push a GitHub ===
echo.

git status --short
echo.

set /p MSG="Messaggio commit (invio = 'update'): "
if "%MSG%"=="" set MSG=update

echo.
echo [1/3] git add -A
git add -A || goto :err

echo [2/3] git commit -m "%MSG%"
git commit -m "%MSG%"
if errorlevel 1 (
  echo   ^(niente da committare, provo comunque il push^)
)

echo [3/3] git push origin main
git push origin main || goto :err

echo.
echo === OK - ora apri l'app e premi "Aggiorna ora" nel pannello Deploy ===
echo.
pause
exit /b 0

:err
echo.
echo === ERRORE - vedi sopra ===
pause
exit /b 1
