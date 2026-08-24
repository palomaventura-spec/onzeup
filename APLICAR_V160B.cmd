@echo off
setlocal
set "TARGET=C:\Users\User\Documents\onzeup"
set "BACKUP=C:\Users\User\Documents\ONZEUP_BACKUPS\v160b"
set "HERE=%~dp0"

echo ==========================================
echo ONZEUP v1.6.0-b - Super Admin + Cortesia
echo ==========================================
if not exist "%TARGET%\package.json" (
  echo ERRO: projeto nao encontrado em %TARGET%
  pause
  exit /b 1
)

taskkill /F /IM node.exe >nul 2>&1
if not exist "%BACKUP%" mkdir "%BACKUP%"
if not exist "%BACKUP%\src\app\admin\organizacoes" mkdir "%BACKUP%\src\app\admin\organizacoes"
if not exist "%BACKUP%\src\app\admin" mkdir "%BACKUP%\src\app\admin"
if not exist "%BACKUP%\src\lib" mkdir "%BACKUP%\src\lib"
if not exist "%BACKUP%\src\app" mkdir "%BACKUP%\src\app"
if not exist "%BACKUP%\prisma" mkdir "%BACKUP%\prisma"
copy /Y "%TARGET%\src\app\admin\organizacoes\page.tsx" "%BACKUP%\src\app\admin\organizacoes\page.tsx" >nul
copy /Y "%TARGET%\src\app\admin\page.tsx" "%BACKUP%\src\app\admin\page.tsx" >nul
copy /Y "%TARGET%\src\lib\auth.ts" "%BACKUP%\src\lib\auth.ts" >nul
copy /Y "%TARGET%\src\app\globals.css" "%BACKUP%\src\app\globals.css" >nul
copy /Y "%TARGET%\prisma\schema.prisma" "%BACKUP%\prisma\schema.prisma" >nul

xcopy /E /I /Y "%HERE%files\src" "%TARGET%\src" >nul
xcopy /E /I /Y "%HERE%files\prisma" "%TARGET%\prisma" >nul
xcopy /E /I /Y "%HERE%files\docs" "%TARGET%\docs" >nul
if errorlevel 1 goto :fail

cd /d "%TARGET%"
if exist .next rmdir /S /Q .next
if exist node_modules\.prisma rmdir /S /Q node_modules\.prisma

echo.
echo [1/5] Prisma validate
call npx prisma validate || goto :fail

echo.
echo [2/5] Prisma generate
call npx prisma generate || goto :fail

echo.
echo [3/5] Sincronizando 3 campos de acesso no banco
call npx prisma db push || goto :fail

echo.
echo [4/5] TypeScript
call npx tsc --noEmit || goto :fail

echo.
echo [5/5] Build
call npm run build || goto :fail

echo.
echo ==========================================
echo SUCESSO: ONZEUP v1.6.0-b aplicado e validado.
echo ==========================================
echo Backup: %BACKUP%
echo NAO faca git push antes do teste visual/funcional.
pause
exit /b 0

:fail
echo.
echo ERRO: a atualizacao/validacao foi interrompida.
echo Nao faca git push. Envie a mensagem exibida no terminal.
pause
exit /b 1
