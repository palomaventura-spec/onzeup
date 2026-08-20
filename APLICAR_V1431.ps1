$ErrorActionPreference = "Stop"

$dashboard = Join-Path $PSScriptRoot "src\app\coach\dashboard\page.tsx"
if (!(Test-Path $dashboard)) { throw "Dashboard Coach nao encontrado." }

$c = Get-Content $dashboard -Raw -Encoding UTF8

# Sempre mostrar acesso ao site profissional
$old = '{coach.isPublic ? <Link className="btn-secondary" href={`/coach-profile/${coach.slug}`}>Ver meu site ↗</Link> : null}'
$new = '<Link className="btn-secondary" href="/coach/meu-site">Meu site profissional ↗</Link>'
$c = $c.Replace($old, $new)

# Botao da lista de jogos muda conforme permissao
$old2 = '<Link className="btn-secondary btn-small" href={`/coach/convocacoes/${match.id}`}>Ver lista →</Link>'
$new2 = @'
<Link className="btn-secondary btn-small" href={`/coach/convocacoes/${match.id}`}>
  {activeAccesses.some((access) =>
    access.organizationId === match.organizationId &&
    access.canManageCallUps &&
    (!access.categoryId || access.categoryId === match.categoryId)
  ) ? "Gerenciar convocação →" : "Ver lista →"}
</Link>
'@
$c = $c.Replace($old2, $new2)

[IO.File]::WriteAllText($dashboard, $c, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "ONZEUP v1.4.3.1 aplicado." -ForegroundColor Green
Write-Host "Nao ha alteracao de banco nesta versao."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "  npm run build"
