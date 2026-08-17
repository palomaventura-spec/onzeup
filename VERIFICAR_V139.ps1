Write-Host "=== ONZEUP v1.3.9 ==="
Select-String -Path package.json -Pattern '"version": "1.3.9"'
Select-String -Path prisma\schema.prisma -Pattern "taxId"
if (Test-Path "src\app\loading.tsx") { Write-Host "OK - loading global" -ForegroundColor Green }
if (Test-Path "src\components\PendingSubmitButton.tsx") { Write-Host "OK - botao pending" -ForegroundColor Green }
Select-String -Path "src\components\AppShell.tsx" -Pattern "Site e Configurações"
Select-String -Path "src\components\qtr\QtrEditor.tsx" -Pattern "Arena Onze"
Write-Host "IMPORTANTE: esta versão exige npx prisma db push por causa do CNPJ opcional." -ForegroundColor Yellow
