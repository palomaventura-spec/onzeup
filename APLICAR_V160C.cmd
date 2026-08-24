@echo off
setlocal
set "PROJECT=C:\Users\User\Documents\onzeup"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\v160c"
set "PATCH=%~dp0files"

echo.
echo ==========================================
echo ONZEUP v1.6.0-c - QTR PDF + Conexoes
echo ==========================================
echo.

if not exist "%PROJECT%\package.json" (
  echo ERRO: projeto nao encontrado em %PROJECT%
  pause
  exit /b 1
)

rem Evita arquivos presos pelo Next/Prisma durante a atualizacao.
taskkill /F /IM node.exe >nul 2>&1

if exist "%BACKUP%" rmdir /S /Q "%BACKUP%"
mkdir "%BACKUP%\src\components\qtr" >nul 2>&1
mkdir "%BACKUP%\src\app\(app)\integracoes" >nul 2>&1
mkdir "%BACKUP%\src\app\qtr-pdf" >nul 2>&1
mkdir "%BACKUP%\src\app" >nul 2>&1

copy /Y "%PROJECT%\src\components\qtr\QtrEditor.tsx" "%BACKUP%\src\components\qtr\QtrEditor.tsx" >nul
copy /Y "%PROJECT%\src\app\(app)\integracoes\page.tsx" "%BACKUP%\src\app\(app)\integracoes\page.tsx" >nul
copy /Y "%PROJECT%\src\app\(app)\integracoes\actions.ts" "%BACKUP%\src\app\(app)\integracoes\actions.ts" >nul
copy /Y "%PROJECT%\src\app\v1503.css" "%BACKUP%\src\app\v1503.css" >nul
if exist "%PROJECT%\src\app\qtr-pdf\page.tsx" copy /Y "%PROJECT%\src\app\qtr-pdf\page.tsx" "%BACKUP%\src\app\qtr-pdf\page.tsx" >nul
if exist "%PROJECT%\src\app\qtr-pdf\QtrAutoPrint.tsx" copy /Y "%PROJECT%\src\app\qtr-pdf\QtrAutoPrint.tsx" "%BACKUP%\src\app\qtr-pdf\QtrAutoPrint.tsx" >nul

xcopy /E /I /Y "%PATCH%\*" "%PROJECT%\" >nul
if errorlevel 1 (
  echo ERRO ao copiar os arquivos.
  pause
  exit /b 1
)

cd /d "%PROJECT%"
if exist ".next" rmdir /S /Q ".next"

echo.
echo Executando Prisma validate...
call npx prisma validate
if errorlevel 1 goto :fail

echo.
echo Executando Prisma generate...
call npx prisma generate
if errorlevel 1 goto :fail

echo.
echo Executando build...
call npm run build
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo SUCESSO: ONZEUP v1.6.0-c aplicado.
echo ==========================================
echo Backup: %BACKUP%
echo.
echo Agora rode npm run dev e teste QTR e Conexoes.
echo NAO faca git push antes de confirmar os testes visuais.
pause
exit /b 0

:fail
echo.
echo ==========================================
echo ERRO: validacao/build falhou.
echo ==========================================
echo O projeto nao foi enviado ao Git. Verifique o erro acima.
pause
exit /b 1
