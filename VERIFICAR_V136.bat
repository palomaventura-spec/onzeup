@echo off
echo === ONZEUP v1.3.6 — ADMIN ROUTE GUARD FIX ===
findstr /C:"1.3.6" package.json
if exist "src\app\admin\login\page.tsx" echo OK - admin login publico
if exist "src\app\admin\recuperar-senha\page.tsx" echo OK - recuperar admin publico
if exist "src\app\admin\(protected)\layout.tsx" echo OK - layout protegido separado
if exist "src\app\admin\(protected)\page.tsx" echo OK - dashboard admin protegido
if exist "src\app\admin\(protected)\pagamentos\page.tsx" echo OK - pagamentos protegido
echo.
pause
