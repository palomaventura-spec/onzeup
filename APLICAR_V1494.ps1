$ErrorActionPreference = "Stop"
$project = Get-Location
$patch = $PSScriptRoot

Write-Host "ONZEUP v1.4.9.4 - Convocacao + Feedback" -ForegroundColor Cyan

function ReadFile($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function WriteFile($path, $content) {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

function CopyPatch($relative) {
  $src = Join-Path $patch $relative
  $dst = Join-Path $project $relative

  if (!(Test-Path -LiteralPath $src)) {
    throw "Arquivo nao encontrado no patch: $src"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null

  $srcResolved = (Resolve-Path -LiteralPath $src).Path
  $dstResolved = Resolve-Path -LiteralPath $dst -ErrorAction SilentlyContinue

  if ($dstResolved -and $srcResolved -eq $dstResolved.Path) {
    Write-Host "Ja no destino: $relative"
  } else {
    Copy-Item -LiteralPath $src -Destination $dst -Force
    Write-Host "Criado/atualizado: $relative"
  }
}

CopyPatch "src\components\CallUpSubmitButton.tsx"

$gamesPath = Join-Path $project "src\app\(app)\jogos\page.tsx"
if (!(Test-Path -LiteralPath $gamesPath)) {
  throw "Arquivo nao encontrado: $gamesPath"
}

$g = ReadFile $gamesPath

$pattern = '(?s)(<Link className="match-callup-button" href=\{`/convocacoes/\$\{match\.id\}`\}>\s*).*?(<span className="match-callup-count">)'
$replacement = '$1{"Convoca\u00e7\u00e3o"} $2'
$g2 = [System.Text.RegularExpressions.Regex]::Replace($g, $pattern, $replacement)

if ($g2 -eq $g) {
  throw "Nao foi possivel localizar o botao de convocacao em Jogos."
}

WriteFile $gamesPath $g2
Write-Host "Corrigido: texto do botao Convocacao via Unicode"

$callPath = Join-Path $project "src\app\(app)\convocacoes\[matchId]\page.tsx"
if (!(Test-Path -LiteralPath $callPath)) {
  throw "Arquivo nao encontrado: $callPath"
}

$c = ReadFile $callPath

if ($c -notmatch 'CallUpSubmitButton') {
  $c = $c.Replace(
    'import CopyButton from "@/components/CopyButton";',
    'import CopyButton from "@/components/CopyButton";' + [Environment]::NewLine + 'import CallUpSubmitButton from "@/components/CallUpSubmitButton";'
  )
}

$c = $c.Replace(
  '<button type="submit">Adicionar convocados</button>',
  '<CallUpSubmitButton />'
)

WriteFile $callPath $c
Write-Host "Atualizado: feedback Adicionando... ao salvar convocados"

Write-Host ""
Write-Host "v1.4.9.4 aplicada." -ForegroundColor Green
Write-Host "Agora rode:"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Ainda nao faca git push antes do build passar."
