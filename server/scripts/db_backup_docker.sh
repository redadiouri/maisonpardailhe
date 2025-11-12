#!/bin/bash

###############################################################################
# Script de backup MySQL pour environnement Docker
# 
# Ce script peut être exécuté:
# 1. Depuis l'hôte Docker (recommandé)
# 2. Depuis le conteneur de l'application
# 3. Via une tâche cron sur l'hôte
###############################################################################

set -e

# Configuration par défaut (peut être surchargée par .env)
DB_CONTAINER_NAME="${DB_CONTAINER_NAME:-maisonpardailhe-db}"
DB_NAME="${DB_NAME:-maisonpardailhe}"
DB_USER="${DB_USER:-maisonpardailhe_user}"
DB_PASSWORD="${DB_PASSWORD}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
MAX_BACKUPS="${MAX_BACKUPS:-30}"

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Créer le répertoire de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Nom du fichier avec timestamp
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/backup-${DB_NAME}-${TIMESTAMP}.sql"

echo "════════════════════════════════════════════════════════════"
echo "🔄 Backup Docker de la base de données"
echo "════════════════════════════════════════════════════════════"
echo "📦 Conteneur: $DB_CONTAINER_NAME"
echo "💾 Base: $DB_NAME"
echo "📁 Fichier: $(basename $BACKUP_FILE)"
echo ""

# Vérifier que le conteneur existe et tourne
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Erreur: Le conteneur '$DB_CONTAINER_NAME' n'est pas en cours d'exécution${NC}"
    echo "Conteneurs actifs:"
    docker ps --format "  - {{.Names}}"
    exit 1
fi

# Exécuter mysqldump depuis le conteneur MySQL
echo "⏳ Création du backup..."
if docker exec "$DB_CONTAINER_NAME" mysqldump \
    -u"$DB_USER" \
    -p"$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --complete-insert \
    --hex-blob \
    --default-character-set=utf8mb4 \
    "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
    
    # Vérifier la taille du backup
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup créé avec succès ($SIZE)${NC}"
else
    echo -e "${RED}❌ Erreur lors de la création du backup${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Rotation des backups (garder seulement les MAX_BACKUPS plus récents)
echo ""
echo "🗑️  Rotation des backups (max: $MAX_BACKUPS)..."
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup-*.sql 2>/dev/null | wc -l)
echo "   Backups actuels: $BACKUP_COUNT"

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    TO_DELETE=$((BACKUP_COUNT - MAX_BACKUPS))
    echo "   Suppression de $TO_DELETE ancien(s) backup(s)..."
    
    ls -1t "$BACKUP_DIR"/backup-*.sql | tail -n "$TO_DELETE" | while read old_backup; do
        rm -f "$old_backup"
        echo -e "   ${YELLOW}✓ Supprimé: $(basename $old_backup)${NC}"
    done
fi

# Résumé des backups disponibles
echo ""
echo "📊 Backups disponibles (5 plus récents):"
echo "────────────────────────────────────────────────────────────"
ls -lht "$BACKUP_DIR"/backup-*.sql 2>/dev/null | head -n 5 | while read -r line; do
    echo "   $line"
done
echo "────────────────────────────────────────────────────────────"

echo ""
echo -e "${GREEN}✅ Backup terminé avec succès!${NC}"
echo "════════════════════════════════════════════════════════════"

exit 0
