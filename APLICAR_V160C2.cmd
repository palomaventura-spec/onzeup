@echo off
setlocal
set "PROJECT=C:\Users\User\Documents\onzeup"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\v160c2"

echo ==========================================
echo ONZEUP v1.6.0-c.2 - QTR identity + action fix
echo ==========================================

if not exist "%PROJECT%\src" (
  echo ERRO: Projeto nao encontrado em %PROJECT%
  pause
  exit /b 1
)

if exist "%BACKUP%" rmdir /S /Q "%BACKUP%"
mkdir "%BACKUP%\src\components\qtr" >nul 2>&1
mkdir "%BACKUP%\src\app\(app)\qtr" >nul 2>&1
mkdir "%BACKUP%\src\app\qtr-pdf" >nul 2>&1

if exist "%PROJECT%\src\components\qtr\QtrEditor.tsx" copy /Y "%PROJECT%\src\components\qtr\QtrEditor.tsx" "%BACKUP%\src\components\qtr\QtrEditor.tsx" >nul
if exist "%PROJECT%\src\app\(app)\qtr\page.tsx" copy /Y "%PROJECT%\src\app\(app)\qtr\page.tsx" "%BACKUP%\src\app\(app)\qtr\page.tsx" >nul
if exist "%PROJECT%\src\app\qtr-pdf\page.tsx" copy /Y "%PROJECT%\src\app\qtr-pdf\page.tsx" "%BACKUP%\src\app\qtr-pdf\page.tsx" >nul

copy /Y "%~dp0files\src\components\qtr\QtrEditor.tsx" "%PROJECT%\src\components\qtr\QtrEditor.tsx" >nul || goto :error
copy /Y "%~dp0files\src\app\(app)\qtr\page.tsx" "%PROJECT%\src\app\(app)\qtr\page.tsx" >nul || goto :error
copy /Y "%~dp0files\src\app\qtr-pdf\page.tsx" "%PROJECT%\src\app\qtr-pdf\page.tsx" >nul || goto :error

rem Compatibilidade: alguns ZIPs antigos possuem copia project_files.
if exist "%PROJECT%\project_files\src\app\(app)\qtr\page.tsx" (
  copy /Y "%~dp0files\project_files\src\app\(app)\qtr\page.tsx" "%PROJECT%\project_files\src\app\(app)\qtr\page.tsx" >nul
)
if exist "%PROJECT%\project_files\src\components\qtr\QtrEditor.tsx" (
  copy /Y "%~dp0files\project_files\src\components\qtr\QtrEditor.tsx" "%PROJECT%\project_files\src\components\qtr\QtrEditor.tsx" >nul
)

cd /d "%PROJECT%"
if exist .next rmdir /S /Q .next >nul 2>&1

echo.
echo Executando build...
call npm run build
if errorlevel 1 goto :error

echo.
echo ==========================================
echo SUCESSO: ONZEUP v1.6.0-c.2 aplicado.
echo ==========================================
echo - removido import direto de saveQtr no Client Component
echo - QTR PDF usa nome e logo do clube
echo - ONZEUP fica apenas no rodape do documento
pause
exit /b 0

:error
echo.
echo ERRO ao aplicar ou validar a versao v1.6.0-c.2.
echo Backup: %BACKUP%
pause
exit /b 1
