@echo off
setlocal
set "PROJECT=C:\Users\User\Documents\onzeup"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\v170a"

echo ==========================================
echo ONZEUP v1.7.0-a - Asaas e tolerancia
echo ==========================================

if not exist "%PROJECT%\package.json" (
  echo ERRO: Projeto nao encontrado em %PROJECT%
  pause
  exit /b 1
)

taskkill /F /IM node.exe >nul 2>&1

if not exist "%BACKUP%" mkdir "%BACKUP%"
for %%F in (
  "src\lib\auth.ts"
  "src\lib\asaas.ts"
  "src\app\api\asaas\webhook\route.ts"
  "src\app\responsavel\page.tsx"
  "src\app\responsavel\actions.ts"
  "src\app\player\[slug]\page.tsx"
  "src\app\players\page.tsx"
  "src\app\acesso-bloqueado\page.tsx"
) do (
  if exist "%PROJECT%\%%~F" (
    if not exist "%BACKUP%\%%~dpF" mkdir "%BACKUP%\%%~dpF" >nul 2>&1
    copy /Y "%PROJECT%\%%~F" "%BACKUP%\%%~F" >nul
  )
)

xcopy /E /I /Y "%~dp0files\*" "%PROJECT%\" >nul
if errorlevel 1 (
  echo ERRO ao copiar arquivos.
  pause
  exit /b 1
)

cd /d "%PROJECT%"
if exist ".next" rmdir /S /Q ".next"

echo.
echo [1/3] Prisma validate...
call npx prisma validate
if errorlevel 1 goto :error

echo.
echo [2/3] Prisma generate...
call npx prisma generate
if errorlevel 1 goto :error

echo.
echo [3/3] Build...
call npm run build
if errorlevel 1 goto :error

echo.
echo ==========================================
echo SUCESSO: ONZEUP v1.7.0-a aplicado.
echo ==========================================
echo Backup: %BACKUP%
echo NAO faca push antes de testar o fluxo local.
pause
exit /b 0

:error
echo.
echo ERRO na validacao. Nao faca Git push.
pause
exit /b 1
