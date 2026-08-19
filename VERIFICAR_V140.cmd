@echo off
echo === ONZEUP v1.4.0 ===
findstr /C:"\"version\": \"1.4.0\"" package.json
findstr /C:"coverPosition" prisma\schema.prisma
findstr /C:"coverOverlay" prisma\schema.prisma
if exist "src\components\ClubMatchCarousel.tsx" echo OK - carrossel
if exist "src\app\o\[slug]\jogos\page.tsx" echo OK - pagina todos os jogos
if exist "src\app\api\email-diagnostico\route.ts" (echo ALERTA - diagnostico email ainda existe) else (echo OK - diagnostico email removido)
echo.
echo IMPORTANTE: em producao conecte Vercel Blob e confirme BLOB_READ_WRITE_TOKEN.
