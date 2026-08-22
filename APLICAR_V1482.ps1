$ErrorActionPreference="Stop"
$project=Get-Location
$patch=$PSScriptRoot

Write-Host "ONZEUP v1.4.8.2 - Sidebar Hover Fix" -ForegroundColor Cyan

function CopyPatch($relative){
  $src=Join-Path $patch $relative
  $dst=Join-Path $project $relative

  if(!(Test-Path $src)){ throw "Arquivo nao encontrado: $src" }

  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null

  $sr=(Resolve-Path $src).Path
  $dr=Resolve-Path $dst -ErrorAction SilentlyContinue

  if($dr -and $sr -eq $dr.Path){
    Write-Host "Ja no destino: $relative"
  }else{
    Copy-Item $src $dst -Force
    Write-Host "Atualizado: $relative"
  }
}

CopyPatch "src\components\AppShell.tsx"
CopyPatch "src\app\v1482.css"

$globals=Join-Path $project "src\app\globals.css"
$content=[System.IO.File]::ReadAllText($globals,[System.Text.Encoding]::UTF8)

# Importa por ultimo entre os patches para sobrepor v148/v1481.
$content=$content.Replace('@import "./v1482.css";'+[Environment]::NewLine,"")
$content='@import "./v1482.css";'+[Environment]::NewLine+$content

$utf8=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($globals,$content,$utf8)

Write-Host "Atualizado: globals.css"
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npm run build"
