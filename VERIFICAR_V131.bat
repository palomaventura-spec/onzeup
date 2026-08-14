@echo off
echo === ONZEUP v1.3.1 ===
findstr /C:"1.3.1" package.json
echo.
if exist src\app\player-product\page.tsx echo OK - Landing Player
if exist src\app\coach\page.tsx echo OK - Landing Coach
if exist src\app\coaches\page.tsx echo OK - Catalogo Coaches
findstr /C:"Explorar Coaches" src\app\coach\page.tsx
echo.
pause
