$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "ONZEUP v1.4.4.2 - Mercado Pago payer email + runtime check" -ForegroundColor Cyan

$copies = @(
  @("src\app\checkout\mercadopago\sandbox\page.tsx", "src\app\checkout\mercadopago\sandbox\page.tsx"),
  @("src\components\MercadoPagoSandboxCardForm.tsx", "src\components\MercadoPagoSandboxCardForm.tsx"),
  @("src\app\api\mercadopago\sandbox-subscription\route.ts", "src\app\api\mercadopago\sandbox-subscription\route.ts")
)

foreach ($pair in $copies) {
  $src = Join-Path $root $pair[0]
  $dst = Join-Path (Get-Location) $pair[1]

  if (!(Test-Path $src)) {
    throw "Arquivo do patch nao encontrado: $src"
  }

  if ((Resolve-Path $src).Path -ne (Resolve-Path $dst -ErrorAction SilentlyContinue).Path) {
    New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
    Copy-Item $src $dst -Force
  }
}

Write-Host ""
Write-Host "Patch aplicado. Nao ha alteracao no Prisma." -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npm run build"
