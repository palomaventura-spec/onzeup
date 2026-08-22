$ErrorActionPreference="Stop"
$project=Get-Location
$patch=$PSScriptRoot

Write-Host "ONZEUP v1.4.8.1 - Layout Fix" -ForegroundColor Cyan

$src=Join-Path $patch "src\app\v1481.css"
$dst=Join-Path $project "src\app\v1481.css"
New-Item -ItemType Directory -Force -Path (Split-Path $dst)|Out-Null

$sr=(Resolve-Path $src).Path
$dr=Resolve-Path $dst -ErrorAction SilentlyContinue
if($dr -and $sr -eq $dr.Path){
  Write-Host "CSS ja esta no destino."
}else{
  Copy-Item $src $dst -Force
  Write-Host "Criado: src\app\v1481.css"
}

$globals=Join-Path $project "src\app\globals.css"
$content=[System.IO.File]::ReadAllText($globals,[System.Text.Encoding]::UTF8)
if($content -notmatch 'v1481.css'){
  $content='@import "./v1481.css";'+[Environment]::NewLine+$content
  $utf8=New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($globals,$content,$utf8)
  Write-Host "Atualizado: globals.css"
}

Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npm run build"
