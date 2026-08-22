$ErrorActionPreference = "Stop"

$project = Get-Location
$schemaPath = Join-Path $project "prisma\schema.prisma"

Write-Host "ONZEUP v1.4.7.1 - Corrigir Payment -> Organization" -ForegroundColor Cyan

function Read-Utf8File($path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8File($path, $content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

$schema = Read-Utf8File $schemaPath

# Localiza especificamente o model Payment { ... }
$match = [regex]::Match(
  $schema,
  '(?s)model\s+Payment\s*\{.*?\r?\n\}'
)

if (!$match.Success) {
  throw "Nao foi possivel localizar o model Payment no schema.prisma."
}

$paymentBlock = $match.Value

if ($paymentBlock -notmatch 'organizationId\s+String\?') {
  # Insere o vinculo antes de playerId, se existir.
  if ($paymentBlock -match 'playerId\s+String\?') {
    $paymentBlock = [regex]::Replace(
      $paymentBlock,
      '(\r?\n\s*)playerId\s+String\?',
      '$1organizationId String?$1organization Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)$1playerId String?',
      1
    )
  } else {
    # Fallback: insere antes de createdAt
    $paymentBlock = [regex]::Replace(
      $paymentBlock,
      '(\r?\n\s*)createdAt',
      '$1organizationId String?$1organization Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)$1createdAt',
      1
    )
  }
}

if ($paymentBlock -notmatch '@@index\(\[organizationId\]\)') {
  if ($paymentBlock -match '@@index\(\[playerId\]\)') {
    $paymentBlock = $paymentBlock -replace '(\s*@@index\(\[playerId\]\))', "`r`n  @@index([organizationId])`$1"
  } else {
    $paymentBlock = $paymentBlock -replace '\r?\n\}$', "`r`n  @@index([organizationId])`r`n}"
  }
}

$schema = $schema.Substring(0, $match.Index) + $paymentBlock + $schema.Substring($match.Index + $match.Length)

# Garante o lado inverso em Organization.
$orgMatch = [regex]::Match(
  $schema,
  '(?s)model\s+Organization\s*\{.*?\r?\n\}'
)

if (!$orgMatch.Success) {
  throw "Nao foi possivel localizar o model Organization no schema.prisma."
}

$orgBlock = $orgMatch.Value

if ($orgBlock -notmatch '\bpayments\s+Payment\[\]') {
  if ($orgBlock -match 'subscription\s+Subscription\?') {
    $orgBlock = [regex]::Replace(
      $orgBlock,
      '(\r?\n\s*)subscription\s+Subscription\?',
      '$1subscription Subscription?$1payments Payment[]',
      1
    )
  } else {
    $orgBlock = $orgBlock -replace '\r?\n\}$', "`r`n  payments Payment[]`r`n}"
  }

  $schema = $schema.Substring(0, $orgMatch.Index) + $orgBlock + $schema.Substring($orgMatch.Index + $orgMatch.Length)
}

Write-Utf8File $schemaPath $schema

Write-Host ""
Write-Host "Schema corrigido." -ForegroundColor Green
Write-Host "Agora rode, um por vez:"
Write-Host "  npx prisma format"
Write-Host "  npx prisma validate"
Write-Host "  npx prisma db push"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
