# Instructions de déploiement pour la correction SSE

## Étapes à suivre sur votre VPS (SSH)

1. **Rebuild l'image Docker localement** (depuis votre machine Windows) :
   ```powershell
   cd C:\Users\mehdi\Documents\GitHub\maisonpardailhe
   pwsh ./deploy/build-and-push.ps1 -Username mehdimp4 -Repo maisonpardailhe-server -Tag latest -ContextPath server
   ```

2. **Connectez-vous au VPS via SSH** :
   ```bash
   ssh root@217.182.169.217
   ```

3. **Accédez au dossier deploy et mettez à jour le conteneur** :
   ```bash
   cd /path/to/maisonpardailhe/deploy
   docker-compose pull
   docker-compose up -d --force-recreate
   ```

   Ou via **Portainer** :
   - Allez dans **Stacks** → Votre stack maisonpardailhe
   - Cliquez sur **Pull and redeploy**
   - Ou manuellement : **Containers** → Sélectionnez `maisonpardailhe` → **Recreate**

4. **Vérifiez les logs** :
   ```bash
   docker logs -f maisonpardailhe
   ```

## Ce qui a été corrigé

- ✅ Configuration des cookies avec `domain: '.xn--maisonpardailh-okb.fr'` pour partager les sessions entre sous-domaines
- ✅ Le sous-domaine `sse.xn--maisonpardailh-okb.fr` est configuré en DNS-only dans Cloudflare (contourne le timeout)
- ✅ Le frontend utilise `https://sse.xn--maisonpardailh-okb.fr/api/admin/commandes/stream`

## Vérification

Après le redéploiement :
1. Videz le cache du navigateur (Ctrl+Shift+Del)
2. Reconnectez-vous au panel admin
3. Les connexions SSE devraient fonctionner sans erreur 401 ni 504
