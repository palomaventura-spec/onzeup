@echo off
setlocal
set "PROJECT=C:\Users\User\Documents\onzeup"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\v160b2"
set "PATCH=%~dp0files"

echo ==========================================
echo ONZEUP v1.6.0-b.2
echo Dashboard sincronizado com cortesia
echo ==========================================

if not exist "%PROJECT%\package.json" (
  echo ERRO: projeto nao encontrado em %PROJECT%
  pause
  exit /b 1
)

if not exist "%BACKUP%" mkdir "%BACKUP%"
if not exist "%BACKUP%\src\components" mkdir "%BACKUP%\src\components"
if not exist "%BACKUP%\src\app" mkdir "%BACKUP%\src\app"

copy /Y "%PROJECT%\src\components\ClubPlanStatusCard.tsx" "%BACKUP%\src\components\ClubPlanStatusCard.tsx" >nul
copy /Y "%PROJECT%\src\app\v160b1.css" "%BACKUP%\src\app\v160b1.css" >nul

copy /Y "%PATCH%\src\components\ClubPlanStatusCard.tsx" "%PROJECT%\src\components\ClubPlanStatusCard.tsx" >nul
if errorlevel 1 goto :error
copy /Y "%PATCH%\src\app\v160b1.css" "%PROJECT%\src\app\v160b1.css" >nul
if errorlevel 1 goto :error

cd /d "%PROJECT%"
if exist .next rmdir /S /Q .next

echo.
echo Arquivos aplicados. Rodando build...
call npm run build
if errorlevel 1 goto :builderror

echo.
echo ==========================================
echo SUCESSO: ONZEUP v1.6.0-b.2 aplicado.
echo ==========================================
echo Corrigido:
echo - Dashboard reconhece acesso Cortesia
echo - remove mensagem de assinatura mensal em cortesia
echo - mostra prazo e motivo quando existentes
echo - Assinatura e Dashboard usam o mesmo accessStatus
echo.
echo Backup: %BACKUP%
echo NAO faca git push antes do teste visual.
pause
exit /b 0

:builderror
echo.
echo ERRO: arquivos aplicados, mas o build falhou.
echo Nao faca git push. Envie o erro para revisao.
pause
exit /b 1

:error
echo.
echo ERRO ao copiar os arquivos da atualizacao.
pause
exit /b 1
