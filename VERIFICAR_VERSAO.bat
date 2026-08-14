@echo off
cd /d %~dp0
echo.
echo === ONZEUP VERSION ===
findstr /C:"\"version\"" package.json
echo.
echo === PREMIUM EDITORIAL PAGE ===
findstr /C:"premium-editorial-index" "src\app\[slug]\page.tsx"
echo.
echo === PREMIUM EDITORIAL CSS ===
findstr /C:"Premium editorial redesign" "src\app\globals.css"
echo.
echo Se os 3 blocos acima aparecerem, a versao foi aplicada corretamente.
pause
