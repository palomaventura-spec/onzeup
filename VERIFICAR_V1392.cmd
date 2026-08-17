@echo off
echo === ONZEUP v1.3.9.2 ===
findstr /C:"\"version\": \"1.3.9.2\"" package.json
findstr /C:"user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)" prisma\schema.prisma
echo.
echo Agora rode:
echo npx prisma validate
echo npx prisma generate
echo npx prisma db push
echo npm run build
pause
