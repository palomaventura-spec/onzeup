$ErrorActionPreference="Stop";$project=Get-Location;$patch=$PSScriptRoot
Write-Host "ONZEUP v1.4.7 - Commercial Release" -ForegroundColor Cyan
function CP($r){$s=Join-Path $patch $r;$d=Join-Path $project $r;New-Item -ItemType Directory -Force -Path (Split-Path $d)|Out-Null;$sr=(Resolve-Path $s).Path;$dr=Resolve-Path $d -ErrorAction SilentlyContinue;if($dr -and $sr -eq $dr.Path){Write-Host "Ja no destino: $r"}else{Copy-Item $s $d -Force;Write-Host "Atualizado: $r"}}
$sp=Join-Path $project "prisma\schema.prisma";$s=Get-Content $sp -Raw -Encoding UTF8
if($s -notmatch "CLUB_ESSENTIAL_MONTHLY"){$s=$s -replace "(PLAYER_FEATURED_ANNUAL\s*\r?\n)",'$1  CLUB_ESSENTIAL_MONTHLY`n  CLUB_ESSENTIAL_ANNUAL`n  CLUB_PRO_MONTHLY`n  CLUB_PRO_ANNUAL`n  CLUB_ELITE_MONTHLY`n  CLUB_ELITE_ANNUAL`n'}
if($s -notmatch "currentPeriodEnd"){$s=$s -replace "(\s+trialEnds\s+DateTime\?)",'$1`n  billingCycle String?`n  currentPeriodEnd DateTime?`n  provider String?`n  providerSubscriptionId String?'}
if($s -notmatch "organizationId\s+String\?\s*\r?\n\s*organization\s+Organization\?"){$s=$s -replace "(\s+playerId\s+String\?)",'  organizationId String?`n  organization Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)`n$1';$s=$s -replace "(\s+@@index\(\[playerId\]\))",'  @@index([organizationId])`n$1'}
if($s -notmatch "payments\s+Payment\[\]"){$s=$s -replace "(\s+subscription\s+Subscription\?)",'$1`n  payments Payment[]'}
$s=$s.Replace('`n',[Environment]::NewLine)
[IO.File]::WriteAllText($sp,$s,(New-Object System.Text.UTF8Encoding($false)))
CP "src\lib\club-plans.ts";CP "src\lib\asaas.ts";CP "src\app\checkout\club\actions.ts";CP "src\app\planos\page.tsx"
$ui=Get-ChildItem (Join-Path $project "src\app") -Recurse -File -Include *.tsx|Where-Object{$_.FullName -notmatch "\\api\\"}
foreach($f in $ui){$c=Get-Content $f.FullName -Raw -Encoding UTF8;$o=$c;$c=$c.Replace("TESTE GRATUITO","PERÍODO GRÁTIS").Replace("TESTE AGORA","COMECE AGORA").Replace("teste gratuito","período gratuito").Replace("Testar 15 dias grátis","Experimente grátis por 15 dias").Replace("Testar por 15 dias","Experimente grátis por 15 dias").Replace("Testar grátis","Começar grátis").Replace("teste os vínculos","conecte-se às equipes").Replace("configurar e testar","configurar e conhecer").Replace("TESTE COM SUA ROTINA REAL","COMECE COM SUA ROTINA REAL");if($c-ne$o){[IO.File]::WriteAllText($f.FullName,$c,(New-Object System.Text.UTF8Encoding($false)));Write-Host "Comercial: $($f.Name)"}}
Write-Host "";Write-Host "Parte 1 aplicada. Agora rode:" -ForegroundColor Green
Write-Host "npx prisma format";Write-Host "npx prisma validate";Write-Host "npx prisma db push";Write-Host "npx prisma generate";Write-Host "npm run build"
