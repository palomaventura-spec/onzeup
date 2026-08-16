Write-Host "=== ONZEUP v1.3.7 ==="
Select-String -Path package.json -Pattern '"version": "1.3.7"'
if (Test-Path "src\app\admin\(protected)") {
  Write-Host "ERRO: pasta (protected) ainda existe" -ForegroundColor Red
} else {
  Write-Host "OK - sem route group (protected)" -ForegroundColor Green
}
$pages = @(
  "src\app\admin\page.tsx",
  "src\app\admin\pagamentos\page.tsx",
  "src\app\admin\organizacoes\page.tsx",
  "src\app\admin\planos\page.tsx",
  "src\app\admin\players\page.tsx",
  "src\app\admin\login\page.tsx"
)
foreach ($p in $pages) {
  if (Test-Path $p) { Write-Host "OK - $p" -ForegroundColor Green }
  else { Write-Host "FALTA - $p" -ForegroundColor Red }
}
