$ErrorActionPreference = "Stop"
$src = Join-Path $PSScriptRoot "src\lib\asaas.ts"
$dst = Join-Path (Get-Location) "src\lib\asaas.ts"

Write-Host "ONZEUP v1.4.6.1 - Asaas Checkout Fix" -ForegroundColor Cyan

$srcResolved = (Resolve-Path $src).Path
$dstResolved = Resolve-Path $dst -ErrorAction SilentlyContinue

if ($dstResolved -and $srcResolved -eq $dstResolved.Path) {
  Write-Host "Arquivo ja esta no destino."
} else {
  Copy-Item $src $dst -Force
  Write-Host "Atualizado: src\lib\asaas.ts"
}

Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npm run build"
