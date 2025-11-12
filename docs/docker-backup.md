# Backup Base de Données pour Environnement Docker

## 🐳 Vue d'ensemble

Système de backup optimisé pour l'environnement Docker, permettant de sauvegarder et restaurer la base de données MySQL depuis l'hôte ou depuis le conteneur.

## 📦 Architecture Docker

```
Host Machine (Windows/Linux)
│
├── Docker Containers
│   ├── maisonpardailhe-server (App Node.js)
│   └── maisonpardailhe-db (MySQL 8.0)
│
└── Backups Directory
    └── server/backups/ (Stockage local des backups)
```

## 🚀 Utilisation rapide

### Depuis l'hôte Docker (RECOMMANDÉ)

```bash
# Windows
cd server
npm run db:backup:docker

# Linux/Mac
cd server
npm run db:backup:docker
# ou directement
bash scripts/db_backup_docker.sh
```

### Lister les backups

```bash
npm run db:restore:docker
```

### Restaurer le dernier backup

```bash
npm run db:restore:docker:latest
```

### Restaurer un backup spécifique

```bash
# Windows
pwsh scripts/db_restore_docker.ps1 backup-maisonpardailhe-2025-11-12_15-30-00.sql

# Linux/Mac
bash scripts/db_restore_docker.sh backup-maisonpardailhe-2025-11-12_15-30-00.sql
```

## 🔧 Configuration

### Variables d'environnement (.env)

```env
# Nom du conteneur MySQL (doit correspondre à docker-compose.yml)
DB_CONTAINER_NAME=maisonpardailhe-db

# Credentials de la base de données
DB_NAME=maisonpardailhe
DB_USER=maisonpardailhe_user
DB_PASSWORD=votre_mot_de_passe_securise

# Répertoire de backup (sur l'hôte)
BACKUP_DIR=./backups

# Nombre de backups à conserver
MAX_BACKUPS=30
```

### docker-compose.yml

Assurez-vous que le nom du service MySQL correspond à `DB_CONTAINER_NAME`:

```yaml
services:
  db:
    image: mysql:8.0
    container_name: maisonpardailhe-db  # ← Important!
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - maisonpardailhe-network

volumes:
  mysql_data:
```

## 📅 Backup automatique

### Windows - Planificateur de tâches

#### Méthode 1: Interface graphique

1. Ouvrir **Planificateur de tâches**
2. **Créer une tâche de base**:
   - Nom: `Backup Docker BDD Maison Pardailhé`
   - Déclencheur: Quotidien à 3h00
3. **Action**:
   - Programme: `powershell.exe`
   - Arguments: 
     ```
     -ExecutionPolicy Bypass -File "C:\chemin\vers\maisonpardailhe\server\scripts\db_backup_docker.ps1" -WorkingDirectory "C:\chemin\vers\maisonpardailhe\server"
     ```
4. **Conditions**:
   - ✅ Exécuter même si l'utilisateur n'est pas connecté
   - ✅ Exécuter avec les autorisations maximales

#### Méthode 2: PowerShell (administrateur)

```powershell
$ProjectPath = "C:\chemin\vers\maisonpardailhe\server"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$ProjectPath\scripts\db_backup_docker.ps1`"" `
    -WorkingDirectory $ProjectPath

$trigger = New-ScheduledTaskTrigger -Daily -At 3am

$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName "Backup Docker BDD Maison Pardailhé" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Description "Backup quotidien de la base de données Docker"

# Vérifier la tâche
Get-ScheduledTask -TaskName "Backup Docker BDD Maison Pardailhé"

# Tester manuellement
Start-ScheduledTask -TaskName "Backup Docker BDD Maison Pardailhé"
```

### Linux/Mac - Cron

```bash
# Éditer crontab
crontab -e

# Ajouter (backup quotidien à 3h du matin)
0 3 * * * cd /chemin/vers/maisonpardailhe/server && bash scripts/db_backup_docker.sh >> backups/backup_cron.log 2>&1

# Exemples d'autres fréquences
0 */6 * * *  # Toutes les 6 heures
0 * * * *    # Toutes les heures
0 0 * * 0    # Chaque dimanche à minuit
```

## 🔄 Scénarios avancés

### 1. Backup depuis le conteneur de l'application

```bash
# Exécuter le backup depuis le conteneur Node.js
docker exec maisonpardailhe-server npm run db:backup:docker

# Copier les backups du conteneur vers l'hôte
docker cp maisonpardailhe-server:/app/server/backups ./backups-host
```

### 2. Backup vers stockage externe

#### Windows - Robocopy

```powershell
# Synchroniser vers un serveur réseau
robocopy .\server\backups \\serveur-backup\maisonpardailhe\backups /MIR /Z /LOG:backup_sync.log

# Ajouter à la tâche planifiée (après le backup)
$action2 = New-ScheduledTaskAction -Execute "robocopy.exe" -Argument "C:\chemin\backups \\serveur\backups /MIR"
```

#### Linux/Mac - rsync

```bash
# Synchroniser vers un serveur distant
rsync -avz --delete ./server/backups/ user@backup-server:/backups/maisonpardailhe/

# Avec SSH key
rsync -avz -e "ssh -i ~/.ssh/id_rsa" ./server/backups/ user@backup-server:/backups/

# Ajouter au cron (après le backup)
5 3 * * * rsync -avz --delete /chemin/backups/ user@backup-server:/backups/ >> /var/log/backup_sync.log 2>&1
```

#### Cloud - rclone

```bash
# Installer rclone: https://rclone.org/

# Configurer un remote (une seule fois)
rclone config

# Synchroniser vers le cloud
rclone sync ./server/backups/ remote:maisonpardailhe-backups/

# Ajouter au cron
10 3 * * * rclone sync /chemin/backups/ remote:maisonpardailhe-backups/ >> /var/log/rclone.log 2>&1
```

### 3. Backup avant mise à jour

```bash
# Script de déploiement avec backup automatique
#!/bin/bash

echo "🔄 Backup avant mise à jour..."
cd server
npm run db:backup:docker

echo "🐳 Mise à jour de l'application..."
docker-compose pull
docker-compose up -d

echo "✅ Déploiement terminé"
```

## 🚨 Restauration d'urgence

### Scénario: Perte de données

```bash
# 1. Arrêter l'application
docker-compose down

# 2. Lister les backups disponibles
cd server
npm run db:restore:docker

# 3. Restaurer le backup le plus récent
npm run db:restore:docker:latest
# ⚠️ Confirmer avec "oui" quand demandé

# 4. Redémarrer l'application
cd ..
docker-compose up -d

# 5. Vérifier les logs
docker-compose logs -f maisonpardailhe-server
```

### Scénario: Restauration partielle

```bash
# Se connecter au conteneur MySQL
docker exec -it maisonpardailhe-db mysql -u maisonpardailhe_user -p

# Dans MySQL
USE maisonpardailhe;

# Restaurer seulement une table
DROP TABLE IF EXISTS menus;
SOURCE /path/to/backup.sql;  # (si backup copié dans le conteneur)
```

### Scénario: Migration vers nouveau serveur

```bash
# Sur l'ancien serveur
cd server
npm run db:backup:docker

# Copier le backup vers le nouveau serveur
scp backups/backup-latest.sql user@new-server:/tmp/

# Sur le nouveau serveur
docker-compose up -d  # Démarrer les conteneurs
cd server
pwsh scripts/db_restore_docker.ps1 /tmp/backup-latest.sql
```

## 📊 Monitoring et maintenance

### Vérifier l'espace disque

```bash
# Windows
powershell -Command "Get-ChildItem server\backups | Measure-Object -Property Length -Sum | Select-Object @{Name='Size(MB)';Expression={[math]::Round($_.Sum/1MB,2)}}"

# Linux/Mac
du -sh server/backups/
```

### Logs de backup automatique

```bash
# Windows
Get-Content server\backups\backup_cron.log -Tail 50 -Wait

# Linux/Mac
tail -f server/backups/backup_cron.log
```

### Vérifier les conteneurs Docker

```bash
# Lister les conteneurs actifs
docker ps

# Vérifier le conteneur MySQL
docker inspect maisonpardailhe-db

# Logs du conteneur MySQL
docker logs maisonpardailhe-db --tail 100
```

### Tester la connexion à MySQL

```bash
# Depuis l'hôte
docker exec -it maisonpardailhe-db mysql -u maisonpardailhe_user -p -e "SELECT COUNT(*) FROM maisonpardailhe.commandes;"

# Vérifier les tables
docker exec -it maisonpardailhe-db mysql -u maisonpardailhe_user -p -e "SHOW TABLES FROM maisonpardailhe;"
```

## 🔐 Sécurité

### 1. Protéger les backups

```bash
# Windows
icacls server\backups /inheritance:r /grant:r "$env:USERNAME:(OI)(CI)F"

# Linux/Mac
chmod 700 server/backups/
chmod 600 server/backups/*.sql
```

### 2. Chiffrer les backups

```bash
# Installer GPG
# Windows: https://gpg4win.org/
# Linux: apt-get install gnupg
# Mac: brew install gnupg

# Chiffrer un backup
gpg --symmetric --cipher-algo AES256 backup-maisonpardailhe-2025-11-12.sql

# Déchiffrer
gpg --decrypt backup-maisonpardailhe-2025-11-12.sql.gpg > backup.sql
```

### 3. Backup des volumes Docker

```bash
# Backup du volume MySQL complet
docker run --rm \
  -v maisonpardailhe_mysql_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/mysql_volume_$(date +%Y%m%d).tar.gz -C /data .

# Restaurer un volume
docker run --rm \
  -v maisonpardailhe_mysql_data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/mysql_volume_20251112.tar.gz"
```

## 🛠️ Dépannage

### Erreur: "Le conteneur n'est pas en cours d'exécution"

```bash
# Vérifier les conteneurs actifs
docker ps -a

# Démarrer le conteneur MySQL
docker-compose up -d db

# Vérifier le nom du conteneur
docker ps --format '{{.Names}}'
```

### Erreur: "Access denied"

```bash
# Vérifier les credentials dans .env
cat .env | grep DB_

# Tester la connexion manuellement
docker exec -it maisonpardailhe-db mysql -u maisonpardailhe_user -p
```

### Les backups sont vides

```bash
# Vérifier les permissions du répertoire
ls -la server/backups/

# Vérifier que MySQL contient des données
docker exec maisonpardailhe-db mysql -u maisonpardailhe_user -p -e "SELECT COUNT(*) FROM maisonpardailhe.commandes;"
```

### Le script ne trouve pas Docker

```bash
# Windows - Vérifier Docker Desktop
docker --version

# Ajouter Docker au PATH si nécessaire
$env:PATH += ";C:\Program Files\Docker\Docker\resources\bin"

# Linux/Mac
which docker
sudo systemctl status docker
```

## 📋 Checklist de maintenance

### Quotidien (automatisé)
- [x] Backup automatique à 3h du matin
- [x] Rotation des backups (garder 30 derniers)

### Hebdomadaire
- [ ] Vérifier que les backups automatiques fonctionnent
- [ ] Vérifier l'espace disque disponible
- [ ] Vérifier les logs de backup

### Mensuel
- [ ] Tester une restauration sur un environnement de test
- [ ] Synchroniser vers stockage externe/cloud
- [ ] Vérifier l'intégrité des backups

### Annuel
- [ ] Tester le plan de reprise d'activité complet
- [ ] Mettre à jour la documentation
- [ ] Revoir la politique de rétention

## 📚 Ressources

- [Docker MySQL Official Image](https://hub.docker.com/_/mysql)
- [mysqldump Documentation](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)
- [Docker Backup Best Practices](https://docs.docker.com/storage/volumes/#back-up-restore-or-migrate-data-volumes)
- [Cron Syntax Generator](https://crontab.guru/)
- [Windows Task Scheduler](https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page)

---

**Dernière mise à jour:** 2025-11-12  
**Version:** 1.0 - Docker optimized
