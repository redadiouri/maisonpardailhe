# 🚀 Guide de Déploiement - Maison Pardailhé

## 📦 Étape 1 : Build et Push de l'image Docker

Depuis votre machine locale (Windows) :

```powershell
# Construire et pousser l'image
.\deploy\build-and-push.ps1 -Username mehdimp4 -Repo maisonpardailhe-server -Tag v1.0.1 -ContextPath server

# Ou avec une version spécifique
.\deploy\build-and-push.ps1 -Username mehdimp4 -Repo maisonpardailhe-server -Tag v1.0.2 -ContextPath server
```

## 🐳 Étape 2 : Déploiement sur Portainer

### A. Variables d'environnement à configurer

Dans Portainer → Stacks → Créer ou modifier le stack :

```env
# Docker
DOCKER_IMAGE=mehdimp4/maisonpardailhe-server:v1.0.1

# Serveur
PORT=3001
NODE_ENV=production
APP_URL=https://serv-test.smp4.xyz

# Base de données
DB_HOST=adresse-de-votre-db
DB_PORT=3306
DB_USER=votre-user
DB_PASSWORD=votre-password
DB_NAME=maisonpardailhe

# Sécurité
SESSION_SECRET=changez-moi-en-production-avec-une-longue-chaine-aleatoire

# CORS - IMPORTANT !
PROD_ALLOWED_ORIGINS=https://serv-test.smp4.xyz,https://azeur-mdp-web.smp4.xyz

# Timezone
TIMEZONE=Europe/Paris

# Email (optionnel)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=votre@email.com
# SMTP_PASS=votre-password
# SMTP_FROM=noreply@maisonpardailhe.fr
```

### B. Déployer le stack

1. Coller le contenu de `deploy/docker-compose.yml`
2. Renseigner toutes les variables ci-dessus
3. Cliquer sur "Deploy the stack"

## 🌐 Étape 3 : Configuration Nginx Proxy Manager

### A. Créer le Proxy Host

1. Dans Nginx Proxy Manager → Proxy Hosts → Add Proxy Host
2. **Details** tab :
   - Domain Names: `serv-test.smp4.xyz`
   - Scheme: `http`
   - Forward Hostname / IP: `192.168.1.77` (IP du container)
   - Forward Port: `3001`
   - ✅ Cache Assets
   - ✅ Block Common Exploits
   - ✅ Websockets Support

3. **SSL** tab :
   - ✅ Force SSL
   - ✅ HTTP/2 Support
   - ✅ HSTS Enabled
   - SSL Certificate: Request a new SSL Certificate (Let's Encrypt)
   - ✅ Agree to Let's Encrypt Terms

4. **Advanced** tab :
   - Coller le contenu de `deploy/nginx-sse-config.txt` (voir ci-dessous)

### B. Configuration Nginx avancée

```nginx
# Headers communs pour toutes les requêtes
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;

# 1. Configuration spécifique pour SSE (Server-Sent Events)
location ~ ^/api/admin/commandes/stream {
    proxy_pass http://192.168.1.77:3001;
    
    # CRITIQUE pour SSE : désactiver tout buffering
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    
    # Timeouts très longs pour SSE
    proxy_connect_timeout 1d;
    proxy_send_timeout 1d;
    proxy_read_timeout 1d;
    
    # Headers SSE
    add_header X-Accel-Buffering no;
    add_header Cache-Control no-cache;
}

# 2. Routes API (toutes les requêtes /api/*)
location /api/ {
    proxy_pass http://192.168.1.77:3001;
    
    # Timeouts standards pour API
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # Headers pour les API
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# 3. Routes unsubscribe
location /unsubscribe {
    proxy_pass http://192.168.1.77:3001;
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}

# 4. Fichiers statiques avec cache agressif
# Images, fonts, et autres assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|webp)$ {
    proxy_pass http://192.168.1.77:3001;
    
    # Cache pour 7 jours
    proxy_cache_valid 200 7d;
    add_header Cache-Control "public, max-age=604800, immutable";
}

# 5. Pages HTML et routes propres
# Toutes les autres requêtes (pages HTML, routes clean URLs)
location / {
    proxy_pass http://192.168.1.77:3001;
    
    # Pas de cache pour les HTML
    add_header Cache-Control "no-cache";
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

## ✅ Étape 4 : Vérification

### A. Tester le déploiement

```powershell
# Tester la page d'accueil
curl https://serv-test.smp4.xyz

# Tester les fichiers JS
curl https://serv-test.smp4.xyz/js/menus.js -I

# Tester l'API
curl https://serv-test.smp4.xyz/api/menus
```

### B. Vérifier les logs

Dans Portainer → Containers → maisonpardailhe → Logs :

```
[INFO] MaisonPardailhe - server startup
[INFO] Environment: production
[INFO] Port: 3001
[INFO] Database check: OK
[INFO] Server running on port 3001
```

### C. Tester dans le navigateur

1. Ouvrir https://serv-test.smp4.xyz
2. Ouvrir DevTools (F12) → Onglet Console
3. **Vider le cache** : Ctrl+Shift+Delete → Vider le cache
4. **Recharger** : Ctrl+F5 (actualisation forcée)
5. Vérifier qu'il n'y a **aucune erreur 404**

## 🔧 Dépannage

### Problème : Erreurs 404 pour les fichiers JS/CSS

**Cause** : Configuration Nginx incomplète
**Solution** : Vérifier que la configuration nginx-sse-config.txt est bien appliquée dans Nginx Proxy Manager

### Problème : CORS errors

**Cause** : PROD_ALLOWED_ORIGINS mal configuré
**Solution** : Ajouter votre domaine dans PROD_ALLOWED_ORIGINS :
```env
PROD_ALLOWED_ORIGINS=https://serv-test.smp4.xyz
```

### Problème : SSE notifications ne marchent pas

**Cause** : Proxy buffering activé
**Solution** : Vérifier la section `location ~ ^/api/admin/commandes/stream` dans nginx

### Problème : Database connection failed

**Cause** : Variables DB incorrectes ou DB inaccessible
**Solution** : Vérifier DB_HOST, DB_USER, DB_PASSWORD dans Portainer

## 📊 Monitoring

### Logs en temps réel

```bash
# Dans Portainer
Containers → maisonpardailhe → Logs → Auto-refresh ON
```

### Statistiques

```bash
# Accéder au dashboard admin
https://serv-test.smp4.xyz/admin/login
```

## 🔄 Mise à jour

Pour déployer une nouvelle version :

1. **Build nouvelle image** :
   ```powershell
   .\deploy\build-and-push.ps1 -Username mehdimp4 -Repo maisonpardailhe-server -Tag v1.0.2 -ContextPath server
   ```

2. **Update dans Portainer** :
   - Stacks → maisonpardailhe → Editor
   - Modifier `DOCKER_IMAGE=mehdimp4/maisonpardailhe-server:v1.0.2`
   - Cliquer "Update the stack"
   - ✅ Pull latest image version
   - ✅ Re-deploy

3. **Vérifier** :
   - Logs : vérifier "Server running on port 3001"
   - Browser : Ctrl+F5 pour recharger

## 📝 Checklist de déploiement

- [ ] Build et push image Docker
- [ ] Variables d'environnement configurées dans Portainer
- [ ] Stack déployé avec succès
- [ ] Nginx Proxy Host créé
- [ ] Configuration nginx avancée appliquée
- [ ] SSL activé avec Let's Encrypt
- [ ] Tests : page d'accueil, API, fichiers statiques
- [ ] Logs serveur : "Database check: OK"
- [ ] Navigateur : aucune erreur 404
- [ ] Admin dashboard accessible

## 🎯 Résumé des URLs

| URL | Description |
|-----|-------------|
| https://serv-test.smp4.xyz | Site public |
| https://serv-test.smp4.xyz/menu | Page menu |
| https://serv-test.smp4.xyz/admin/login | Login admin |
| https://serv-test.smp4.xyz/admin/dashboard | Dashboard admin |
| https://serv-test.smp4.xyz/api/menus | API menus (JSON) |
| https://serv-test.smp4.xyz/api/schedules | API horaires (JSON) |

---

**✅ Déploiement réussi si :**
- Aucune erreur 404 dans la console du navigateur
- API retourne du JSON valide
- Dashboard admin accessible et fonctionnel
- SSE notifications fonctionnent en temps réel
