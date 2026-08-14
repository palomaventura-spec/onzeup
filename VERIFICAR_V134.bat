@echo off
echo === ONZEUP v1.3.4 ADMIN LOGIN ===
findstr /C:"1.3.4" package.json
if exist src\app\admin\login\page.tsx echo OK - /admin/login
if exist prisma\seed-admin.ts echo OK - seed:admin
findstr /C:"seed:admin" package.json
echo.
pause
