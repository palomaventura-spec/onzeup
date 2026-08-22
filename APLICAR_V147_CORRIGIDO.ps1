$ErrorActionPreference="Stop"
$project=Get-Location
$patch=$PSScriptRoot

Write-Host "ONZEUP v1.4.7 - Commercial Release FIX" -ForegroundColor Cyan

function Read-Utf8File($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8File($path, $content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function CP($r){
  $s=Join-Path $patch $r
  $d=Join-Path $project $r

  if (!(Test-Path $s)) {
    throw "Arquivo do patch nao encontrado: $s"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path $d) | Out-Null

  $sr=(Resolve-Path $s).Path
  $dr=Resolve-Path $d -ErrorAction SilentlyContinue

  if($dr -and $sr -eq $dr.Path){
    Write-Host "Ja no destino: $r"
  } else {
    Copy-Item $s $d -Force
    Write-Host "Atualizado: $r"
  }
}

$sp=Join-Path $project "prisma\schema.prisma"
$s=Read-Utf8File $sp

if($s -notmatch "CLUB_ESSENTIAL_MONTHLY"){
  $s=$s -replace "(PLAYER_FEATURED_ANNUAL\s*\r?\n)", '$1  CLUB_ESSENTIAL_MONTHLY`n  CLUB_ESSENTIAL_ANNUAL`n  CLUB_PRO_MONTHLY`n  CLUB_PRO_ANNUAL`n  CLUB_ELITE_MONTHLY`n  CLUB_ELITE_ANNUAL`n'
}

if($s -notmatch "currentPeriodEnd"){
  $s=$s -replace "(\s+trialEnds\s+DateTime\?)", '$1`n  billingCycle String?`n  currentPeriodEnd DateTime?`n  provider String?`n  providerSubscriptionId String?'
}

if($s -notmatch "organizationId\s+String\?\s*\r?\n\s*organization\s+Organization\?"){
  $s=$s -replace "(\s+playerId\s+String\?)", '  organizationId String?`n  organization Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)`n$1'
  $s=$s -replace "(\s+@@index\(\[playerId\]\))", '  @@index([organizationId])`n$1'
}

if($s -notmatch "payments\s+Payment\[\]"){
  $s=$s -replace "(\s+subscription\s+Subscription\?)", '$1`n  payments Payment[]'
}

$s=$s.Replace('`n',[Environment]::NewLine)
Write-Utf8File $sp $s
Write-Host "Atualizado/verificado: prisma\schema.prisma"

CP "src\lib\club-plans.ts"
CP "src\lib\asaas.ts"
CP "src\app\checkout\club\actions.ts"
CP "src\app\planos\page.tsx"

$ui = Get-ChildItem (Join-Path $project "src\app") -Recurse -Include *.tsx -ErrorAction SilentlyContinue

foreach($f in $ui){
  if($f.FullName -match "\\api\\"){ continue }

  $c=Read-Utf8File $f.FullName
  $o=$c

  $c=$c.Replace("TESTE GRATUITO","PERÍODO GRÁTIS")
  $c=$c.Replace("TESTE AGORA","COMECE AGORA")
  $c=$c.Replace("teste gratuito","período gratuito")
  $c=$c.Replace("Testar 15 dias grátis","Experimente grátis por 15 dias")
  $c=$c.Replace("Testar por 15 dias","Experimente grátis por 15 dias")
  $c=$c.Replace("Testar grátis","Começar grátis")
  $c=$c.Replace("teste os vínculos","conecte-se às equipes")
  $c=$c.Replace("configurar e testar","configurar e conhecer")
  $c=$c.Replace("TESTE COM SUA ROTINA REAL","COMECE COM SUA ROTINA REAL")

  if($c -ne $o){
    Write-Utf8File $f.FullName $c
    Write-Host "Comercial: $($f.FullName.Substring($project.Path.Length + 1))"
  }
}

Write-Host ""
Write-Host "v1.4.7 Parte 1 aplicada/corrigida." -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode, um por vez:"
Write-Host "  npx prisma format"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma db push"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
