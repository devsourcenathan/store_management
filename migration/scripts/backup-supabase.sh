#!/bin/bash
# ============================================
# Script de Backup de la base Supabase (Linux/Mac)
# ============================================
# Usage: ./backup-supabase.sh

set -e

BACKUP_DIR="../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/supabase_backup_$TIMESTAMP.sql"

# Variables de connexion Supabase
SUPABASE_HOST="db.aoqlwlhuwbmvrnlcndex.supabase.co"
SUPABASE_PORT="5432"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"
SUPABASE_PASSWORD="Sadenachbi@13"

# Créer le dossier de backup
mkdir -p "$BACKUP_DIR"

echo "========================================"
echo " BACKUP DE LA BASE SUPABASE"
echo "========================================"
echo ""
echo "Hote: $SUPABASE_HOST"
echo "Base: $SUPABASE_DB"
echo "Fichier: $BACKUP_FILE"
echo ""

# Vérifier que pg_dump est installé
if ! command -v pg_dump &> /dev/null; then
    echo "ERREUR: pg_dump n'est pas installé"
    echo "Installez: sudo apt install postgresql-client"
    exit 1
fi

# Demander confirmation
read -p "Voulez-vous lancer le backup? (O/N) " confirm
if [[ "$confirm" != "O" && "$confirm" != "o" ]]; then
    echo "Backup annulé."
    exit 0
fi

echo ""
echo "Début du backup..."

PGPASSWORD="$SUPABASE_PASSWORD" pg_dump -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo "Backup réussi!"
    echo "Fichier: $BACKUP_FILE"
    echo "Taille: $FILE_SIZE"
    
    # Créer aussi un backup compressé
    gzip -k "$BACKUP_FILE"
    echo "Backup compressé: ${BACKUP_FILE}.gz"
else
    echo ""
    echo "ERREUR lors du backup!"
    exit 1
fi
