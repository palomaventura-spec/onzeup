@echo off
echo === ONZEUP v1.3.0 ===
findstr /C:"1.3.0" package.json
echo.
echo Rotas principais:
if exist src\app\club\page.tsx echo OK - /club
if exist src\app\player\page.tsx echo OK - /player
if exist src\app\coach\page.tsx echo OK - /coach
if exist src\app\coach\dashboard\page.tsx echo OK - Coach Dashboard
if exist src\app\convite\[coach]\page.tsx echo OK - Coach Referral
findstr /C:"club.onzeup.com.br" src\middleware.ts
echo.
echo IMPORTANTE: esta versao altera o Prisma. Rode npm run db:sync.
pause
