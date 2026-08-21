$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Write-Host "ONZEUP v1.4.5.2 - Asaas Subscription Sync" -ForegroundColor Cyan

$copies = @(
  @("src\lib\asaas.ts", "src\lib\asaas.ts"),
  @("src\app\api\asaas\sync\route.ts", "src\app\api\asaas\sync\route.ts")
)

foreach ($pair in $copies) {
  $src = Join-Path $root $pair[0]
  $dst = Join-Path (Get-Location) $pair[1]
  if (!(Test-Path $src)) { throw "Arquivo nao encontrado: $src" }
  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null

  $srcResolved = (Resolve-Path $src).Path
  $dstResolved = Resolve-Path $dst -ErrorAction SilentlyContinue
  if (!$dstResolved -or $srcResolved -ne $dstResolved.Path) {
    Copy-Item $src $dst -Force
  }
}

Write-Host ""
Write-Host "Patch aplicado. Sem alteracao no Prisma." -ForegroundColor Green
Write-Host "Rode:"
Write-Host "  npx prisma validate"
Write-Host "  npm run build"
