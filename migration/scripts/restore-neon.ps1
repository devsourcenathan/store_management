# ============================================
# Script de restauration vers Neon
# ============================================
# Usage: .\restore-neon.ps1 <fichier_backup.sql>
# Requiert: psql (PostgreSQL client) installé

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

# Variables de connexion Neon (depuis backend/.env)
$NEON_HOST = "ep-nameless-wildflower-atnndy1x-pooler.c-9.us-east-1.aws.neon.tech"
$NEON_PORT = "5432"
$NEON_DB = "neondb"
$NEON_USER = "neondb_owner"
$NEON_PASSWORD = "npg_WhX3CJ5ctjOU"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " RESTAURATION VERS NEON" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Hote: $NEON_HOST"
Write-Host "Base: $NEON_DB"
Write-Host "Fichier: $BackupFile"
Write-Host ""

# Vérifier que le fichier existe
if (-not (Test-Path $BackupFile)) {
    Write-Host "ERREUR: Le fichier '$BackupFile' n'existe pas" -ForegroundColor Red
    exit 1
}

# Vérifier que psql est installé
try {
    $psqlVersion = & psql --version 2>&1
    Write-Host "psql détecté: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: psql n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Installez PostgreSQL client: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Demander confirmation
$confirm = Read-Host "ATTENTION: Cela va écraser la base Neon actuelle. Continuer? (O/N)"
if ($confirm -ne "O" -and $confirm -ne "o") {
    Write-Host "Restauration annulée." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Début de la restauration..." -ForegroundColor Yellow

$env:PGPASSWORD = $NEON_PASSWORD

# Restaurer le backup
& psql -h $NEON_HOST -p $NEON_PORT -U $NEON_USER -d $NEON_DB -f $BackupFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Restauration réussie!" -ForegroundColor Green
    
    # Vérifier les tables
    Write-Host ""
    Write-Host "Vérification des tables..." -ForegroundColor Yellow
    & psql -h $NEON_HOST -p $NEON_PORT -U $NEON_USER -d $NEON_DB -c "\dt" 2>&1
} else {
    Write-Host ""
    Write-Host "ERREUR lors de la restauration!" -ForegroundColor Red
    exit 1
}

Remove-Item Env:\PGPASSWORD
