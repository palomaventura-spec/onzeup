@echo off
echo.
echo === ONZEUP COACH CHECK ===
echo.
findstr /C:"1.2.7" package.json
echo.
echo Landing Coach links:
findstr /C:"/coaches" src\app\page.tsx
echo.
echo Coach page route:
if exist src\app\coaches\page.tsx echo OK - src\app\coaches\page.tsx
echo.
echo Alias /coach:
if exist src\app\coach\page.tsx echo OK - src\app\coach\page.tsx
echo.
pause
