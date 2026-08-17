Write-Host "=== ONZEUP v1.3.9.1 ==="
Select-String -Path package.json -Pattern '"version": "1.3.9.1"'
Select-String -Path prisma\schema.prisma -Pattern "model EmailVerificationToken"
if (Test-Path "src\lib\email.ts") { Write-Host "OK - serviço de e-mail" -ForegroundColor Green }
if (Test-Path "src\app\api\verificar-email\route.ts") { Write-Host "OK - rota de ativação" -ForegroundColor Green }
Select-String -Path "src\app\cadastro\actions.ts" -Pattern "sendTransactionalEmail"
Select-String -Path "src\app\esqueci-senha\actions.ts" -Pattern "sendTransactionalEmail"
Write-Host "IMPORTANTE: execute npx prisma db push" -ForegroundColor Yellow
