$ErrorActionPreference = "Stop"

Write-Host "ONZEUP v1.4.3 - aplicando ajustes de banco..." -ForegroundColor Green

$schema = Join-Path $PSScriptRoot "prisma\schema.prisma"
if (!(Test-Path $schema)) {
  throw "prisma\schema.prisma nao encontrado. Extraia o ZIP na raiz do projeto ONZEUP."
}

$content = Get-Content $schema -Raw -Encoding UTF8

# StaffMember: dados necessários para reencontrar Coach criado depois
$oldStaff = @'
  photoUrl       String?
  bio            String?
  organizationId String
'@
$newStaff = @'
  photoUrl       String?
  bio            String?
  coachEmail     String?
  sport          SportType    @default(BOTH)
  canManageCallUps Boolean     @default(false)
  organizationId String
'@
if ($content.Contains($oldStaff) -and !$content.Contains("coachEmail     String?")) {
  $content = $content.Replace($oldStaff, $newStaff)
}

# Índice do e-mail do Coach na comissão
$oldStaffIndexes = @'
  @@index([organizationId])
  @@index([categoryId])
}
'@
$newStaffIndexes = @'
  @@index([organizationId])
  @@index([categoryId])
  @@index([coachEmail])
}
'@
if ($content.Contains($oldStaffIndexes) -and !$content.Contains("@@index([coachEmail])")) {
  $content = $content.Replace($oldStaffIndexes, $newStaffIndexes)
}

# CoachOrganizationAccess: origem da solicitação
$oldAccess = @'
  sport            SportType    @default(BOTH)
  roleTitle        String?
  active           Boolean      @default(true)
'@
$newAccess = @'
  sport            SportType    @default(BOTH)
  roleTitle        String?
  requestedBy      String       @default("CLUB")
  active           Boolean      @default(true)
'@
if ($content.Contains($oldAccess) -and !$content.Contains("requestedBy      String")) {
  $content = $content.Replace($oldAccess, $newAccess)
}

Set-Content $schema $content -Encoding UTF8

Write-Host "Schema atualizado." -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:" -ForegroundColor Yellow
Write-Host "  npx prisma validate"
Write-Host "  npx prisma db push"
Write-Host "  npx prisma generate"
Write-Host "  npm run build"
