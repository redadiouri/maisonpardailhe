# 🔄 Système de Backup - Guide Rapide

## ✅ Système créé avec succès!

Le système de backup pour environnement Docker est maintenant prêt à l'emploi.

## 📁 Fichiers créés

### Scripts de backup/restauration
- ✅ `server/scripts/db_backup_docker.ps1` - Backup depuis l'hôte (Windows)
- ✅ `server/scripts/db_backup_docker.sh` - Backup depuis l'hôte (Linux/Mac)
- ✅ `server/scripts/db_restore_docker.ps1` - Restauration (Windows)
- ✅ `server/scripts/db_restore_docker.sh` - Restauration (Linux/Mac)

### Documentation
- ✅ `docs/docker-backup.md` - Guide complet pour environnement Docker
- ✅ `docs/database-backup.md` - Guide général (non-Docker)
- ✅ `deploy/cmd.txt` - Commandes de déploiement mises à jour

### Configuration
- ✅ `server/package.json` - Scripts npm ajoutés

## 🚀 Utilisation rapide

### 1. **Démarrer les conteneurs Docker** (si pas encore fait)

```bash
# Depuis la racine du projet
docker-compose up -d
```

### 2. **Créer un backup**

```bash
cd server
npm run db:backup:docker
```

**Résultat attendu:**
```
✓ Backup créé avec succès (X.XX MB)
📂 30 backup(s) au total (max: 30)
```

### 3. **Lister les backups**

```bash
npm run db:restore:docker
```

### 4. **Restaurer un backup**

```bash
# Restaurer le plus récent
npm run db:restore:docker:latest

# Restaurer un backup spécifique
pwsh scripts/db_restore_docker.ps1 backup-maisonpardailhe-2025-11-12_15-30-00.sql
```

## ⚙️ Configuration requise

### Dans `.env` (ou `.env.production`)

```env
# Nom du conteneur MySQL (doit correspondre à docker-compose.yml)
DB_CONTAINER_NAME=maisonpardailhe-db

# Credentials
DB_NAME=maisonpardailhe
DB_USER=maisonpardailhe_user
DB_PASSWORD=votre_mot_de_passe

# Optionnel
BACKUP_DIR=./backups
MAX_BACKUPS=30
```

### Dans `docker-compose.yml`

```yaml
services:
  db:
    image: mysql:8.0
    container_name: maisonpardailhe-db  # ← Doit correspondre à DB_CONTAINER_NAME
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
```

## 📅 Planifier des backups automatiques

### Windows - Planificateur de tâches

```powershell
# Exécuter en tant qu'administrateur
$ProjectPath = "C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server"

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
    -Principal $principal

# Tester
Start-ScheduledTask -TaskName "Backup Docker BDD Maison Pardailhé"
```

### Linux/Mac - Cron

```bash
# Éditer crontab
crontab -e

# Ajouter (backup quotidien à 3h)
0 3 * * * cd /chemin/vers/maisonpardailhe/server && bash scripts/db_backup_docker.sh >> backups/backup_cron.log 2>&1
```

## 🎯 Prochaines étapes

1. **Démarrer Docker:**
   ```bash
   docker-compose up -d
   ```

2. **Tester le backup:**
   ```bash
   cd server
   npm run db:backup:docker
   ```

3. **Configurer le backup automatique** (voir ci-dessus)

4. **Configurer la synchronisation vers stockage externe** (optionnel):
   - Cloud (rclone)
   - Serveur distant (rsync/robocopy)
   - Volume Docker persistant

## 📚 Documentation complète

- **Guide Docker:** `docs/docker-backup.md`
- **Guide général:** `docs/database-backup.md`
- **Commandes déploiement:** `deploy/cmd.txt`

## 🔧 Dépannage

### Le conteneur n'est pas démarré

```bash
# Vérifier les conteneurs
docker ps -a

# Démarrer les conteneurs
docker-compose up -d

# Vérifier le nom du conteneur
docker ps --format '{{.Names}}'
```

### Erreur de connexion

```bash
# Vérifier les credentials
cat .env | grep DB_

# Tester la connexion
docker exec -it maisonpardailhe-db mysql -u maisonpardailhe_user -p
```

### Script introuvable

```bash
# Vérifier que vous êtes dans le bon répertoire
pwd
# Doit être: .../maisonpardailhe/server

cd server
npm run db:backup:docker
```

## ✨ Fonctionnalités

- ✅ Backup automatique depuis l'hôte Docker
- ✅ Rotation automatique (garde les 30 derniers)
- ✅ Support Windows, Linux et Mac
- ✅ Restauration interactive avec confirmation
- ✅ Compatible avec planificateur de tâches/cron
- ✅ Logs détaillés et colorés
- ✅ Gestion des erreurs robuste
- ✅ Support multi-environnements (dev/prod)

---

**Version:** 1.0  
**Date:** 2025-11-12  
**Auteur:** GitHub Copilot
