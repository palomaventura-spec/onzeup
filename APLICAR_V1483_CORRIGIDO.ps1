$ErrorActionPreference="Stop"
$project=Get-Location
$patch=$PSScriptRoot

Write-Host "ONZEUP v1.4.8.3 - Sidebar Hard Reset FIX" -ForegroundColor Cyan

$src=Join-Path $patch "src\app\v1483.css"
$dst=Join-Path $project "src\app\v1483.css"

if (!(Test-Path $src)) {
  throw "Arquivo nao encontrado: $src"
}

New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null

$srcResolved=(Resolve-Path $src).Path
$dstResolved=Resolve-Path $dst -ErrorAction SilentlyContinue

if ($dstResolved -and $srcResolved -eq $dstResolved.Path) {
  Write-Host "CSS ja esta no destino: src\app\v1483.css"
} else {
  Copy-Item $src $dst -Force
  Write-Host "Criado/atualizado: src\app\v1483.css"
}

$globals=Join-Path $project "src\app\globals.css"
$content=[System.IO.File]::ReadAllText($globals,[System.Text.Encoding]::UTF8)

# remove import duplicado, se existir
$content=$content.Replace('@import "./v1483.css";'+[Environment]::NewLine,"")
$content=$content.Replace('@import "./v1483.css";'+"`n","")

$lines=$content -split "`r?`n"
$imports=New-Object System.Collections.Generic.List[string]
$rest=New-Object System.Collections.Generic.List[string]
$readingImports=$true

foreach($line in $lines){
  if($readingImports -and $line.Trim().StartsWith("@import")){
    [void]$imports.Add($line)
  } else {
    $readingImports=$false
    [void]$rest.Add($line)
  }
}

# adiciona por último entre os imports para prevalecer sobre v148 e v1481/v1482
[void]$imports.Add('@import "./v1483.css";')

$content=(($imports + $rest) -join [Environment]::NewLine)

$utf8=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($globals,$content,$utf8)

Write-Host "Atualizado: globals.css"
Write-Host ""
Write-Host "Fix aplicado." -ForegroundColor Green
Write-Host "Agora rode:"
Write-Host "  npm run build"
