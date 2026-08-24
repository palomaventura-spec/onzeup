@echo off
setlocal
set "PROJECT=C:\Users\User\Documents\onzeup"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\v160c1"

echo ==========================================
echo ONZEUP v1.6.0-c.1 - Correcao PDF QTR
echo ==========================================

if not exist "%PROJECT%\package.json" (
  echo ERRO: Projeto nao encontrado em %PROJECT%
  pause
  exit /b 1
)

if not exist "%BACKUP%" mkdir "%BACKUP%"
if not exist "%BACKUP%\src\components\qtr" mkdir "%BACKUP%\src\components\qtr"
copy /Y "%PROJECT%\src\components\qtr\QtrEditor.tsx" "%BACKUP%\src\components\qtr\QtrEditor.tsx" >nul
if errorlevel 1 (
  echo ERRO ao criar backup.
  pause
  exit /b 1
)

copy /Y "%~dp0files\src\components\qtr\QtrEditor.tsx" "%PROJECT%\src\components\qtr\QtrEditor.tsx" >nul
if errorlevel 1 (
  echo ERRO ao atualizar QtrEditor.tsx
  pause
  exit /b 1
)

cd /d "%PROJECT%"
if exist .next rmdir /S /Q .next >nul 2>&1

echo.
echo Rodando build...
call npm run build
if errorlevel 1 (
  echo.
  echo ERRO: build falhou. Nao faca git push.
  pause
  exit /b 1
)

echo.
echo ==========================================
echo SUCESSO: ONZEUP v1.6.0-c.1 aplicado.
echo ==========================================
echo Agora teste QTR ^> Gerar PDF.
pause
