Write-Host "=== ONZEUP v1.3.8 ==="
Select-String -Path package.json -Pattern '"version": "1.3.8"'
Select-String -Path prisma\schema.prisma -Pattern "model AthleteMembership"
Select-String -Path prisma\schema.prisma -Pattern "model CoachOrganizationAccess"
if (Test-Path "src\app\coach\convocacoes\[matchId]\page.tsx") { Write-Host "OK - convocação Coach" -ForegroundColor Green }
Write-Host "IMPORTANTE: esta versão exige npx prisma db push" -ForegroundColor Yellow
