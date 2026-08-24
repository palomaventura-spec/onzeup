@echo off
setlocal
set "TARGET=C:\Users\User\Documents\onzeup"
set "PATCH=%~dp0files"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\v171_admin_nav"

echo ==========================================
echo ONZEUP v1.7.1 - Super Admin Navigation
echo ==========================================

if not exist "%TARGET%\src\app\admin\layout.tsx" (
  echo ERRO: projeto ONZEUP nao encontrado.
  pause
  exit /b 1
)

if not exist "%BACKUP%" mkdir "%BACKUP%"
copy /Y "%TARGET%\src\app\admin\layout.tsx" "%BACKUP%\layout.tsx" >nul
if exist "%TARGET%\src\app\admin\AdminShell.tsx" copy /Y "%TARGET%\src\app\admin\AdminShell.tsx" "%BACKUP%\AdminShell.tsx" >nul
if exist "%TARGET%\src\app\admin\admin-shell.css" copy /Y "%TARGET%\src\app\admin\admin-shell.css" "%BACKUP%\admin-shell.css" >nul

copy /Y "%PATCH%\src\app\admin\layout.tsx" "%TARGET%\src\app\admin\layout.tsx" >nul || goto :fail
copy /Y "%PATCH%\src\app\admin\AdminShell.tsx" "%TARGET%\src\app\admin\AdminShell.tsx" >nul || goto :fail
copy /Y "%PATCH%\src\app\admin\admin-shell.css" "%TARGET%\src\app\admin\admin-shell.css" >nul || goto :fail

cd /d "%TARGET%"
if exist .next rmdir /S /Q .next

echo.
echo Rodando build...
call npm run build
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo SUCESSO: navegacao do Super Admin aplicada.
echo ==========================================
echo Backup: %BACKUP%
echo NAO faca git push antes de testar visualmente.
pause
exit /b 0

:fail
echo.
echo ERRO: atualizacao interrompida. Nao faca git push.
pause
exit /b 1
