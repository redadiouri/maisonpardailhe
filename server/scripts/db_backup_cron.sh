#!/bin/bash

###############################################################################
# Script de backup quotidien pour cron
# 
# Installation (Linux/Mac):
#   1. Rendre le script exécutable:
#      chmod +x scripts/db_backup_cron.sh
#
#   2. Ajouter à crontab (backup quotidien à 3h du matin):
#      crontab -e
#      0 3 * * * /chemin/vers/maisonpardailhe/server/scripts/db_backup_cron.sh >> /var/log/maisonpardailhe_backup.log 2>&1
#
#   3. Ou pour un backup toutes les 6 heures:
#      0 */6 * * * /chemin/vers/maisonpardailhe/server/scripts/db_backup_cron.sh >> /var/log/maisonpardailhe_backup.log 2>&1
###############################################################################

# Répertoire du projet (à adapter selon votre installation)
PROJECT_DIR="/chemin/vers/maisonpardailhe/server"

# Charger nvm si nécessaire (décommenter si vous utilisez nvm)
# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Se placer dans le répertoire du projet
cd "$PROJECT_DIR" || exit 1

# Date/heure de début
echo "═══════════════════════════════════════════════════════════════"
echo "Backup automatique démarré: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════════"

# Exécuter le script de backup
node scripts/db_backup_auto.js

# Code de sortie
EXIT_CODE=$?

# Date/heure de fin
echo "───────────────────────────────────────────────────────────────"
echo "Backup terminé: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Code de sortie: $EXIT_CODE"
echo "═══════════════════════════════════════════════════════════════"
echo ""

exit $EXIT_CODE
