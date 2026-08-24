@echo off
setlocal
set "TARGET=C:\Users\User\Documents\onzeup"
set "PATCH=%~dp0files"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\player_filters"

if not exist "%TARGET%\src\app\players\page.tsx" (
  echo ERRO: projeto ONZEUP nao encontrado em %TARGET%
  pause
  exit /b 1
)

if not exist "%BACKUP%" mkdir "%BACKUP%"
copy /Y "%TARGET%\src\app\players\page.tsx" "%BACKUP%\page.tsx" >nul
copy /Y "%PATCH%\src\app\players\page.tsx" "%TARGET%\src\app\players\page.tsx" >nul
if errorlevel 1 (
  echo ERRO ao atualizar catalogo Player.
  pause
  exit /b 1
)

echo.
echo ==========================================
echo Filtros do ONZEUP Player atualizados.
echo ==========================================
echo.
echo Agora execute:
echo   cd /d %TARGET%
echo   npm run build
echo.
echo NAO faca git push antes do build passar.
pause
