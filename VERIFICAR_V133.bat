@echo off
echo === ONZEUP v1.3.3 ===
findstr /C:"1.3.3" package.json
findstr /C:"model Payment" prisma\schema.prisma
findstr /C:"PLAYER_PREMIUM_MONTHLY" prisma\schema.prisma
findstr /C:"LT4pTFW0O_k" prisma\seed-gustavo.ts
findstr /C:"ULRKMnTMh7U" prisma\seed-gustavo.ts
if exist src\app\admin\pagamentos\page.tsx echo OK - Admin Pagamentos
if exist src\app\checkout\pix\[id]\page.tsx echo OK - Checkout PIX
pause
