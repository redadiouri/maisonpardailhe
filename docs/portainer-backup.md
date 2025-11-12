# Backup Automatique via Portainer

## 🐳 Méthode 1: Service de backup dans docker-compose.yml

Ajoutez ce service à votre `docker-compose.yml` existant:

```yaml
version: '3.8'

services:
  # ... vos services existants (app, db) ...

  # Service de backup automatique
  db-backup:
    image: fradelg/mysql-cron-backup:latest
    container_name: maisonpardailhe-backup
    restart: unless-stopped
    environment:
      # Connexion MySQL
      MYSQL_HOST: db
      MYSQL_PORT: 3306
      MYSQL_USER: ${DB_USER}
      MYSQL_PASS: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      
      # Planification (cron format)
      # 0 3 * * * = Tous les jours à 3h du matin
      CRON_TIME: "0 3 * * *"
      
      # Rétention (jours)
      MAX_BACKUPS: 30
      
      # Options de backup
      INIT_BACKUP: 1
      TIMEOUT: 10m
      
      # Notification (optionnel)
      # WEBHOOK_URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
      # WEBHOOK_ERROR_URL: https://hooks.slack.com/services/YOUR/ERROR/WEBHOOK/URL
    
    volumes:
      # Stockage des backups sur l'hôte
      - ./backups:/backup
    
    depends_on:
      - db
    
    networks:
      - maisonpardailhe-network

networks:
  maisonpardailhe-network:
    driver: bridge

volumes:
  mysql_data:
```

### Configuration dans Portainer

1. **Aller dans Portainer** → Stacks → maisonpardailhe → Editor
2. **Ajouter le service `db-backup`** ci-dessus
3. **Vérifier les variables d'environnement** dans l'onglet "Environment variables"
4. **Update the stack**
5. **Re-pull and redeploy**

## 🐳 Méthode 2: Stack dédiée pour les backups

Créez une nouvelle stack dans Portainer nommée `maisonpardailhe-backup`:

```yaml
version: '3.8'

services:
  mysql-backup:
    image: fradelg/mysql-cron-backup:latest
    container_name: maisonpardailhe-backup-service
    restart: unless-stopped
    environment:
      MYSQL_HOST: maisonpardailhe-db  # Nom du conteneur MySQL
      MYSQL_PORT: 3306
      MYSQL_USER: maisonpardailhe_user
      MYSQL_PASS: ${DB_PASSWORD}
      MYSQL_DATABASE: maisonpardailhe
      
      # Backup quotidien à 3h du matin
      CRON_TIME: "0 3 * * *"
      
      # Garder 30 jours de backups
      MAX_BACKUPS: 30
      
      # Backup initial au démarrage
      INIT_BACKUP: 1
      
      # Timeout
      TIMEOUT: 10m
      
      # Compression gzip
      GZIP_LEVEL: 9
    
    volumes:
      - /path/on/host/backups:/backup
    
    # Se connecter au réseau de l'application
    networks:
      - maisonpardailhe_maisonpardailhe-network

networks:
  maisonpardailhe_maisonpardailhe-network:
    external: true
```

### Déploiement dans Portainer

1. **Stacks** → **Add stack**
2. **Name:** `maisonpardailhe-backup`
3. **Build method:** Web editor
4. Coller le YAML ci-dessus
5. **Environment variables:**
   - `DB_PASSWORD`: votre_mot_de_passe
6. **Deploy the stack**

## 🐳 Méthode 3: Container personnalisé avec notre script

Créez un `Dockerfile` pour un conteneur de backup personnalisé:

```dockerfile
# server/Dockerfile.backup
FROM alpine:latest

# Installer mysql-client et cron
RUN apk add --no-cache \
    mysql-client \
    bash \
    dcron \
    tzdata

# Copier le script de backup
COPY scripts/db_backup_docker.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Configuration du cron
RUN echo "0 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Créer le répertoire de backup
RUN mkdir -p /backup

# Définir le timezone (optionnel)
ENV TZ=Europe/Paris

# Script de démarrage
COPY scripts/backup-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

Créez le script d'entrée:

```bash
# server/scripts/backup-entrypoint.sh
#!/bin/bash

# Démarrer cron en arrière-plan
crond -f &

# Faire un backup initial
/usr/local/bin/backup.sh

# Garder le conteneur actif
tail -f /var/log/backup.log
```

Ajoutez à `docker-compose.yml`:

```yaml
services:
  backup-service:
    build:
      context: ./server
      dockerfile: Dockerfile.backup
    container_name: maisonpardailhe-backup-custom
    restart: unless-stopped
    environment:
      DB_CONTAINER_NAME: maisonpardailhe-db
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      MAX_BACKUPS: 30
    volumes:
      - ./backups:/backup
      - /var/run/docker.sock:/var/run/docker.sock  # Pour exécuter docker commands
    depends_on:
      - db
    networks:
      - maisonpardailhe-network
```

## 📅 Planifications recommandées

### Production (haute disponibilité)
```yaml
# Backup toutes les 6 heures + rétention 7 jours
CRON_TIME: "0 */6 * * *"
MAX_BACKUPS: 28  # 7 jours × 4 backups/jour
```

### Production standard
```yaml
# Backup quotidien à 3h + rétention 30 jours
CRON_TIME: "0 3 * * *"
MAX_BACKUPS: 30
```

### Développement
```yaml
# Backup quotidien + rétention 7 jours
CRON_TIME: "0 2 * * *"
MAX_BACKUPS: 7
```

## 🔔 Notifications (optionnel)

### Slack Webhook

```yaml
environment:
  # URL pour les succès (optionnel)
  WEBHOOK_URL: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
  
  # URL pour les erreurs (optionnel)
  WEBHOOK_ERROR_URL: https://hooks.slack.com/services/T00000000/B00000000/YYYYYYYYYYYYYYYYYYYY
```

### Email via SMTP

Pour le conteneur personnalisé, ajoutez:

```bash
# Dans backup-entrypoint.sh
if [ -n "$SMTP_HOST" ]; then
    # Installer mailx
    apk add --no-cache mailx
    
    # Configurer SMTP
    echo "set smtp=smtp://$SMTP_HOST:$SMTP_PORT" > ~/.mailrc
    echo "set smtp-auth=login" >> ~/.mailrc
    echo "set smtp-auth-user=$SMTP_USER" >> ~/.mailrc
    echo "set smtp-auth-password=$SMTP_PASSWORD" >> ~/.mailrc
fi
```

## 📊 Monitoring dans Portainer

### Vérifier le statut du backup

1. **Containers** → `maisonpardailhe-backup`
2. **Logs** → Voir les logs de backup
3. **Stats** → Vérifier l'utilisation des ressources

### Logs en temps réel

```bash
# Depuis Portainer → Container → Logs
# Ou via CLI:
docker logs -f maisonpardailhe-backup-service
```

### Vérifier les backups

1. **Volumes** → Parcourir le volume de backup
2. Ou **Console** → Exécuter:
   ```bash
   ls -lh /backup/
   ```

## 🔄 Restauration via Portainer

### Méthode 1: Console du conteneur

1. **Containers** → `maisonpardailhe-db` → **Console**
2. Se connecter en tant que `root`
3. Exécuter:
   ```bash
   cd /backup
   ls -lh  # Lister les backups
   mysql -u root -p$MYSQL_ROOT_PASSWORD maisonpardailhe < backup-maisonpardailhe-2025-11-12.sql
   ```

### Méthode 2: Depuis l'hôte

1. **Exec** dans Portainer → `maisonpardailhe-db`
2. Ou via SSH sur le serveur:
   ```bash
   docker exec -i maisonpardailhe-db mysql -u root -p$MYSQL_ROOT_PASSWORD maisonpardailhe < backups/backup-latest.sql
   ```

## 🎯 Configuration recommandée pour Portainer

### docker-compose.yml complet optimisé

```yaml
version: '3.8'

services:
  # Application Node.js
  app:
    image: mehdimp4/maisonpardailhe-server:latest
    container_name: maisonpardailhe-server
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DB_HOST: db
      DB_PORT: 3306
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      SESSION_SECRET: ${SESSION_SECRET}
    ports:
      - "3001:3001"
    volumes:
      - menu_images:/app/maisonpardailhe/img/menus
    depends_on:
      - db
    networks:
      - maisonpardailhe-network

  # Base de données MySQL
  db:
    image: mysql:8.0
    container_name: maisonpardailhe-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
      TZ: Europe/Paris
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    networks:
      - maisonpardailhe-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_ROOT_PASSWORD}"]
      interval: 30s
      timeout: 10s
      retries: 5

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
      db:
        condition: service_healthy
    networks:
      - maisonpardailhe-network

networks:
  maisonpardailhe-network:
    driver: bridge

volumes:
  mysql_data:
    driver: local
  menu_images:
    driver: local
```

### Variables d'environnement dans Portainer

Dans **Stacks** → **maisonpardailhe** → **Environment variables**:

```env
DB_NAME=maisonpardailhe
DB_USER=maisonpardailhe_user
DB_PASSWORD=VOTRE_MOT_DE_PASSE_SECURISE
DB_ROOT_PASSWORD=VOTRE_ROOT_PASSWORD_SECURISE
SESSION_SECRET=VOTRE_SESSION_SECRET_64_CHARS
```

## 🔐 Sécurité des backups

### Protéger l'accès aux backups

Dans Portainer, configurez les permissions du volume:

```yaml
volumes:
  - type: bind
    source: /root/maisonpardailhe/backups
    target: /backup
    read_only: false
    bind:
      propagation: rprivate
```

Sur l'hôte:
```bash
chmod 700 /root/maisonpardailhe/backups
chown -R root:root /root/maisonpardailhe/backups
```

## 📋 Checklist de déploiement Portainer

- [ ] Ajouter le service `backup` dans docker-compose.yml
- [ ] Configurer les variables d'environnement
- [ ] Définir le chemin de stockage des backups sur l'hôte
- [ ] Vérifier que le réseau est partagé entre les services
- [ ] Déployer la stack mise à jour
- [ ] Vérifier les logs du conteneur de backup
- [ ] Tester un backup manuel: `docker exec maisonpardailhe-backup /backup.sh`
- [ ] Configurer les notifications (optionnel)
- [ ] Tester une restauration sur un environnement de test

## 🆘 Dépannage

### Le backup ne s'exécute pas

```bash
# Vérifier les logs
docker logs maisonpardailhe-backup

# Vérifier le cron
docker exec maisonpardailhe-backup crontab -l

# Forcer un backup manuel
docker exec maisonpardailhe-backup /backup.sh
```

### Erreur de connexion MySQL

```bash
# Tester la connexion depuis le conteneur de backup
docker exec -it maisonpardailhe-backup mysql -h db -u maisonpardailhe_user -p
```

### Les backups ne sont pas créés

```bash
# Vérifier les permissions du volume
docker exec maisonpardailhe-backup ls -la /backup

# Vérifier l'espace disque
docker exec maisonpardailhe-backup df -h /backup
```

---

**Recommandation:** Utilisez la **Méthode 1** avec le service `db-backup` intégré dans votre stack principale. C'est la solution la plus simple et la plus maintenable dans Portainer.

**Date:** 2025-11-12
