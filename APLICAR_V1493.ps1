$ErrorActionPreference = "Stop"
$project = Get-Location

Write-Host "ONZEUP v1.4.9.3 - Convocacao Final" -ForegroundColor Cyan

function ReadFile($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function WriteFile($path, $content) {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

# 1) Corrigir acentuacao de Convocacao na tela Jogos
$gamesPath = Join-Path $project "src\app\(app)\jogos\page.tsx"
if (!(Test-Path -LiteralPath $gamesPath)) {
  throw "Arquivo nao encontrado: $gamesPath"
}

$g = ReadFile $gamesPath

# Substitui qualquer trecho entre o Link e o contador por texto limpo.
$pattern = '(?s)(<Link className="match-callup-button" href=\{`/convocacoes/\$\{match\.id\}`\}>\s*).*?(<span className="match-callup-count">)'
$replacement = '$1Convocação $2'
$g2 = [System.Text.RegularExpressions.Regex]::Replace($g, $pattern, $replacement)

if ($g2 -eq $g) {
  Write-Host "Aviso: bloco do botao de convocacao nao mudou; verificando texto simples..."
  $g2 = $g.Replace("ConvocaÃ§Ã£o", "Convocação")
}

WriteFile $gamesPath $g2
Write-Host "Corrigido: texto Convocacao em Jogos"

# 2) Corrigir createCallUps: remover filtro de categoryId
$actionsPath = Join-Path $project "src\app\(app)\convocacoes\actions.ts"
if (!(Test-Path -LiteralPath $actionsPath)) {
  throw "Arquivo nao encontrado: $actionsPath"
}

$a = ReadFile $actionsPath

$oldSelect = @'
    select: { id: true, categoryId: true },
'@
$newSelect = @'
    select: { id: true },
'@
$a = $a.Replace($oldSelect, $newSelect)

$oldFilter = @'
      active: true,
      categoryId: match.categoryId,
'@
$newFilter = @'
      active: true,
'@

if ($a.Contains($oldFilter)) {
  $a = $a.Replace($oldFilter, $newFilter)
} elseif ($a -match 'categoryId:\s*match\.categoryId') {
  $a = [System.Text.RegularExpressions.Regex]::Replace(
    $a,
    '\s*categoryId:\s*match\.categoryId,\s*',
    [Environment]::NewLine
  )
}

WriteFile $actionsPath $a
Write-Host "Corrigido: createCallUps aceita atletas ativos do clube, mesmo sem categoria"

# 3) Ajustar mensagem da tela de convocacao e garantir categoria visivel
$callPath = Join-Path $project "src\app\(app)\convocacoes\[matchId]\page.tsx"
if (Test-Path -LiteralPath $callPath) {
  $c = ReadFile $callPath
  $c = $c.Replace(
    "Todos os atletas ativos desta categoria já foram adicionados.",
    "Não há outros atletas ativos disponíveis para convocação."
  )
  $c = $c.Replace("ConvocaÃ§Ã£o", "Convocação")
  WriteFile $callPath $c
  Write-Host "Atualizado: tela de selecao da Convocacao"
}

Write-Host ""
Write-Host "v1.4.9.3 aplicada." -ForegroundColor Green
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Ainda nao faca git push antes do build passar."
