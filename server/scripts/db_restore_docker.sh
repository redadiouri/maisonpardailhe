#!/bin/bash

###############################################################################
# Script de restauration MySQL pour environnement Docker
#
# Usage:
#   ./db_restore_docker.sh                    # Liste les backups disponibles
#   ./db_restore_docker.sh <fichier.sql>      # Restaure un backup spécifique
#   ./db_restore_docker.sh latest             # Restaure le plus récent
###############################################################################

set -e

# Configuration
DB_CONTAINER_NAME="${DB_CONTAINER_NAME:-maisonpardailhe-db}"
DB_NAME="${DB_NAME:-maisonpardailhe}"
DB_USER="${DB_USER:-maisonpardailhe_user}"
DB_PASSWORD="${DB_PASSWORD}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Fonction pour lister les backups
list_backups() {
    echo -e "${CYAN}📦 Backups disponibles:${NC}"
    echo "════════════════════════════════════════════════════════════"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/backup-*.sql 2>/dev/null)" ]; then
        echo -e "${RED}❌ Aucun backup trouvé dans: $BACKUP_DIR${NC}"
        return 1
    fi
    
    ls -lht "$BACKUP_DIR"/backup-*.sql | nl | while read num rest; do
        echo "$num. $rest"
    done
    
    echo "════════════════════════════════════════════════════════════"
    return 0
}

# Fonction de restauration
restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Fichier introuvable: $backup_file${NC}"
        exit 1
    fi
    
    local size=$(du -h "$backup_file" | cut -f1)
    
    echo ""
    echo -e "${YELLOW}⚠️  ATTENTION: Cette opération va ÉCRASER la base de données actuelle!${NC}"
    echo "   Base: $DB_NAME"
    echo "   Conteneur: $DB_CONTAINER_NAME"
    echo "   Fichier: $(basename $backup_file)"
    echo "   Taille: $size"
    echo ""
    
    read -p "❓ Voulez-vous continuer? (oui/non): " confirm
    if [ "$confirm" != "oui" ] && [ "$confirm" != "o" ]; then
        echo -e "${RED}❌ Restauration annulée${NC}"
        exit 0
    fi
    
    # Vérifier que le conteneur existe
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
        echo -e "${RED}❌ Le conteneur '$DB_CONTAINER_NAME' n'est pas en cours d'exécution${NC}"
        exit 1
    fi
    
    echo ""
    echo "🔄 Restauration en cours..."
    
    # Restaurer via docker exec
    if docker exec -i "$DB_CONTAINER_NAME" mysql \
        -u"$DB_USER" \
        -p"$DB_PASSWORD" \
        --default-character-set=utf8mb4 \
        "$DB_NAME" < "$backup_file" 2>/dev/null; then
        
        echo -e "${GREEN}✅ Restauration terminée avec succès!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Erreur lors de la restauration${NC}"
        exit 1
    fi
}

# Programme principal
echo "════════════════════════════════════════════════════════════"
echo "🔄 Restauration Docker de la base de données"
echo "════════════════════════════════════════════════════════════"

# Si aucun argument, lister les backups
if [ $# -eq 0 ]; then
    if list_backups; then
        echo ""
        echo "Usage:"
        echo "  $0 <fichier.sql>  # Restaurer un backup"
        echo "  $0 latest         # Restaurer le plus récent"
    fi
    exit 0
fi

# Déterminer le fichier à restaurer
if [ "$1" == "latest" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/backup-*.sql 2>/dev/null | head -n 1)
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Aucun backup disponible${NC}"
        exit 1
    fi
    echo -e "${CYAN}📂 Sélection du backup le plus récent: $(basename $BACKUP_FILE)${NC}"
else
    # Si chemin absolu, utiliser tel quel, sinon chercher dans BACKUP_DIR
    if [ -f "$1" ]; then
        BACKUP_FILE="$1"
    else
        BACKUP_FILE="$BACKUP_DIR/$1"
    fi
fi

restore_backup "$BACKUP_FILE"
