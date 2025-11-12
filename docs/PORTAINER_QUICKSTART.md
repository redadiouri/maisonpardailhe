# ⚡ Quick Start: Backup Automatique Portainer

## 🎯 En 3 étapes

### 1️⃣ Ajouter le service de backup

Dans Portainer → Stacks → maisonpardailhe → Editor, ajouter:

```yaml
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
    volumes:
      - ./backups:/backup
    depends_on:
      - db
    networks:
      - maisonpardailhe-network
```

### 2️⃣ Déployer

1. Update the stack
2. ✅ Re-pull image and redeploy
3. Update

### 3️⃣ Vérifier

```bash
docker logs maisonpardailhe-backup
docker exec maisonpardailhe-backup ls -lh /backup
```

## ✅ C'est fait!

- ✅ Backup quotidien à 3h du matin
- ✅ Garde 30 derniers backups
- ✅ Backup initial au démarrage
- ✅ Compression GZIP

## 📚 Documentation complète

- 📖 [Guide pas-à-pas](PORTAINER_BACKUP_GUIDE.md)
- 📖 [Configuration avancée](portainer-backup.md)
- 🐳 [docker-compose.backup.yml](../deploy/docker-compose.backup.yml)
