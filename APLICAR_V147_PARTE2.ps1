$ErrorActionPreference = "Stop"
$project = Get-Location
$patch = $PSScriptRoot

Write-Host "ONZEUP v1.4.7 - Commercial Release Parte 2" -ForegroundColor Cyan

function Read-Utf8File($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8File($path, $content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function CP($relative) {
  $src = Join-Path $patch $relative
  $dst = Join-Path $project $relative
  if (!(Test-Path $src)) { throw "Arquivo nao encontrado: $src" }
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

CP "src\app\api\asaas\webhook\route.ts"
CP "src\app\checkout\actions.ts"

# PLAYER: importa Pix e adiciona segundo botão.
$responsavel = Join-Path $project "src\app\responsavel\page.tsx"
if (Test-Path $responsavel) {
  $c = Read-Utf8File $responsavel

  $c = $c.Replace(
    'import { createPlayerPremiumAsaas } from "@/app/checkout/actions";',
    'import { createPlayerPremiumAsaas, createPlayerPremiumPixAsaas } from "@/app/checkout/actions";'
  )

  $old = @'
<form action={createPlayerPremiumAsaas}>
                  <input type="hidden" name="playerId" value={selected.id} />
                  <strong>R$ 29,90/mês</strong>
                  <button className="btn">Assinar Premium</button>
                </form>
'@

  $new = @'
<div>
                  <strong>R$ 29,90/mês</strong>
                  <form action={createPlayerPremiumAsaas}>
                    <input type="hidden" name="playerId" value={selected.id} />
                    <button className="btn">Assinar com cartão</button>
                  </form>
                  <form action={createPlayerPremiumPixAsaas}>
                    <input type="hidden" name="playerId" value={selected.id} />
                    <button className="btn-secondary">Pagar mensalidade via Pix</button>
                  </form>
                </div>
'@

  if ($c.Contains($old)) {
    $c = $c.Replace($old, $new)
  } else {
    $c = $c.Replace(
      '<button className="btn">Assinar Premium</button>',
      '<button className="btn">Assinar com cartão</button>'
    )
  }

  $c = $c.Replace(
    'Vários vídeos, galeria, conquistas e visual Premium. Assinatura mensal.',
    'Vários vídeos, galeria, conquistas e visual Premium. Assinatura mensal por cartão ou pagamento mensal via Pix.'
  )

  Write-Utf8File $responsavel $c
  Write-Host "Atualizado: Player cartão + Pix"
}

# HOME principal.
$home = Join-Path $project "src\app\page.tsx"
if (Test-Path $home) {
  $c = Read-Utf8File $home
  $c = $c.Replace(
    'Crie a identidade esportiva do atleta e compartilhe sua trajetória.',
    'Crie a identidade esportiva do atleta e compartilhe sua trajetória. Premium por R$ 29,90/mês.'
  )
  $c = $c.Replace(
    'Gestão esportiva, comunicação, financeiro e presença digital.',
    'Gestão esportiva, comunicação, financeiro e presença digital. Planos a partir de R$ 49,90/mês.'
  )
  $c = $c.Replace('Testar 15 dias grátis →', 'Experimente grátis por 15 dias →')
  Write-Utf8File $home $c
  Write-Host "Atualizado: landing principal"
}

# CLUB landing: preços definitivos e linguagem comercial.
$club = Join-Path $project "src\app\club\page.tsx"
if (Test-Path $club) {
  $c = Read-Utf8File $club

  $start = $c.IndexOf('<section className="club-commercial-section" id="planos">')
  $end = $c.IndexOf('<section className="club-commercial-section dark" id="faq-club">')

  if ($start -ge 0 -and $end -gt $start) {
    $plans = @'
<section className="club-commercial-section" id="planos">
      <span className="marketing-kicker dark">PLANOS ONZEUP CLUB</span>
      <h2>Mensal ou anual.<br/>Você escolhe.</h2>
      <p className="club-plan-note">Todos os planos têm opção mensal e anual. No anual, você economiza aproximadamente duas mensalidades.</p>
      <div className="club-plan-preview">
        <article>
          <small>ESSENCIAL</small>
          <h3>R$ 49,90/mês</h3>
          <p><strong>R$ 499/ano</strong></p>
          <p>Até 100 atletas. Gestão esportiva, comissão, treinos, jogos, convocações e site público.</p>
        </article>
        <article className="featured">
          <small>PRO • MAIS ESCOLHIDO</small>
          <h3>R$ 99,90/mês</h3>
          <p><strong>R$ 999/ano</strong></p>
          <p>Até 300 atletas. Inclui financeiro, QTR, comunicação e personalização ampliada.</p>
        </article>
        <article>
          <small>ELITE</small>
          <h3>R$ 149,90/mês</h3>
          <p><strong>R$ 1.499/ano</strong></p>
          <p>Atletas ilimitados, múltiplas equipes, recursos avançados e suporte prioritário.</p>
        </article>
      </div>
      <p className="club-plan-note">Pagamento seguro por cartão ou Pix. Cartão mensal com cobrança recorrente; Pix mensal é pago a cada período. Planos anuais liberam 12 meses.</p>
      <Link className="marketing-cta" href="/cadastro-clube">Experimente grátis por 15 dias</Link>
    </section>

    '@

    $c = $c.Substring(0, $start) + $plans + $c.Substring($end)
  }

  $c = $c.Replace("Os planos comerciais estão sendo ajustados", "Escolha o plano ideal")
  $c = $c.Replace("O teste gratuito já está disponível.", "Experimente grátis por 15 dias.")
  $c = $c.Replace("15 dias grátis para configurar e testar.", "15 dias grátis para configurar e conhecer a plataforma.")
  $c = $c.Replace("TESTE COM SUA ROTINA REAL", "COMECE COM SUA ROTINA REAL")
  $c = $c.Replace("Testar por 15 dias", "Experimente grátis por 15 dias")
  $c = $c.Replace("Testar grátis", "Começar grátis")

  Write-Utf8File $club $c
  Write-Host "Atualizado: landing Club"
}

# COACH cleanup.
$coach = Join-Path $project "src\app\coach\page.tsx"
if (Test-Path $coach) {
  $c = Read-Utf8File $coach
  $c = $c.Replace("TESTE AGORA", "COMECE AGORA")
  $c = $c.Replace(
    "Complete seu site profissional e teste os vínculos com equipes.",
    "Complete seu site profissional e conecte-se às equipes onde você atua."
  )
  Write-Utf8File $coach $c
  Write-Host "Atualizado: landing Coach"
}

# Dashboard: "período grátis", sem linguagem de teste.
$dash = Join-Path $project "src\app\(app)\dashboard\page.tsx"
if (Test-Path $dash) {
  $c = Read-Utf8File $dash
  $c = $c.Replace("TESTE GRATUITO", "PERÍODO GRÁTIS")
  Write-Utf8File $dash $c
}

# Remove a rota pública /piloto, caso exista.
$pilot = Join-Path $project "src\app\piloto"
if (Test-Path $pilot) {
  Remove-Item $pilot -Recurse -Force
  Write-Host "Removido: rota /piloto"
}

Write-Host ""
Write-Host "Parte 2 aplicada." -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Ainda nao faca git push."
