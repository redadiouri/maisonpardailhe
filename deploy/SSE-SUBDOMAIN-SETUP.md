# Configuration du sous-domaine SSE (Server-Sent Events)

## Problème actuel
Cloudflare gratuit timeout les connexions SSE après **100 secondes**, même avec heartbeat.
Erreur : `504 Gateway Timeout` et `ERR_NETWORK_IO_SUSPENDED`

## Solution : Sous-domaine sans proxy Cloudflare

### Étape 1 : Cloudflare DNS

1. Aller sur https://dash.cloudflare.com
2. Sélectionner ton domaine `xn--maisonpardailh-okb.fr`
3. Menu **DNS** → **Records** → **Add record**
4. Configurer :
   - **Type** : `A`
   - **Name** : `sse` (créera `sse.xn--maisonpardailh-okb.fr`)
   - **IPv4 address** : `217.182.169.217` (IP de ton VPS)
   - **Proxy status** : ⚠️ **GRIS** (DNS only) - TRÈS IMPORTANT !
   - **TTL** : Auto
5. **Save**

### Étape 2 : Nginx Proxy Manager

1. Aller sur http://217.182.169.217/
2. **Proxy Hosts** → **Add Proxy Host**
3. Onglet **Details** :
   - **Domain Names** : `sse.xn--maisonpardailh-okb.fr`
   - **Scheme** : `http`
   - **Forward Hostname / IP** : `maisonpardailhe` (nom du container Docker)
   - **Forward Port** : `3001`
   - ✅ **Block Common Exploits**
   - ✅ **Websockets Support**
4. Onglet **SSL** :
   - **SSL Certificate** : Request a new SSL Certificate
   - ✅ **Force SSL**
   - ✅ **HTTP/2 Support**
   - Email : ton@email.com
   - ✅ **I Agree to the Let's Encrypt Terms of Service**
5. Onglet **Advanced** - Ajouter :

```nginx
# Configuration optimisée pour SSE
proxy_buffering off;
proxy_cache off;
proxy_set_header Connection '';
proxy_http_version 1.1;
chunked_transfer_encoding off;

# Timeouts très longs pour SSE
proxy_connect_timeout 1d;
proxy_send_timeout 1d;
proxy_read_timeout 1d;
```

6. **Save**

### Étape 3 : Activer dans le code

1. Aller dans `maisonpardailhe/admin/dashboard.html`
2. Décommenter ces lignes (enlever `<!--` et `-->`) :

```html
<script>
  window.SSE_ENDPOINT = 'https://sse.xn--maisonpardailh-okb.fr/api/admin/commandes/stream';
</script>
```

3. Rebuild et redeploy :
```bash
pwsh ./deploy/build-and-push.ps1 -Username mehdimp4 -Repo maisonpardailhe-server -Tag latest -ContextPath server
```

4. Portainer → Re-pull image and redeploy

### Étape 4 : Test

1. Ouvrir https://xn--maisonpardailh-okb.fr/admin/dashboard
2. Ouvrir la console (F12)
3. Vérifier :
   - ✅ Connexion SSE à `https://sse.xn--maisonpardailh-okb.fr/api/admin/commandes/stream`
   - ✅ Pas d'erreur 504
   - ✅ Heartbeat toutes les 10 secondes : `{"type":"ping","ts":...}`

## Alternative temporaire (déjà en place)

En attendant de configurer le sous-domaine :
- ✅ Heartbeat réduit à 10 secondes (au lieu de 15)
- ✅ Heartbeat envoie des données pour forcer Cloudflare à garder la connexion
- ✅ Reconnexion automatique infinie avec exponential backoff
- ⚠️ Timeout toujours à ~100s mais reconnexion immédiate

## Notes

- Le sous-domaine SSE **doit être en DNS only** (nuage gris) dans Cloudflare
- Ne JAMAIS activer le proxy Cloudflare (nuage orange) sur le sous-domaine SSE
- Les timeouts Nginx sont configurés à 1 jour (1d) pour supporter les connexions longues
- Le heartbeat continue à 10s même avec le sous-domaine (pour éviter les timeouts Nginx/Browser)
