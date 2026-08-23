$ErrorActionPreference="Stop"
$project=Get-Location
$patch=$PSScriptRoot
Write-Host "ONZEUP v1.4.9.5 - Conexoes + PIX" -ForegroundColor Cyan

function ReadFile($path){[System.IO.File]::ReadAllText($path,[System.Text.Encoding]::UTF8)}
function WriteFile($path,$content){
  $utf8=New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path,$content,$utf8)
}
function CopyPatch($relative){
  $src=Join-Path $patch $relative
  $dst=Join-Path $project $relative
  if(!(Test-Path -LiteralPath $src)){throw "Arquivo nao encontrado: $src"}
  New-Item -ItemType Directory -Force -Path (Split-Path $dst)|Out-Null
  $sr=(Resolve-Path -LiteralPath $src).Path
  $dr=Resolve-Path -LiteralPath $dst -ErrorAction SilentlyContinue
  if($dr -and $sr -eq $dr.Path){Write-Host "Ja no destino: $relative"}
  else{Copy-Item -LiteralPath $src -Destination $dst -Force;Write-Host "Atualizado: $relative"}
}

CopyPatch "src\app\(app)\integracoes\page.tsx"
CopyPatch "src\app\(app)\integracoes\actions.ts"
CopyPatch "src\app\v1495.css"

# Menu: mantém rota /integracoes, muda somente o nome visível.
$shell=Join-Path $project "src\components\AppShell.tsx"
$c=ReadFile $shell
$c=$c.Replace('["/integracoes","Integrações"]','["/integracoes","Conexões"]')
$c=$c.Replace('["/integracoes", "Integrações"]','["/integracoes", "Conexões"]')
WriteFile $shell $c
Write-Host "Atualizado: menu Conexoes"

# Importa CSS da versão.
$globals=Join-Path $project "src\app\globals.css"
$c=ReadFile $globals
if($c -notmatch 'v1495\.css'){
  $lines=$c -split "`r?`n"
  $imports=New-Object System.Collections.Generic.List[string]
  $rest=New-Object System.Collections.Generic.List[string]
  $reading=$true
  foreach($line in $lines){
    if($reading -and $line.Trim().StartsWith("@import")){[void]$imports.Add($line)}
    else{$reading=$false;[void]$rest.Add($line)}
  }
  [void]$imports.Add('@import "./v1495.css";')
  $c=(($imports+$rest)-join [Environment]::NewLine)
  WriteFile $globals $c
}
Write-Host "Atualizado: globals.css"

Write-Host ""
Write-Host "v1.4.9.5 aplicada." -ForegroundColor Green
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Ainda nao faca git push antes do build passar."
