@echo off
echo === EXEMPLOS PLAYER v1.2.8a ===
findstr /C:"1.2.8-a" package.json
echo.
echo Premium:
type src\app\exemplos\player-premium\page.tsx
echo.
echo Free:
type src\app\exemplos\player-free\page.tsx
pause
