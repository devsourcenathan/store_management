# ============================================
# Script de Backup de la base Supabase
# ============================================
# Usage: .\backup-supabase.ps1
# Requiert: psql (PostgreSQL client) installé

$BACKUP_DIR = "C:\Users\nathan.tchinda\projects\stock\migration\backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\supabase_backup_$TIMESTAMP.sql"

# Variables de connexion Supabase (depuis .env)
$SUPABASE_HOST = "db.aoqlwlhuwbmvrnlcndex.supabase.co"
$SUPABASE_PORT = "5432"
$SUPABASE_DB = "postgres"
$SUPABASE_USER = "postgres"
$SUPABASE_PASSWORD = "Sadenachbi@13"

# Créer le dossier de backup
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Force -Path $BACKUP_DIR
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " BACKUP DE LA BASE SUPABASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Hote: $SUPABASE_HOST"
Write-Host "Base: $SUPABASE_DB"
Write-Host "Fichier: $BACKUP_FILE"
Write-Host ""

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
$confirm = Read-Host "Voulez-vous lancer le backup? (O/N)"
if ($confirm -ne "O" -and $confirm -ne "o") {
    Write-Host "Backup annulé." -ForegroundColor Yellow
    exit 0
}

# Lancer le backup
Write-Host ""
Write-Host "Début du backup..." -ForegroundColor Yellow

$env:PGPASSWORD = $SUPABASE_PASSWORD

& psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB -f $BACKUP_FILE 2>&1

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $BACKUP_FILE).Length / 1MB
    Write-Host ""
    Write-Host "Backup réussi!" -ForegroundColor Green
    Write-Host "Fichier: $BACKUP_FILE" -ForegroundColor Green
    Write-Host "Taille: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
    
    # Créer aussi un backup compressé
    $zipFile = "$BACKUP_DIR\supabase_backup_$TIMESTAMP.zip"
    Compress-Archive -Path $BACKUP_FILE -DestinationPath $zipFile
    Write-Host "Backup compressé: $zipFile" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ERREUR lors du backup!" -ForegroundColor Red
    exit 1
}

Remove-Item Env:\PGPASSWORD
