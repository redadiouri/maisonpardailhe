# Système de Backup de Base de Données

## Vue d'ensemble

Système complet de sauvegarde et restauration de la base de données MySQL avec rotation automatique des backups.

## 🔧 Scripts disponibles

### 1. Backup manuel
```bash
# Dans le répertoire server/
npm run db:backup
```

### 2. Backup automatique avec rotation
```bash
node scripts/db_backup_auto.js
```
- Crée un dump SQL horodaté
- Garde les 30 derniers backups (configurable via `MAX_BACKUPS`)
- Supprime automatiquement les anciens backups

### 3. Restauration
```bash
# Lister les backups disponibles
node scripts/db_restore.js

# Restaurer le backup le plus récent
node scripts/db_restore.js latest

# Restaurer un backup spécifique
node scripts/db_restore.js backup-maisonpardailhe-2025-11-12_15-30-00.sql
```

## 📅 Configuration du backup automatique

### Linux/Mac (cron)

1. **Rendre le script exécutable:**
   ```bash
   chmod +x server/scripts/db_backup_cron.sh
   ```

2. **Éditer le script** et modifier le chemin du projet:
   ```bash
   nano server/scripts/db_backup_cron.sh
   # Modifier: PROJECT_DIR="/chemin/vers/maisonpardailhe/server"
   ```

3. **Ajouter à crontab:**
   ```bash
   crontab -e
   ```

4. **Exemples de planification:**
   ```cron
   # Backup quotidien à 3h du matin
   0 3 * * * /chemin/vers/maisonpardailhe/server/scripts/db_backup_cron.sh >> /var/log/maisonpardailhe_backup.log 2>&1

   # Backup toutes les 6 heures
   0 */6 * * * /chemin/vers/maisonpardailhe/server/scripts/db_backup_cron.sh >> /var/log/maisonpardailhe_backup.log 2>&1

   # Backup toutes les heures
   0 * * * * /chemin/vers/maisonpardailhe/server/scripts/db_backup_cron.sh >> /var/log/maisonpardailhe_backup.log 2>&1
   ```

5. **Vérifier les tâches cron actives:**
   ```bash
   crontab -l
   ```

### Windows (Task Scheduler)

#### Méthode 1: Interface graphique

1. **Ouvrir "Planificateur de tâches"** (Task Scheduler)
2. **Créer une tâche de base:**
   - Nom: `Backup BDD Maison Pardailhé`
   - Description: `Backup quotidien de la base de données`
3. **Déclencheur:**
   - Quotidien à 3h00
4. **Action:**
   - Programme: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server\scripts\db_backup_cron.ps1"`
5. **Conditions:**
   - ✅ Exécuter même si l'utilisateur n'est pas connecté
   - ✅ Exécuter avec les autorisations maximales

#### Méthode 2: PowerShell (en tant qu'administrateur)

```powershell
# Créer la tâche planifiée
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server\scripts\db_backup_cron.ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "Backup BDD Maison Pardailhé" -Action $action -Trigger $trigger -Principal $principal -Description "Backup quotidien de la base de données"

# Vérifier la tâche
Get-ScheduledTask -TaskName "Backup BDD Maison Pardailhé"

# Tester manuellement
Start-ScheduledTask -TaskName "Backup BDD Maison Pardailhé"

# Voir l'historique
Get-ScheduledTaskInfo -TaskName "Backup BDD Maison Pardailhé"
```

### Docker (via docker-compose)

Ajouter un service de backup dans `docker-compose.yml`:

```yaml
services:
  db-backup:
    image: mehdimp4/maisonpardailhe-server:latest
    container_name: maisonpardailhe-backup
    env_file:
      - .env
    volumes:
      - ./backups:/app/backups
    command: node scripts/db_backup_auto.js
    restart: "no"
    depends_on:
      - db
```

Puis créer une tâche cron sur l'hôte Docker:
```bash
# Backup quotidien à 3h
0 3 * * * docker-compose -f /chemin/vers/docker-compose.yml run --rm db-backup >> /var/log/db_backup.log 2>&1
```

## ⚙️ Configuration avancée

### Variables d'environnement (.env)

```env
# Configuration de la base de données
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=maisonpardailhe_user
DB_PASSWORD=votre_mot_de_passe
DB_NAME=maisonpardailhe

# Répertoire de backup (optionnel)
BACKUP_DIR=/chemin/custom/backups

# Nombre de backups à conserver (optionnel, défaut: 30)
MAX_BACKUPS=30
```

### Rotation personnalisée

Pour modifier le nombre de backups conservés:

```bash
# Garder 60 backups (2 mois de backups quotidiens)
MAX_BACKUPS=60 node scripts/db_backup_auto.js

# Garder seulement 7 backups (1 semaine)
MAX_BACKUPS=7 node scripts/db_backup_auto.js
```

## 📊 Monitoring et logs

### Vérifier l'espace disque des backups

```bash
# Linux/Mac
du -sh server/backups/

# Windows
powershell -Command "Get-ChildItem server\backups | Measure-Object -Property Length -Sum | Select-Object @{Name='Size(MB)';Expression={[math]::Round($_.Sum/1MB,2)}}"
```

### Logs de backup automatique

**Linux/Mac:**
```bash
tail -f /var/log/maisonpardailhe_backup.log
```

**Windows:**
```powershell
Get-Content server\backups\backup_cron.log -Tail 50 -Wait
```

**Docker:**
```bash
docker logs maisonpardailhe-backup
```

## 🔐 Sécurité des backups

### 1. Permissions des fichiers

**Linux/Mac:**
```bash
# Protéger les backups (lecture seule pour le propriétaire)
chmod 600 server/backups/*.sql
chmod 700 server/backups/
```

### 2. Backup hors site

**Synchroniser vers un serveur distant (rsync):**
```bash
# Ajouter après le backup dans le script cron
rsync -avz --delete server/backups/ user@remote-server:/backups/maisonpardailhe/
```

**Ou vers un stockage cloud (rclone):**
```bash
# Installer rclone: https://rclone.org/
rclone sync server/backups/ remote:maisonpardailhe-backups/
```

### 3. Chiffrement des backups

```bash
# Chiffrer un backup
gpg --symmetric --cipher-algo AES256 backup-maisonpardailhe-2025-11-12.sql

# Déchiffrer
gpg --decrypt backup-maisonpardailhe-2025-11-12.sql.gpg > backup.sql
```

## 🚨 Restauration d'urgence

### Scénario: Perte complète de données

1. **Arrêter l'application:**
   ```bash
   # Docker
   docker-compose down
   
   # PM2
   pm2 stop maisonpardailhe
   ```

2. **Restaurer le backup:**
   ```bash
   cd server
   node scripts/db_restore.js latest
   ```

3. **Vérifier les données:**
   ```bash
   mysql -u maisonpardailhe_user -p maisonpardailhe -e "SELECT COUNT(*) FROM commandes;"
   ```

4. **Redémarrer l'application:**
   ```bash
   # Docker
   docker-compose up -d
   
   # PM2
   pm2 start maisonpardailhe
   ```

### Scénario: Restauration partielle

```sql
-- Se connecter à MySQL
mysql -u maisonpardailhe_user -p maisonpardailhe

-- Restaurer seulement une table
DROP TABLE IF EXISTS menus;
SOURCE /chemin/vers/backup-maisonpardailhe-2025-11-12.sql;
```

## 📋 Checklist de maintenance

### Hebdomadaire
- [ ] Vérifier que les backups automatiques fonctionnent
- [ ] Vérifier l'espace disque disponible

### Mensuel
- [ ] Tester une restauration sur un environnement de test
- [ ] Vérifier les logs de backup
- [ ] Nettoyer les très anciens backups manuellement si nécessaire

### Annuel
- [ ] Documenter la procédure de restauration mise à jour
- [ ] Tester le plan de reprise d'activité complet

## 🛠️ Dépannage

### Erreur: "mysqldump: command not found"

**Solution:**
```bash
# Linux
sudo apt-get install mysql-client

# Mac
brew install mysql-client

# Windows
# Télécharger MySQL Community Server: https://dev.mysql.com/downloads/mysql/
# Ajouter C:\Program Files\MySQL\MySQL Server 8.0\bin au PATH
```

### Erreur: "Access denied for user"

**Solution:**
```bash
# Vérifier les identifiants dans .env
cat .env | grep DB_

# Tester la connexion manuellement
mysql -h 127.0.0.1 -u maisonpardailhe_user -p maisonpardailhe
```

### Les backups prennent trop de place

**Solutions:**
1. Réduire `MAX_BACKUPS` dans `.env`
2. Compresser les backups:
   ```bash
   # Compresser tous les backups
   cd server/backups
   gzip *.sql
   
   # Décompresser pour restauration
   gunzip backup-maisonpardailhe-2025-11-12.sql.gz
   ```

### Le cron ne s'exécute pas

**Vérifications:**
```bash
# Vérifier que cron tourne
systemctl status cron

# Vérifier les logs système
grep CRON /var/log/syslog

# Tester le script manuellement
/chemin/vers/maisonpardailhe/server/scripts/db_backup_cron.sh
```

## 📚 Ressources supplémentaires

- [Documentation MySQL Backup](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)
- [Cron Syntax Generator](https://crontab.guru/)
- [Windows Task Scheduler](https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page)
- [Docker Backup Best Practices](https://docs.docker.com/storage/volumes/#back-up-restore-or-migrate-data-volumes)

---

**Dernière mise à jour:** 2025-11-12
