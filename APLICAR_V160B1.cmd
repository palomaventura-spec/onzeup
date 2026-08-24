@echo off
setlocal
set "PROJECT=C:\Users\User\Documents\onzeup"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\v160b1"
set "PATCH=%~dp0files"

echo.
echo ==========================================
echo ONZEUP v1.6.0-b.1
echo Cortesia sincronizada + Super Admin Light
echo ==========================================
echo.

if not exist "%PROJECT%\package.json" (
  echo ERRO: projeto nao encontrado em %PROJECT%
  pause
  exit /b 1
)

taskkill /F /IM node.exe >nul 2>nul

if not exist "%BACKUP%" mkdir "%BACKUP%"
if not exist "%BACKUP%\src\app\(app)\planos" mkdir "%BACKUP%\src\app\(app)\planos"
if not exist "%BACKUP%\src\app\admin" mkdir "%BACKUP%\src\app\admin"
if not exist "%BACKUP%\src\app" mkdir "%BACKUP%\src\app"

copy /Y "%PROJECT%\src\app\(app)\planos\page.tsx" "%BACKUP%\src\app\(app)\planos\page.tsx" >nul
copy /Y "%PROJECT%\src\app\admin\layout.tsx" "%BACKUP%\src\app\admin\layout.tsx" >nul
copy /Y "%PROJECT%\src\app\globals.css" "%BACKUP%\src\app\globals.css" >nul
if exist "%PROJECT%\src\app\v160b1.css" copy /Y "%PROJECT%\src\app\v160b1.css" "%BACKUP%\src\app\v160b1.css" >nul

copy /Y "%PATCH%\src\app\(app)\planos\page.tsx" "%PROJECT%\src\app\(app)\planos\page.tsx" >nul || goto :copyerror
copy /Y "%PATCH%\src\app\admin\layout.tsx" "%PROJECT%\src\app\admin\layout.tsx" >nul || goto :copyerror
copy /Y "%PATCH%\src\app\v160b1.css" "%PROJECT%\src\app\v160b1.css" >nul || goto :copyerror
copy /Y "%PATCH%\src\app\globals.css" "%PROJECT%\src\app\globals.css" >nul || goto :copyerror

cd /d "%PROJECT%"
if exist .next rmdir /S /Q .next

echo.
echo Validando build...
call npm run build
if errorlevel 1 goto :builderror

echo.
echo ==========================================
echo SUCESSO: ONZEUP v1.6.0-b.1 aplicado.
echo ==========================================
echo.
echo Corrigido:
echo - Assinatura mostra Cortesia quando liberada pelo Super Admin
echo - Cortesia nao aparece mais como cobranca mensal ativa
echo - prazo e motivo da cortesia aparecem no Club
echo - Super Admin agora usa visual LIGHT profissional
echo - tabelas, cards, formularios, status e login administrativo refinados
echo.
echo Backup: %BACKUP%
echo NAO faca git push antes do teste visual.
pause
exit /b 0

:copyerror
echo ERRO ao copiar os arquivos da atualizacao.
pause
exit /b 1

:builderror
echo.
echo ERRO: o build nao passou. Nao faca git push.
echo O backup esta em %BACKUP%
pause
exit /b 1
