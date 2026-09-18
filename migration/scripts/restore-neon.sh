#!/bin/bash
# ============================================
# Script de restauration vers Neon (Linux/Mac)
# ============================================
# Usage: ./restore-neon.sh <fichier_backup.sql>

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore-neon.sh <fichier_backup.sql>"
    exit 1
fi

BACKUP_FILE="$1"

# Variables de connexion Neon
NEON_HOST="ep-nameless-wildflower-atnndy1x-pooler.c-9.us-east-1.aws.neon.tech"
NEON_PORT="5432"
NEON_DB="neondb"
NEON_USER="neondb_owner"
NEON_PASSWORD="npg_WhX3CJ5ctjOU"

echo "========================================"
echo " RESTAURATION VERS NEON"
echo "========================================"
echo ""
echo "Hote: $NEON_HOST"
echo "Base: $NEON_DB"
echo "Fichier: $BACKUP_FILE"
echo ""

# Vérifier que le fichier existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERREUR: Le fichier '$BACKUP_FILE' n'existe pas"
    exit 1
fi

# Vérifier que psql est installé
if ! command -v psql &> /dev/null; then
    echo "ERREUR: psql n'est pas installé"
    echo "Installez: sudo apt install postgresql-client"
    exit 1
fi

# Demander confirmation
read -p "ATTENTION: Cela va écraser la base Neon actuelle. Continuer? (O/N) " confirm
if [[ "$confirm" != "O" && "$confirm" != "o" ]]; then
    echo "Restauration annulée."
    exit 0
fi

echo ""
echo "Début de la restauration..."

PGPASSWORD="$NEON_PASSWORD" psql -h "$NEON_HOST" -p "$NEON_PORT" -U "$NEON_USER" -d "$NEON_DB" -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "Restauration réussie!"
    
    # Vérifier les tables
    echo ""
    echo "Vérification des tables..."
    PGPASSWORD="$NEON_PASSWORD" psql -h "$NEON_HOST" -p "$NEON_PORT" -U "$NEON_USER" -d "$NEON_DB" -c "\dt"
else
    echo ""
    echo "ERREUR lors de la restauration!"
    exit 1
fi
