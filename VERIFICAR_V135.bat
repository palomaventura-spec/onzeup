@echo off
echo === ONZEUP v1.3.5 ===
findstr /C:"1.3.5" package.json
findstr /C:"ONZEUP_ADMIN_PASSWORD" .env.example
if exist src\app\admin\recuperar-senha\page.tsx echo OK - recuperar admin
findstr /C:"RESEND_API_KEY" src\app\esqueci-senha\actions.ts
pause
