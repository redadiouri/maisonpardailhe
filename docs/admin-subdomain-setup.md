# Configuration du sous-domaine Admin

Ce guide explique comment configurer l'interface admin sur `https://admin.xn--maisonpardailh-okb.fr`.

## 1. Configuration DNS

Ajoutez un enregistrement A dans votre DNS :

```
Type: A
Nom: admin
Domaine: xn--maisonpardailh-okb.fr
Valeur: [IP de votre serveur]
TTL: 3600
```

**Vérification** : `nslookup admin.xn--maisonpardailh-okb.fr`

## 2. Certificat SSL

Générez un certificat Let's Encrypt pour le sous-domaine :

```bash
sudo certbot certonly --nginx -d admin.xn--maisonpardailh-okb.fr
```

Le certificat sera créé dans `/etc/letsencrypt/live/admin.xn--maisonpardailh-okb.fr/`

## 3. Configuration Nginx

Copiez le fichier de configuration :

```bash
sudo cp deploy/nginx-admin-subdomain.conf /etc/nginx/sites-available/admin.maisonpardailhe.conf
sudo ln -s /etc/nginx/sites-available/admin.maisonpardailhe.conf /etc/nginx/sites-enabled/
```

**Testez la configuration** :

```bash
sudo nginx -t
```

**Rechargez Nginx** :

```bash
sudo systemctl reload nginx
```

## 4. Variables d'environnement

Dans votre fichier `.env` en production, ajoutez :

```env
# Domaine principal pour les cookies cross-subdomain
APP_HOST=xn--maisonpardailh-okb.fr

# Origines CORS autorisées
PROD_ALLOWED_ORIGINS=https://xn--maisonpardailh-okb.fr,https://admin.xn--maisonpardailh-okb.fr,https://sse.xn--maisonpardailh-okb.fr
```

**Important** : Ces variables permettent :
- Les cookies de session fonctionnent sur les deux domaines (principal + admin)
- Les requêtes CORS depuis le sous-domaine admin sont autorisées

## 5. Redémarrage du serveur Node.js

Après avoir mis à jour le `.env` :

```bash
# Si vous utilisez PM2
pm2 restart maisonpardailhe

# Si vous utilisez Docker
docker-compose restart app
```

## 6. Test PWA

Accédez à `https://admin.xn--maisonpardailh-okb.fr` :

1. **Sur Chrome mobile** : Le bouton "Ajouter à l'écran d'accueil" devrait apparaître
2. **DevTools** : Application → Manifest → Vérifiez que le manifest est chargé
3. **Service Worker** : Application → Service Workers → Vérifiez qu'il est activé
4. **Test offline** : Mettez en mode avion, l'admin doit rester accessible

## 7. Structure des fichiers

```
/var/www/maisonpardailhe/
├── admin/                      # Interface admin (sous-domaine)
│   ├── dashboard.html
│   ├── login.html
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── css/
│   └── js/
├── index.html                 # Site principal
├── menu.html
├── favicon-*.png
└── img/
```

## 8. Vérifications

**Sessions cross-subdomain** :

1. Connectez-vous sur `https://admin.xn--maisonpardailh-okb.fr`
2. Vérifiez le cookie `mp.sid` avec domain=`.xn--maisonpardailh-okb.fr`
3. La session doit être valide sur les deux domaines

**CORS** :

```bash
curl -H "Origin: https://admin.xn--maisonpardailh-okb.fr" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://xn--maisonpardailh-okb.fr/api/admin/commandes
```

Devrait retourner `Access-Control-Allow-Origin: https://admin.xn--maisonpardailh-okb.fr`

**PWA** :

```bash
curl -I https://admin.xn--maisonpardailh-okb.fr/manifest.json
curl -I https://admin.xn--maisonpardailh-okb.fr/sw.js
```

Vérifiez `Content-Type: application/manifest+json` et `Cache-Control: no-store`

## 9. Logs

Surveillez les logs Nginx :

```bash
tail -f /var/log/nginx/admin.maisonpardailhe_access.log
tail -f /var/log/nginx/admin.maisonpardailhe_error.log
```

Logs Node.js :

```bash
# PM2
pm2 logs maisonpardailhe

# Docker
docker-compose logs -f app
```

## 10. Troubleshooting

**Problème : Cookie non partagé entre domaines**
- Vérifiez `APP_HOST=xn--maisonpardailh-okb.fr` dans `.env`
- Le cookie domain doit commencer par un point : `.xn--maisonpardailh-okb.fr`

**Problème : CORS bloqué**
- Vérifiez `PROD_ALLOWED_ORIGINS` contient le sous-domaine admin
- Vérifiez les logs Node.js pour voir l'origine rejetée

**Problème : PWA non installable**
- Vérifiez HTTPS actif sur le sous-domaine
- Vérifiez le manifest.json accessible
- Vérifiez le service worker enregistré dans DevTools

**Problème : Service worker ne se met pas à jour**
- Changez `CACHE_VERSION` dans `sw.js`
- Ouvrez DevTools → Application → Service Workers → Update

## Architecture finale

```
Site public        : https://xn--maisonpardailh-okb.fr
Admin (PWA)        : https://admin.xn--maisonpardailh-okb.fr
SSE (notifications): https://sse.xn--maisonpardailh-okb.fr
API Backend        : localhost:3001 (non exposé)
```

Tous les domaines partagent la même session grâce au cookie domain `.xn--maisonpardailh-okb.fr`.
