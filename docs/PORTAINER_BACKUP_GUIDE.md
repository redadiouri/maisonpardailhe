# 🚀 Configuration du Backup Automatique dans Portainer - Guide Complet

## 📋 Prérequis

- [ ] Portainer installé et accessible
- [ ] Stack `maisonpardailhe` déjà déployée
- [ ] Accès à l'interface web Portainer
- [ ] Fichier `deploy/docker-compose.backup.yml` disponible

## 🎯 Méthode 1: Mise à jour de la stack existante (RECOMMANDÉ)

### Étape 1: Se connecter à Portainer

1. Ouvrir votre navigateur
2. Aller sur `http://VOTRE_VPS:9000` (ou `https://portainer.votredomaine.fr`)
3. Se connecter avec vos identifiants

### Étape 2: Accéder à votre stack

1. Menu latéral → **Stacks**
2. Cliquer sur `maisonpardailhe`
3. Cliquer sur **Editor**

### Étape 3: Ajouter le service de backup

Dans l'éditeur, ajouter ce service **à la fin** de la section `services:` :

```yaml
  # Service de backup automatique
  backup:
    image: fradelg/mysql-cron-backup:latest
    container_name: maisonpardailhe-backup
    restart: unless-stopped
    environment:
      MYSQL_HOST: db
      MYSQL_PORT: 3306
      MYSQL_USER: ${DB_USER}
      MYSQL_PASS: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      CRON_TIME: "0 3 * * *"
      MAX_BACKUPS: 30
      INIT_BACKUP: 1
      TIMEOUT: 10m
      GZIP_LEVEL: 9
      TZ: Europe/Paris
    volumes:
      - ./backups:/backup
    depends_on:
      - db
    networks:
      - maisonpardailhe-network
```

### Étape 4: Vérifier la configuration

Assurez-vous que votre docker-compose.yml contient:

```yaml
version: '3.8'

services:
  app:
    # ... votre config app ...
  
  db:
    # ... votre config db ...
  
  backup:  # ← Nouveau service ajouté
    # ... config ci-dessus ...

networks:
  maisonpardailhe-network:
    driver: bridge

volumes:
  mysql_data:
  menu_images:
```

### Étape 5: Déployer la mise à jour

1. Cliquer sur **Update the stack** (en bas)
2. Cocher ✅ **Re-pull image and redeploy**
3. Cliquer sur **Update**
4. Attendre que Portainer redéploie la stack

### Étape 6: Vérifier le déploiement

1. Menu → **Containers**
2. Vérifier que `maisonpardailhe-backup` est en état **running** ✅
3. Cliquer sur le conteneur
4. Onglet **Logs** → Vous devriez voir:
   ```
   INFO: Starting backup...
   INFO: Backing up database maisonpardailhe...
   INFO: Backup completed successfully
   ```

## 🎯 Méthode 2: Nouvelle stack dédiée

### Étape 1: Créer une nouvelle stack

1. Menu → **Stacks**
2. Cliquer sur **+ Add stack**
3. **Name:** `maisonpardailhe-backup`
4. **Build method:** Web editor

### Étape 2: Coller la configuration

```yaml
version: '3.8'

services:
  mysql-backup:
    image: fradelg/mysql-cron-backup:latest
    container_name: maisonpardailhe-backup-service
    restart: unless-stopped
    environment:
      MYSQL_HOST: maisonpardailhe-db
      MYSQL_PORT: 3306
      MYSQL_USER: ${DB_USER}
      MYSQL_PASS: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      CRON_TIME: "0 3 * * *"
      MAX_BACKUPS: 30
      INIT_BACKUP: 1
      TIMEOUT: 10m
      GZIP_LEVEL: 9
      TZ: Europe/Paris
    volumes:
      - /opt/backups/maisonpardailhe:/backup
    networks:
      - maisonpardailhe_maisonpardailhe-network

networks:
  maisonpardailhe_maisonpardailhe-network:
    external: true
```

### Étape 3: Configurer les variables d'environnement

Dans la section **Environment variables**, ajouter:

```
DB_USER=maisonpardailhe_user
DB_PASSWORD=VOTRE_MOT_DE_PASSE
DB_NAME=maisonpardailhe
```

### Étape 4: Déployer

1. Cliquer sur **Deploy the stack**
2. Attendre le déploiement
3. Vérifier dans **Containers** que le service est actif

## 📊 Vérification et monitoring

### 1. Vérifier les logs en temps réel

**Via Portainer UI:**
1. **Containers** → `maisonpardailhe-backup`
2. **Logs** → Auto-refresh ON
3. Observer les messages de backup

**Via Console:**
1. **Containers** → `maisonpardailhe-backup` → **Console**
2. Se connecter
3. Exécuter:
   ```bash
   tail -f /var/log/cron.log
   ```

### 2. Lister les backups créés

**Via Console du conteneur:**
```bash
ls -lh /backup/
```

**Résultat attendu:**
```
-rw-r--r-- 1 root root 2.5M Nov 12 03:00 backup-maisonpardailhe-2025-11-12.sql.gz
-rw-r--r-- 1 root root 2.4M Nov 11 03:00 backup-maisonpardailhe-2025-11-11.sql.gz
...
```

### 3. Vérifier le cron

**Via Console:**
```bash
crontab -l
```

Doit afficher:
```
0 3 * * * /backup.sh
```

### 4. Forcer un backup manuel

**Via Console Portainer:**
```bash
/backup.sh
```

**Ou via CLI sur le serveur:**
```bash
docker exec maisonpardailhe-backup /backup.sh
```

## ⚙️ Configuration avancée

### Modifier la fréquence de backup

1. **Stacks** → `maisonpardailhe` → **Editor**
2. Modifier la ligne `CRON_TIME:`

**Exemples:**

```yaml
CRON_TIME: "0 3 * * *"      # Quotidien à 3h
CRON_TIME: "0 */6 * * *"    # Toutes les 6 heures
CRON_TIME: "0 2 * * 0"      # Chaque dimanche à 2h
CRON_TIME: "*/30 * * * *"   # Toutes les 30 minutes
```

3. **Update the stack**

### Modifier la rétention

```yaml
MAX_BACKUPS: 7    # 7 jours (dev)
MAX_BACKUPS: 30   # 30 jours (prod standard)
MAX_BACKUPS: 60   # 60 jours (prod haute disponibilité)
```

### Ajouter des notifications Slack

1. Créer un Webhook Slack: https://api.slack.com/messaging/webhooks
2. Dans l'éditeur, ajouter:

```yaml
environment:
  # ... autres variables ...
  WEBHOOK_URL: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
  WEBHOOK_ERROR_URL: https://hooks.slack.com/services/T00000000/B00000000/YYYYYYYYYYYYYYYYYYYY
```

3. **Update the stack**

## 🔄 Restauration d'un backup

### Via Console Portainer

1. **Containers** → `maisonpardailhe-db` → **Console**
2. Se connecter en tant que `root`
3. Exécuter:

```bash
# Lister les backups disponibles
ls -lh /backup/

# Décompresser le backup (si .gz)
gunzip /backup/backup-maisonpardailhe-2025-11-12.sql.gz

# Restaurer
mysql -u root -p$MYSQL_ROOT_PASSWORD maisonpardailhe < /backup/backup-maisonpardailhe-2025-11-12.sql
```

### Via SSH sur le serveur

```bash
# Arrêter l'application (optionnel mais recommandé)
docker-compose stop app

# Restaurer
docker exec -i maisonpardailhe-db mysql -u root -p$MYSQL_ROOT_PASSWORD maisonpardailhe < backups/backup-latest.sql.gz

# Redémarrer
docker-compose start app
```

## 📁 Accès aux fichiers de backup

### Via Portainer

1. **Volumes** → Rechercher le volume de backup
2. **Browse** → Voir les fichiers
3. **Download** → Télécharger un backup

### Via l'hôte (SSH)

```bash
# Aller dans le répertoire de backup
cd /opt/maisonpardailhe/backups  # ou ./backups selon config

# Lister
ls -lh

# Télécharger via SCP (depuis votre machine locale)
scp user@vps:/opt/maisonpardailhe/backups/backup-latest.sql.gz ./
```

## 🔐 Sécurisation

### Protéger les backups sur l'hôte

```bash
# SSH sur le serveur
chmod 700 /opt/maisonpardailhe/backups
chown -R root:root /opt/maisonpardailhe/backups
```

### Chiffrement des backups

Modifier le docker-compose pour ajouter un script de chiffrement:

```yaml
backup:
  # ... config existante ...
  environment:
    # ... variables existantes ...
    ENCRYPT_BACKUP: "true"
    ENCRYPT_PASSWORD: ${BACKUP_ENCRYPT_PASSWORD}
```

## 📋 Checklist de déploiement

- [ ] Service `backup` ajouté au docker-compose.yml
- [ ] Variables d'environnement configurées (DB_USER, DB_PASSWORD, DB_NAME)
- [ ] Stack mise à jour dans Portainer
- [ ] Conteneur `maisonpardailhe-backup` en état **running**
- [ ] Logs du backup visibles sans erreur
- [ ] Premier backup créé (visible dans `/backup/`)
- [ ] Cron configuré (visible avec `crontab -l`)
- [ ] Backup manuel testé avec succès
- [ ] Restauration testée sur environnement de dev
- [ ] Notifications configurées (optionnel)
- [ ] Synchronisation externe configurée (optionnel)

## 🆘 Dépannage

### Le conteneur ne démarre pas

**Vérifier les logs:**
```
Containers → maisonpardailhe-backup → Logs
```

**Erreurs communes:**
- Variables d'environnement manquantes
- Mot de passe MySQL incorrect
- Réseau non partagé avec le conteneur DB

### Les backups ne sont pas créés

**Vérifier:**
1. Permissions du volume `/backup`
2. Espace disque disponible
3. Connexion au conteneur MySQL

**Tester la connexion:**
```bash
docker exec maisonpardailhe-backup mysql -h db -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW DATABASES;"
```

### Erreur "Network not found"

Si vous utilisez une stack séparée:

```yaml
networks:
  maisonpardailhe_maisonpardailhe-network:
    external: true  # Important!
```

Le nom du réseau doit être: `<nom_stack>_<nom_network>`

## 📚 Ressources

- 📖 [Documentation complète](docs/portainer-backup.md)
- 📖 [Guide Docker Backup](docs/docker-backup.md)
- 🐳 [Image fradelg/mysql-cron-backup](https://hub.docker.com/r/fradelg/mysql-cron-backup)
- 📝 [Commandes de déploiement](deploy/cmd.txt)

---

**Version:** 1.0  
**Date:** 2025-11-12  
**Support:** Voir `docs/portainer-backup.md` pour plus de détails
