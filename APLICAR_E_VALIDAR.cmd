@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "TARGET=%USERPROFILE%\Documents\onzeup"
set "BACKUPROOT=%USERPROFILE%\Documents\ONZEUP_BACKUPS"
set "BACKUP=%BACKUPROOT%\v1503_final"
set "HERE=%~dp0"

if not exist "%TARGET%\package.json" (
  echo ERRO: Projeto ONZEUP nao encontrado em:
  echo %TARGET%
  echo.
  echo Este instalador deve ficar FORA da pasta do projeto.
  pause
  exit /b 1
)

if not exist "%HERE%project_files\src\app\globals.css" (
  echo ERRO: arquivos da atualizacao nao encontrados.
  pause
  exit /b 1
)

echo ==========================================
echo ONZEUP - correcao consolidada v1.5.0.3
echo ==========================================
echo.
echo 1/6 Encerrando processos Node para evitar EPERM do Prisma...
taskkill /F /IM node.exe >nul 2>&1

echo 2/6 Criando backup fora do projeto...
if not exist "%BACKUPROOT%" mkdir "%BACKUPROOT%"
if exist "%BACKUP%" rmdir /S /Q "%BACKUP%"
mkdir "%BACKUP%"
xcopy "%TARGET%\src" "%BACKUP%\src\" /E /I /H /Y >nul
copy /Y "%TARGET%\tsconfig.json" "%BACKUP%\tsconfig.json" >nul

echo 3/6 Limpando residuos de patches e caches antigos...
for /D %%D in ("%TARGET%\_backup_v150*" "%TARGET%\ONZEUP_V150*_PATCH") do if exist "%%~fD" rmdir /S /Q "%%~fD"
if exist "%TARGET%\files" rmdir /S /Q "%TARGET%\files"
if exist "%TARGET%\.next" rmdir /S /Q "%TARGET%\.next"
if exist "%TARGET%\tsconfig.tsbuildinfo" del /F /Q "%TARGET%\tsconfig.tsbuildinfo"
if exist "%TARGET%\node_modules\.prisma" rmdir /S /Q "%TARGET%\node_modules\.prisma"
for %%F in (APLICAR_V1492_CORRIGIDO.ps1 APLICAR_V1493.cmd APLICAR_V1493.ps1 APLICAR_V1494.cmd APLICAR_V1494.ps1 APLICAR_V1495.cmd APLICAR_V1495.ps1 APLICAR_V1503.cmd LEIA-ME-V1492.txt LEIA-ME-V1493.txt LEIA-ME-V1494.txt LEIA-ME-V1495.txt LEIA-ME.txt SIDEBAR_FINAL_OVERRIDE.css.txt page.tsx actions.ts club-plans.ts asaas.ts) do if exist "%TARGET%\%%F" del /F /Q "%TARGET%\%%F"

echo 4/6 Aplicando arquivos corrigidos...
xcopy "%HERE%project_files\src" "%TARGET%\src\" /E /I /H /Y >nul
copy /Y "%HERE%project_files\tsconfig.json" "%TARGET%\tsconfig.json" >nul

echo 5/6 Validando Prisma e TypeScript...
cd /D "%TARGET%"
call npx prisma validate
if errorlevel 1 goto :error
call npx prisma generate
if errorlevel 1 goto :error
call npx tsc --noEmit
if errorlevel 1 goto :error

echo 6/6 Executando build de producao...
call npm run build
if errorlevel 1 goto :error

echo.
echo ==========================================
echo SUCESSO: ONZEUP corrigido e build aprovado.
echo ==========================================
echo Backup: %BACKUP%
echo.
echo Agora voce pode executar:
echo   npm run dev
echo.
echo NAO foi feito git push.
pause
exit /b 0

:error
echo.
echo ==========================================
echo A VALIDACAO PAROU COM ERRO.
echo ==========================================
echo O projeto original foi preservado em:
echo %BACKUP%
echo.
echo Copie o erro exibido acima e envie no ChatGPT.
pause
exit /b 1
