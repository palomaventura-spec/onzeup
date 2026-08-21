$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function WriteUtf8NoBom($path, $content) {
  [IO.File]::WriteAllText(
    $path,
    $content,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

Write-Host "ONZEUP v1.4.4.1 - Mercado Pago Sandbox Fix" -ForegroundColor Cyan

$copies = @(
  @("src\lib\mercadopago.ts", "src\lib\mercadopago.ts"),
  @("src\app\checkout\actions.ts", "src\app\checkout\actions.ts"),
  @("src\app\api\mercadopago\sandbox-subscription\route.ts", "src\app\api\mercadopago\sandbox-subscription\route.ts"),
  @("src\components\MercadoPagoSandboxCardForm.tsx", "src\components\MercadoPagoSandboxCardForm.tsx"),
  @("src\app\checkout\mercadopago\sandbox\page.tsx", "src\app\checkout\mercadopago\sandbox\page.tsx")
)

foreach ($pair in $copies) {
  $src = Join-Path $root $pair[0]
  $dst = Join-Path (Get-Location) $pair[1]

  if (!(Test-Path $src)) {
    throw "Arquivo do patch nao encontrado: $src"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
  Copy-Item $src $dst -Force
}

$cssPath = Join-Path (Get-Location) "src\app\globals.css"

if (!(Test-Path $cssPath)) {
  throw "Nao encontrei src\app\globals.css"
}

$css = Get-Content $cssPath -Raw -Encoding UTF8
$marker = "ONZEUP v1.4.4.1 - Mercado Pago sandbox"

if (!$css.Contains($marker)) {
  $stylesPath = Join-Path $root "V1441_STYLES.css"

  if (!(Test-Path $stylesPath)) {
    throw "Nao encontrei V1441_STYLES.css"
  }

  $extra = Get-Content $stylesPath -Raw -Encoding UTF8
  $css = $css.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $extra
  WriteUtf8NoBom $cssPath $css
}

Write-Host ""
Write-Host "Patch aplicado. Nao ha alteracao no Prisma." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE: MERCADOPAGO_WEBHOOK_SECRET deve ser da MESMA aplicacao"
Write-Host "que fornece MERCADOPAGO_PUBLIC_KEY e MERCADOPAGO_ACCESS_TOKEN."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npm run build"
