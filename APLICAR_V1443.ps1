$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "ONZEUP v1.4.4.3 - Mercado Pago retry + diagnostics" -ForegroundColor Cyan

$src = Join-Path $root "src\lib\mercadopago.ts"
$dst = Join-Path (Get-Location) "src\lib\mercadopago.ts"

if (!(Test-Path $src)) {
  throw "Arquivo do patch nao encontrado: $src"
}

if (!(Test-Path $dst)) {
  throw "Arquivo do projeto nao encontrado: $dst"
}

$srcResolved = (Resolve-Path $src).Path
$dstResolved = (Resolve-Path $dst).Path

if ($srcResolved -ne $dstResolved) {
  Copy-Item $src $dst -Force
}

Write-Host ""
Write-Host "Patch aplicado. Nao ha alteracao no Prisma." -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npm run build"
