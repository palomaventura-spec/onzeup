$ErrorActionPreference = "Stop"
$project = Get-Location

Write-Host "ONZEUP v1.4.9.1 - Jogos + Convocacao" -ForegroundColor Cyan

function ReadFile($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function WriteFile($path, $content) {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

$gamesPath = Join-Path $project "src\app\(app)\jogos\page.tsx"

if (!(Test-Path $gamesPath)) {
  throw "Arquivo nao encontrado: $gamesPath"
}

$c = ReadFile $gamesPath

# Corrige qualquer texto quebrado de codificacao.
$c = $c.Replace("ConvocaÃ§Ã£o", "Convocação")
$c = $c.Replace("Convocacao", "Convocação")

# Garante que a acao principal de convocacao exista diretamente na lista de proximos jogos.
if ($c -notmatch 'href=\{`/convocacoes/\$\{match\.id\}`\}') {
  $old = @'
<Link className="btn btn-secondary btn-small" href={`/jogos/${match.id}`}>
                              Abrir jogo
                            </Link>
'@

  $new = @'
<Link className="btn btn-secondary btn-small" href={`/jogos/${match.id}`}>
                              Abrir jogo
                            </Link>
                            <Link className="match-callup-button" href={`/convocacoes/${match.id}`}>
                              Convocação <span className="match-callup-count">{match.callUps.length}</span>
                            </Link>
'@

  if ($c.Contains($old)) {
    $c = $c.Replace($old, $new)
  } else {
    throw "Nao foi possivel localizar o bloco de acoes dos proximos jogos."
  }
}

WriteFile $gamesPath $c
Write-Host "Atualizado: src\app\(app)\jogos\page.tsx"

# Corrige o mesmo texto no detalhe do jogo, se necessario.
$detailPath = Join-Path $project "src\app\(app)\jogos\[id]\page.tsx"
if (Test-Path $detailPath) {
  $d = ReadFile $detailPath
  $d = $d.Replace("CONVOCAÃ‡ÃƒO", "CONVOCAÇÃO")
  $d = $d.Replace("ConvocaÃ§Ã£o", "Convocação")
  $d = $d.Replace("Gerenciar convocacao", "Gerenciar convocação")
  WriteFile $detailPath $d
  Write-Host "Atualizado: detalhe do jogo"
}

Write-Host ""
Write-Host "v1.4.9.1 aplicada." -ForegroundColor Green
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Ainda nao faca git push antes do build passar."
