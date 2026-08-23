$ErrorActionPreference = "Stop"
$project = Get-Location

Write-Host "ONZEUP v1.4.9.2 - Convocacao + Selecao de Atletas FIX" -ForegroundColor Cyan

function ReadFileLiteral($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function WriteFileLiteral($path, $content) {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

# 1) Corrige texto quebrado em Jogos
$gamesPath = Join-Path $project "src\app\(app)\jogos\page.tsx"
if (!(Test-Path -LiteralPath $gamesPath)) {
  throw "Arquivo nao encontrado: $gamesPath"
}

$g = ReadFileLiteral $gamesPath
$g = $g.Replace("ConvocaÃ§Ã£o", "Convocação")
$g = $g.Replace("ConvocaÃƒÂ§ÃƒÂ£o", "Convocação")
$g = $g.Replace("ConvocaÃ§Ãƒo", "Convocação")
WriteFileLiteral $gamesPath $g
Write-Host "Corrigido: texto Convocacao em Jogos"

# 2) Convocacao
$callPath = Join-Path $project "src\app\(app)\convocacoes\[matchId]\page.tsx"

if (!(Test-Path -LiteralPath $callPath)) {
  throw "Arquivo nao encontrado: $callPath"
}

$c = ReadFileLiteral $callPath

$oldQuery = @'
  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      categoryId: match.categoryId,
      active: true,
      id: { notIn: Array.from(alreadyCalled) },
    },
    orderBy: { name: "asc" },
  });
'@

$newQuery = @'
  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      id: { notIn: Array.from(alreadyCalled) },
    },
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
'@

if ($c.Contains($oldQuery)) {
  $c = $c.Replace($oldQuery, $newQuery)
} elseif ($c -notmatch 'include: \{ category: true \}') {
  throw "Nao foi possivel localizar a consulta atual de atletas."
}

$c = $c.Replace(
  "Todos os atletas ativos desta categoria já foram adicionados.",
  "Não há outros atletas ativos disponíveis para convocação."
)

$oldSmall = @'
<small>{athlete.position || "Atleta"} {athlete.jerseyNumber != null ? `• #${athlete.jerseyNumber}` : ""}</small>
'@

$newSmall = @'
<small>
                        {athlete.category?.name || "Sem categoria"}
                        {" • "}
                        {athlete.position || "Atleta"}
                        {athlete.jerseyNumber != null ? ` • #${athlete.jerseyNumber}` : ""}
                      </small>
'@

if ($c.Contains($oldSmall)) {
  $c = $c.Replace($oldSmall, $newSmall)
}

$c = $c.Replace("ConvocaÃ§Ã£o", "Convocação")
$c = $c.Replace("CONVOCAÃ‡ÃƒO", "CONVOCAÇÃO")

WriteFileLiteral $callPath $c
Write-Host "Atualizado: selecao de atletas na Convocacao"

Write-Host ""
Write-Host "v1.4.9.2 corrigida e aplicada." -ForegroundColor Green
Write-Host "Agora rode:"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Ainda nao faca git push antes do build passar."
