$ErrorActionPreference="Stop"
$project=Get-Location
$patch=$PSScriptRoot

Write-Host "ONZEUP v1.4.8.3 - Sidebar Hard Reset" -ForegroundColor Cyan

$src=Join-Path $patch "src\app\v1483.css"
$dst=Join-Path $project "src\app\v1483.css"

New-Item -ItemType Directory -Force -Path (Split-Path $dst)|Out-Null
Copy-Item $src $dst -Force
Write-Host "Criado: src\app\v1483.css"

$globals=Join-Path $project "src\app\globals.css"
$content=[System.IO.File]::ReadAllText($globals,[System.Text.Encoding]::UTF8)

# remove duplicidade se rodar de novo
$content=$content.Replace('@import "./v1483.css";'+[Environment]::NewLine,"")

# precisa ficar em primeiro para ser carregado antes? imports CSS são resolvidos na ordem.
# Colocamos por último nos imports usando bloco inicial reescrito.
$lines=$content -split "`r?`n"
$imports=@()
$rest=@()
$readingImports=$true
foreach($line in $lines){
  if($readingImports -and $line.Trim().StartsWith("@import")){
    $imports += $line
  }else{
    $readingImports=$false
    $rest += $line
  }
}
$imports += '@import "./v1483.css";'
$content=($imports + $rest) -join [Environment]::NewLine

$utf8=New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($globals,$content,$utf8)

Write-Host "Atualizado: globals.css"
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npm run build"
