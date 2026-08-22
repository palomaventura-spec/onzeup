$ErrorActionPreference = "Stop"
$project = Get-Location
$patch = $PSScriptRoot

Write-Host "ONZEUP v1.4.7.3 - Club Redirect Fix" -ForegroundColor Cyan

$src = Join-Path $patch "src\app\checkout\club\actions.ts"
$dst = Join-Path $project "src\app\checkout\club\actions.ts"

if (!(Test-Path $src)) {
  throw "Arquivo do patch nao encontrado: $src"
}

New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null

$srcResolved = (Resolve-Path $src).Path
$dstResolved = Resolve-Path $dst -ErrorAction SilentlyContinue

if ($dstResolved -and $srcResolved -eq $dstResolved.Path) {
  Write-Host "Arquivo ja esta no destino."
} else {
  Copy-Item $src $dst -Force
  Write-Host "Atualizado: src\app\checkout\club\actions.ts"
}

Write-Host ""
Write-Host "Correcao aplicada." -ForegroundColor Green
Write-Host "Agora rode:"
Write-Host "  npm run build"
