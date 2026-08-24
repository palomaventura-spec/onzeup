@echo off
setlocal
set "TARGET=C:\Users\User\Documents\onzeup"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\v160a"
if not exist "%TARGET%\src\app\globals.css" (
  echo ERRO: projeto ONZEUP nao encontrado em %TARGET%
  pause
  exit /b 1
)
if not exist "%BACKUP%" mkdir "%BACKUP%"
copy /Y "%TARGET%\src\app\globals.css" "%BACKUP%\globals.css" >nul
if exist "%TARGET%\src\app\v160a.css" copy /Y "%TARGET%\src\app\v160a.css" "%BACKUP%\v160a.css" >nul
copy /Y "%~dp0files\src\app\globals.css" "%TARGET%\src\app\globals.css" >nul || goto :error
copy /Y "%~dp0files\src\app\v160a.css" "%TARGET%\src\app\v160a.css" >nul || goto :error
echo.
echo ==========================================
echo ONZEUP v1.6.0-a aplicada com sucesso.
echo ==========================================
echo Refinamento visual completo do Club aplicado.
echo Nenhuma alteracao de Prisma ou logica funcional.
echo Backup: %BACKUP%
echo.
echo Agora rode na pasta do projeto: npm run build
pause
exit /b 0
:error
echo ERRO ao aplicar a atualizacao.
pause
exit /b 1
