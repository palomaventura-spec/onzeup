@echo off
echo === ONZEUP v1.2.9 ===
findstr /C:"1.2.9" package.json
findstr /C:"PREMIUM VIDEO GRID" src\app\globals.css
findstr /C:"grid-template-columns: repeat(2" src\app\globals.css
echo.
echo Esperado: todos os videos Premium 16:9, 2 por linha no desktop e 1 no celular.
pause
