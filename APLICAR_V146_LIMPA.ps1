$ErrorActionPreference = "Stop"
$project = Get-Location
$patch = $PSScriptRoot

Write-Host "ONZEUP v1.4.6 - Clean Release" -ForegroundColor Cyan

function Copy-PatchFile($relative) {
  $src = Join-Path $patch $relative
  $dst = Join-Path $project $relative
  if (!(Test-Path $src)) { throw "Arquivo do patch nao encontrado: $src" }
  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
  Copy-Item $src $dst -Force
  Write-Host "Atualizado: $relative"
}

Copy-PatchFile "src\lib\asaas.ts"
Copy-PatchFile "src\app\checkout\actions.ts"
Copy-PatchFile "src\app\checkout\asaas\retorno\page.tsx"

$pagePath = Join-Path $project "src\app\responsavel\page.tsx"
if (Test-Path $pagePath) {
  $page = Get-Content $pagePath -Raw -Encoding UTF8

  $page = $page.Replace(
    'import { createPlayerPremiumPix } from "@/app/checkout/actions";',
    'import { createPlayerPremiumAsaas } from "@/app/checkout/actions";'
  )

  $page = $page.Replace(
    'action={createPlayerPremiumPix}',
    'action={createPlayerPremiumAsaas}'
  )

  $page = $page.Replace(
    'Vários vídeos, galeria, conquistas e visual Premium. Pagamento via PIX.',
    'Vários vídeos, galeria, conquistas e visual Premium. Assinatura mensal.'
  )

  [IO.File]::WriteAllText(
    $pagePath,
    $page,
    (New-Object System.Text.UTF8Encoding($false))
  )

  Write-Host "Atualizado: src\app\responsavel\page.tsx"
}

$obsoleteFiles = @(
  "src\app\api\asaas\sync\route.ts",
  "src\components\AsaasReturnSync.tsx"
)

foreach ($relative in $obsoleteFiles) {
  $target = Join-Path $project $relative
  if (Test-Path $target) {
    Remove-Item $target -Force
    Write-Host "Removido: $relative"
  }
}

$obsoletePaths = @(
  "src\lib\mercadopago.ts",
  "src\app\api\mercadopago",
  "src\app\checkout\mercadopago"
)

foreach ($relative in $obsoletePaths) {
  $target = Join-Path $project $relative
  if (Test-Path $target) {
    Remove-Item $target -Recurse -Force
    Write-Host "Removido: $relative"
  }
}

Get-ChildItem $project -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Name -like "APLICAR_V14*" -and
    $_.Name -notlike "APLICAR_V146_LIMPA*"
  } |
  Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Limpeza concluida." -ForegroundColor Green
Write-Host "Nao ha alteracao no Prisma."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npm run build"
