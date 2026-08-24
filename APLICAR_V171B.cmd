@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "TARGET=%USERPROFILE%\Documents\onzeup"
set "BACKUPROOT=%USERPROFILE%\Documents\ONZEUP_BACKUPS"
set "BACKUP=%BACKUPROOT%\v171b"
set "HERE=%~dp0"

echo ==========================================
echo ONZEUP v1.7.1-b - Inativos no Super Admin
echo ==========================================

if not exist "%TARGET%\package.json" (
  echo ERRO: projeto ONZEUP nao encontrado em %TARGET%
  pause
  exit /b 1
)

if not exist "%HERE%files\src\app\admin\players\page.tsx" (
  echo ERRO: arquivos do patch nao encontrados.
  pause
  exit /b 1
)

if not exist "%BACKUPROOT%" mkdir "%BACKUPROOT%"
if exist "%BACKUP%" rmdir /S /Q "%BACKUP%"
mkdir "%BACKUP%"
xcopy "%TARGET%\src\app\admin" "%BACKUP%\admin\" /E /I /H /Y >nul

echo.
echo Aplicando arquivos...
xcopy "%HERE%files\src\app\admin" "%TARGET%\src\app\admin\" /E /I /H /Y >nul
if errorlevel 1 goto :fail

cd /D "%TARGET%"
if exist .next rmdir /S /Q .next

echo.
echo [1/2] Prisma validate...
call npx prisma validate
if errorlevel 1 goto :fail

echo.
echo [2/2] Build...
call npm run build
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo SUCESSO: ONZEUP v1.7.1-b aplicado.
echo ==========================================
echo Backup: %BACKUP%
echo.
echo Teste antes do push:
echo   /admin/players
echo   /admin/organizacoes
echo.
echo NAO faca git push antes dos testes.
pause
exit /b 0

:fail
echo.
echo ==========================================
echo ERRO: atualizacao interrompida.
echo ==========================================
echo Backup: %BACKUP%
pause
exit /b 1
