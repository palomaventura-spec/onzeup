$ErrorActionPreference="Stop"
$project=Get-Location
$patch=$PSScriptRoot

Write-Host "ONZEUP v1.4.9 - Commercial + Mobile + Coach" -ForegroundColor Cyan

function ReadFile($path){ return [System.IO.File]::ReadAllText($path,[System.Text.Encoding]::UTF8) }
function WriteFile($path,$content){
  $utf8=New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path,$content,$utf8)
}
function CopyPatch($relative){
  $src=Join-Path $patch $relative
  $dst=Join-Path $project $relative
  if(!(Test-Path $src)){throw "Arquivo nao encontrado: $src"}
  New-Item -ItemType Directory -Force -Path (Split-Path $dst)|Out-Null
  $sr=(Resolve-Path $src).Path
  $dr=Resolve-Path $dst -ErrorAction SilentlyContinue
  if($dr -and $sr -eq $dr.Path){Write-Host "Ja no destino: $relative"}
  else{Copy-Item $src $dst -Force; Write-Host "Atualizado: $relative"}
}

CopyPatch "src\components\AppShell.tsx"
CopyPatch "src\app\coach\page.tsx"
CopyPatch "src\app\v149.css"

$player=Join-Path $project "src\app\player-product\page.tsx"
$c=ReadFile $player
$c=$c.Replace("Ver Gustavo no Free →","Ver modelo Free →")
$c=$c.Replace("Ver Gustavo no Premium →","Ver modelo Premium →")
$c=$c.Replace("Ver Gustavo G9 no Premium →","Ver modelo Premium →")
$c=$c.Replace("Abrir Gustavo G9 Premium ↗","Ver modelo Premium ↗")
$c=$c.Replace("Comparar com Free ↗","Ver modelo Free ↗")
WriteFile $player $c
Write-Host "Atualizado: Player modelos"

$club=Join-Path $project "src\app\club\page.tsx"
$c=ReadFile $club
$c=$c.Replace('Testar grátis','Ver planos')
$c=$c.Replace('href="/cadastro-clube">Ver planos</Link>','href="#planos">Ver planos</Link>')
$c=$c.Replace('Começar 15 dias grátis','Criar meu clube')
$c=$c.Replace('<small>Sem cartão no cadastro inicial.</small>','')
$c=$c.Replace('15 dias grátis para configurar e conhecer.','Cadastre sua organização e escolha o plano ideal para sua operação.')
$c=$c.Replace('Experimente grÃ¡tis por 15 dias','Criar meu clube')
$c=$c.Replace('Experimente grátis por 15 dias','Criar meu clube')
$c=$c.Replace('O perÃ­odo gratuito já está disponível.','Escolha entre contratação mensal ou anual.')
$c=$c.Replace('Os planos comerciais estão sendo ajustados para atender desde treinamentos e pequenas escolinhas até operações maiores. Escolha entre contratação mensal ou anual.','Escolha o plano que acompanha o tamanho da sua operação, com contratação mensal ou anual.')
$c=$c.Replace('Os planos comerciais estão sendo ajustados para atender desde treinamentos e pequenas escolinhas até operações maiores. O perÃ­odo gratuito já está disponível.','Escolha o plano que acompanha o tamanho da sua operação, com contratação mensal ou anual.')
$c=$c.Replace('Cadastre uma categoria, alguns atletas e um treinador para experimentar o fluxo completo.','Cadastre sua organização, monte sua base e centralize a rotina do clube.')
WriteFile $club $c
Write-Host "Atualizado: Club comercial"

$games=Join-Path $project "src\app\(app)\jogos\page.tsx"
$c=ReadFile $games
if($c -notmatch 'match-callup-button'){
  $old=@'
<Link className="btn btn-secondary btn-small" href={`/jogos/${match.id}`}>
                              Editar
                            </Link>
'@
  $new=@'
<Link className="btn btn-secondary btn-small" href={`/jogos/${match.id}`}>
                              Abrir jogo
                            </Link>
                            <Link className="match-callup-button" href={`/convocacoes/${match.id}`}>
                              Convocação <span className="match-callup-count">{match.callUps.length}</span>
                            </Link>
'@
  $c=$c.Replace($old,$new)
}
WriteFile $games $c
Write-Host "Atualizado: Jogos com Convocacao"

$globals=Join-Path $project "src\app\globals.css"
$c=ReadFile $globals
$c=$c.Replace('@import "./v149.css";'+[Environment]::NewLine,"")
$c=$c.Replace('@import "./v149.css";'+"`n","")
$lines=$c -split "`r?`n"
$imports=New-Object System.Collections.Generic.List[string]
$rest=New-Object System.Collections.Generic.List[string]
$reading=$true
foreach($line in $lines){
  if($reading -and $line.Trim().StartsWith("@import")){[void]$imports.Add($line)}
  else{$reading=$false;[void]$rest.Add($line)}
}
[void]$imports.Add('@import "./v149.css";')
$c=(($imports+$rest)-join [Environment]::NewLine)
WriteFile $globals $c
Write-Host "Atualizado: globals.css"

Write-Host ""
Write-Host "v1.4.9 aplicada." -ForegroundColor Green
Write-Host "Agora rode:"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Ainda nao faca git push antes do build passar."
