$ErrorActionPreference="Stop"
$project=Get-Location
$patch=$PSScriptRoot

Write-Host "ONZEUP v1.4.8.4 - Sidebar Final" -ForegroundColor Cyan

function CopyPatch($relative){
  $src=Join-Path $patch $relative
  $dst=Join-Path $project $relative
  if(!(Test-Path $src)){throw "Arquivo nao encontrado: $src"}
  New-Item -ItemType Directory -Force -Path (Split-Path $dst)|Out-Null
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

$overridePath=Join-Path $patch "SIDEBAR_FINAL_OVERRIDE.css.txt"
$override=[System.IO.File]::ReadAllText($overridePath,[System.Text.Encoding]::UTF8)

$globals=Join-Path $project "src\app\globals.css"
$content=[System.IO.File]::ReadAllText($globals,[System.Text.Encoding]::UTF8)

$start='/* ===== ONZEUP v1.4.8.4 SIDEBAR FINAL OVERRIDE ===== */'
$end='/* ===== END ONZEUP v1.4.8.4 ===== */'

$startIndex=$content.IndexOf($start)
if($startIndex -ge 0){
  $endIndex=$content.IndexOf($end,$startIndex)
  if($endIndex -ge 0){
    $endIndex=$endIndex+$end.Length
    $content=$content.Remove($startIndex,$endIndex-$startIndex)
  }
}

# CRUCIAL: acrescenta NO FINAL do globals.css para prevalecer sobre todos os estilos antigos
$content=$content.TrimEnd()+[Environment]::NewLine+[Environment]::NewLine+$override+[Environment]::NewLine

$utf8=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($globals,$content,$utf8)

Write-Host "Override final anexado ao FIM de globals.css"
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npm run build"
