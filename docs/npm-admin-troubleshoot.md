# Configuration Nginx Proxy Manager pour Admin

## Problème actuel
`admin.xn--maisonpardailh-okb.fr` → DNS_PROBE_POSSIBLE

## Diagnostic

1. **DNS OK** ✅
   - Enregistrement A `admin` existe dans Cloudflare
   - Pointe vers `217.182.169.217`

2. **NPM Configuration** ⚠️
   - Source: `admin.xn--maisonpardailh-okb.fr`
   - Destination: `maisonpardailhe-server:3001`
   - SSL: Let's Encrypt ✅

## Solution : Ajouter NPM au réseau Docker

### Étape 1 : Connecter NPM au réseau de l'application

```bash
# Trouver le nom du réseau de votre app
docker network ls | grep maisonpardailhe

# Connecter le conteneur NPM à ce réseau
docker network connect maisonpardailhe-network <npm-container-name>

# Exemple si NPM s'appelle nginx-proxy-manager
docker network connect maisonpardailhe-network nginx-proxy-manager
```

### Étape 2 : Configurer le Proxy Host dans NPM

**Onglet "Details"** :
- **Domain Names** : `admin.xn--maisonpardailh-okb.fr`
- **Scheme** : `http`
- **Forward Hostname/IP** : `maisonpardailhe-server` (nom du conteneur Docker)
- **Forward Port** : `3001`
- ✅ **Cache Assets**
- ✅ **Block Common Exploits**
- ✅ **Websockets Support**

**Onglet "SSL"** :
- **SSL Certificate** : Request a new SSL Certificate
- ✅ **Force SSL**
- ✅ **HTTP/2 Support**
- ✅ **HSTS Enabled**
- **Email** : maisonpardailhe.site@gmail.com

**Onglet "Advanced"** :
```nginx
# Service Worker et Manifest sans cache (important pour PWA)
location ~* (sw\.js|manifest\.json)$ {
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}

# Timeouts pour SSE
proxy_read_timeout 120s;
proxy_connect_timeout 120s;
proxy_buffering off;
```

### Étape 3 : Vérifier la variable d'environnement

Dans votre `.env` (ou Portainer) :
```env
PROD_ALLOWED_ORIGINS=https://xn--maisonpardailh-okb.fr,https://admin.xn--maisonpardailh-okb.fr,https://sse.xn--maisonpardailh-okb.fr
```

### Étape 4 : Redémarrer l'application

```bash
docker-compose restart app
# ou via Portainer : Containers → maisonpardailhe-server → Restart
```

## Vérification

1. **Réseau Docker** :
   ```bash
   docker inspect maisonpardailhe-server | grep -A 10 Networks
   docker inspect <npm-container> | grep -A 10 Networks
   ```
   Les deux doivent être sur le même réseau.

2. **Test connexion** :
   ```bash
   # Depuis le conteneur NPM
   docker exec <npm-container> ping maisonpardailhe-server
   docker exec <npm-container> curl http://maisonpardailhe-server:3001/api/menus
   ```

3. **Accès externe** :
   ```bash
   curl -I https://admin.xn--maisonpardailh-okb.fr
   ```

## Alternative : Utiliser l'IP Docker

Si la connexion par nom ne fonctionne pas :

1. **Trouver l'IP du conteneur** :
   ```bash
   docker inspect maisonpardailhe-server | grep IPAddress
   ```

2. **Dans NPM** :
   - Forward Hostname/IP : `172.x.x.x` (l'IP trouvée)
   - Forward Port : `3001`

## Cloudflare Proxy

⚠️ **Important** : Si le proxy Cloudflare est activé (orange cloud), cela peut causer des problèmes avec SSE.

**Pour admin** : Désactivez le proxy Cloudflare (mode DNS only - grey cloud)
- Cloudflare Dashboard → DNS → Edit `admin` → Toggle off proxy

**Architecture finale** :
```
admin.xn--maisonpardailh-okb.fr (DNS only)
    ↓
Nginx Proxy Manager (SSL + proxy)
    ↓
maisonpardailhe-server:3001 (Docker)
```

## Réseau Docker requis

Ajoutez NPM au même réseau que votre stack :

**Option 1 : Modifier docker-compose de NPM** :
```yaml
networks:
  default:
    external:
      name: maisonpardailhe-network
```

**Option 2 : Commande manuelle** :
```bash
docker network connect maisonpardailhe-network <npm-container-id>
```
