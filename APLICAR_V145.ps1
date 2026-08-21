$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "ONZEUP v1.4.5 - Asaas Payments" -ForegroundColor Cyan

$copies = @(
  @("src\lib\asaas.ts", "src\lib\asaas.ts"),
  @("src\app\checkout\actions.ts", "src\app\checkout\actions.ts"),
  @("src\app\api\asaas\webhook\route.ts", "src\app\api\asaas\webhook\route.ts"),
  @("src\app\checkout\asaas\retorno\page.tsx", "src\app\checkout\asaas\retorno\page.tsx")
)

foreach ($pair in $copies) {
  $src = Join-Path $root $pair[0]
  $dst = Join-Path (Get-Location) $pair[1]

  if (!(Test-Path $src)) {
    throw "Arquivo do patch nao encontrado: $src"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null

  $srcPath = (Resolve-Path $src).Path
  $dstItem = Resolve-Path $dst -ErrorAction SilentlyContinue

  if (!$dstItem -or $srcPath -ne $dstItem.Path) {
    Copy-Item $src $dst -Force
  }
}

$pagePath = Join-Path (Get-Location) "src\app\responsavel\page.tsx"

if (Test-Path $pagePath) {
  $page = Get-Content $pagePath -Raw -Encoding UTF8

  $page = $page.Replace(
    "Vários vídeos, galeria, conquistas e visual Premium. Pagamento via PIX.",
    "Vários vídeos, galeria, conquistas e visual Premium. Pagamento recorrente por cartão."
  )

  $page = $page.Replace(
    "Assinar Premium via PIX",
    "Assinar Premium"
  )

  [IO.File]::WriteAllText(
    $pagePath,
    $page,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

Write-Host ""
Write-Host "Patch aplicado. Nao ha alteracao no Prisma." -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npm run build"
