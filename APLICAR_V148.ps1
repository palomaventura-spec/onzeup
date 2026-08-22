$ErrorActionPreference = "Stop"
$project = Get-Location
$patch = $PSScriptRoot
Write-Host "ONZEUP v1.4.8 - Club UX Release" -ForegroundColor Cyan
$files = @(
  "prisma\schema.prisma"
  "src\components\AppShell.tsx"
  "src\components\ClubPlanCard.tsx"
  "src\components\NotificationBell.tsx"
  "src\app\globals.css"
  "src\app\v148.css"
  "src\app\planos\page.tsx"
  "src\app\(app)\jogos\page.tsx"
  "src\app\(app)\atletas\actions.ts"
  "src\app\(app)\atletas\page.tsx"
  "src\app\(app)\notificacoes\page.tsx"
  "src\app\(app)\comunicacao\page.tsx"
  "src\app\(app)\atletas\[id]\page.tsx"
  "src\app\(app)\jogos\[id]\page.tsx"
  "src\app\(app)\convocacoes\[matchId]\page.tsx"
)
foreach($relative in $files){
  $src=Join-Path $patch $relative
  $dst=Join-Path $project $relative
  if(!(Test-Path $src)){continue}
  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
  $sr=(Resolve-Path $src).Path
  $dr=Resolve-Path $dst -ErrorAction SilentlyContinue
  if($dr -and $sr -eq $dr.Path){Write-Host "Ja no destino: $relative";continue}
  Copy-Item $src $dst -Force
  Write-Host "Atualizado: $relative"
}
Write-Host ""
Write-Host "v1.4.8 aplicada." -ForegroundColor Green
Write-Host "Agora rode:"
Write-Host "  npx prisma format"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma db push"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Ainda nao faca git push antes do build passar."
