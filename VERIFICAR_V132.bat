@echo off
echo === ONZEUP v1.3.2 ===
findstr /C:"1.3.2" package.json
findstr /C:"MODELO OFICIAL ONZEUP PLAYER PREMIUM" src\app\player-product\page.tsx
if exist src\app\g9\page.tsx echo OK - atalho /g9
if exist src\app\gustavo-g9\page.tsx echo OK - atalho /gustavo-g9
pause
