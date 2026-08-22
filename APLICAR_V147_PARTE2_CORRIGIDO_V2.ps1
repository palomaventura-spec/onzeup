$ErrorActionPreference = "Stop"
$project = Get-Location
$patch = $PSScriptRoot

Write-Host "ONZEUP v1.4.7 - Commercial Release Parte 2 FIX 2" -ForegroundColor Cyan

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

CopyPatch "src\app\api\asaas\webhook\route.ts"
CopyPatch "src\app\checkout\actions.ts"

# PLAYER
$responsavelPath = Join-Path $project "src\app\responsavel\page.tsx"
if (Test-Path $responsavelPath) {
  $c = ReadFile $responsavelPath

  if ($c -notmatch "createPlayerPremiumPixAsaas") {
    $c = $c.Replace(
      'import { createPlayerPremiumAsaas } from "@/app/checkout/actions";',
      'import { createPlayerPremiumAsaas, createPlayerPremiumPixAsaas } from "@/app/checkout/actions";'
    )
  }

  $c = $c.Replace(
    'Varios videos, galeria, conquistas e visual Premium. Assinatura mensal.',
    'Varios videos, galeria, conquistas e visual Premium. Assinatura mensal por cartao ou pagamento mensal via Pix.'
  )

  $c = $c.Replace(
    'Vários vídeos, galeria, conquistas e visual Premium. Assinatura mensal.',
    'Vários vídeos, galeria, conquistas e visual Premium. Assinatura mensal por cartão ou pagamento mensal via Pix.'
  )

  if ($c -notmatch 'Pagar mensalidade via Pix') {
    $needle1 = '<button className="btn">Assinar Premium</button>'
    $replacement1 = '<button className="btn">Assinar com cartao</button></form><form action={createPlayerPremiumPixAsaas}><input type="hidden" name="playerId" value={selected.id} /><button className="btn-secondary">Pagar mensalidade via Pix</button>'
    $c = $c.Replace($needle1, $replacement1)

    $needle2 = '<button className="btn">Assinar com cartão</button>'
    $replacement2 = '<button className="btn">Assinar com cartão</button></form><form action={createPlayerPremiumPixAsaas}><input type="hidden" name="playerId" value={selected.id} /><button className="btn-secondary">Pagar mensalidade via Pix</button>'
    $c = $c.Replace($needle2, $replacement2)
  }

  WriteFile $responsavelPath $c
  Write-Host "Atualizado: Player cartao + Pix"
}

# HOME PRINCIPAL
$homePagePath = Join-Path $project "src\app\page.tsx"
if (Test-Path $homePagePath) {
  $c = ReadFile $homePagePath

  if ($c -notmatch "Premium por R\$ 29,90/mês") {
    $c = $c.Replace(
      'Crie a identidade esportiva do atleta e compartilhe sua trajetória.',
      'Crie a identidade esportiva do atleta e compartilhe sua trajetória. Premium por R$ 29,90/mês.'
    )
  }

  if ($c -notmatch "Planos a partir de R\$ 49,90/mês") {
    $c = $c.Replace(
      'Gestão esportiva, comunicação, financeiro e presença digital.',
      'Gestão esportiva, comunicação, financeiro e presença digital. Planos a partir de R$ 49,90/mês.'
    )
  }

  WriteFile $homePagePath $c
  Write-Host "Atualizado: landing principal"
}

# CLUB
$clubPagePath = Join-Path $project "src\app\club\page.tsx"
if (Test-Path $clubPagePath) {
  $c = ReadFile $clubPagePath

  $c = $c.Replace("TESTE COM SUA ROTINA REAL", "COMECE COM SUA ROTINA REAL")
  $c = $c.Replace("Testar por 15 dias", "Experimente gratis por 15 dias")
  $c = $c.Replace("Testar gratis", "Comecar gratis")
  $c = $c.Replace("teste gratuito", "periodo gratuito")
  $c = $c.Replace("configurar e testar", "configurar e conhecer")

  WriteFile $clubPagePath $c
  Write-Host "Atualizado: landing Club"
}

# COACH
$coachPagePath = Join-Path $project "src\app\coach\page.tsx"
if (Test-Path $coachPagePath) {
  $c = ReadFile $coachPagePath
  $c = $c.Replace("TESTE AGORA", "COMECE AGORA")
  $c = $c.Replace(
    "Complete seu site profissional e teste os vinculos com equipes.",
    "Complete seu site profissional e conecte-se as equipes onde voce atua."
  )
  $c = $c.Replace(
    "Complete seu site profissional e teste os vínculos com equipes.",
    "Complete seu site profissional e conecte-se às equipes onde você atua."
  )
  WriteFile $coachPagePath $c
  Write-Host "Atualizado: landing Coach"
}

# DASHBOARD
$dashboardPath = Join-Path $project "src\app\(app)\dashboard\page.tsx"
if (Test-Path $dashboardPath) {
  $c = ReadFile $dashboardPath
  $c = $c.Replace("TESTE GRATUITO", "PERIODO GRATIS")
  WriteFile $dashboardPath $c
  Write-Host "Atualizado: dashboard Club"
}

# REMOVE ROTA PILOTO
$pilotPath = Join-Path $project "src\app\piloto"
if (Test-Path $pilotPath) {
  Remove-Item $pilotPath -Recurse -Force
  Write-Host "Removido: rota /piloto"
}

Write-Host ""
Write-Host "Parte 2 corrigida e aplicada." -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Ainda nao faca git push."
