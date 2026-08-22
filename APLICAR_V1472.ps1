$ErrorActionPreference = "Stop"
$project = Get-Location
$patch = $PSScriptRoot

Write-Host "ONZEUP v1.4.7.2 - Club Billing UI" -ForegroundColor Cyan

function ReadFile($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function WriteFile($path, $content) {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

function CopyPatch($relative) {
  $src = Join-Path $patch $relative
  $dst = Join-Path $project $relative

  if (!(Test-Path $src)) {
    throw "Arquivo nao encontrado: $src"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null

  $srcResolved = (Resolve-Path $src).Path
  $dstResolved = Resolve-Path $dst -ErrorAction SilentlyContinue

  if ($dstResolved -and $srcResolved -eq $dstResolved.Path) {
    Write-Host "Ja no destino: $relative"
  } else {
    Copy-Item $src $dst -Force
    Write-Host "Atualizado: $relative"
  }
}

CopyPatch "src\components\ClubPlanStatusCard.tsx"

# Dashboard: importa e exibe o card comercial.
$dashboardPath = Join-Path $project "src\app\(app)\dashboard\page.tsx"
if (Test-Path $dashboardPath) {
  $c = ReadFile $dashboardPath

  if ($c -notmatch 'ClubPlanStatusCard') {
    $c = $c.Replace(
      'import { redirect } from "next/navigation";',
      'import { redirect } from "next/navigation";' + [Environment]::NewLine + 'import ClubPlanStatusCard from "@/components/ClubPlanStatusCard";'
    )
  }

  if ($c -notmatch '<ClubPlanStatusCard organizationId=') {
    $needle = '<section className="clean-kpi-grid">'
    $replacement = '<ClubPlanStatusCard organizationId={orgId} />' + [Environment]::NewLine + [Environment]::NewLine + '      <section className="clean-kpi-grid">'
    $c = $c.Replace($needle, $replacement)
  }

  WriteFile $dashboardPath $c
  Write-Host "Atualizado: dashboard com plano e assinatura"
}

# Sidebar: adiciona item Plano e assinatura.
$appShellPath = Join-Path $project "src\components\AppShell.tsx"
if (Test-Path $appShellPath) {
  $c = ReadFile $appShellPath

  if ($c -notmatch 'href="/planos"') {
    $c = $c.Replace(
      '<Link href="/financeiro">Financeiro</Link>',
      '<Link href="/financeiro">Financeiro</Link>' + [Environment]::NewLine + '          <Link href="/planos">Plano e assinatura</Link>'
    )
  }

  # Remove banner de demo do Club na interface comercial.
  $c = $c.Replace('import DemoBanner from "@/components/DemoBanner";' + [Environment]::NewLine, "")
  $c = $c.Replace('  const isDemo = user?.email === "admin@onzeup.com.br";' + [Environment]::NewLine, "")
  $c = $c.Replace('{isDemo ? <DemoBanner kind="club" /> : null}{children}', '{children}')

  WriteFile $appShellPath $c
  Write-Host "Atualizado: menu Plano e assinatura"
}

# Configuracoes: atalho adicional para assinatura.
$configPath = Join-Path $project "src\app\(app)\configuracoes\page.tsx"
if (Test-Path $configPath) {
  $c = ReadFile $configPath

  if ($c -notmatch 'href="/planos"') {
    # Arquivo e compacto. Adiciona import Link e card ao final do fragmento.
    if ($c -notmatch 'import Link from "next/link"') {
      $c = 'import Link from "next/link";' + [Environment]::NewLine + $c
    }

    $c = $c.Replace(
      '</section></> }',
      '</section><section className="card"><h2>Plano e assinatura</h2><p className="help">Consulte seu plano atual, altere a periodicidade e contrate pelo cartão ou Pix.</p><Link className="btn" href="/planos">Abrir planos e assinatura</Link></section></> }'
    )
  }

  WriteFile $configPath $c
  Write-Host "Atualizado: configuracoes com atalho de assinatura"
}

Write-Host ""
Write-Host "v1.4.7.2 aplicada." -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Se o build passar, faca git add/commit/push."
