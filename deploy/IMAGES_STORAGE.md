# Gestion des images de menus

## 📁 Stockage des images

Les images uploadées via l'interface admin sont stockées dans `/app/maisonpardailhe/img/menus/` dans le conteneur Docker.

## 💾 Volume persistant Docker

Pour que les images **persistent après un redémarrage** du conteneur, un volume Docker nommé `menu_images` est configuré.

### Configuration dans docker-compose.yml

```yaml
services:
  maisonpardailhe:
    volumes:
      - menu_images:/app/maisonpardailhe/img/menus

volumes:
  menu_images:
```

## 🔄 Mise à jour du conteneur dans Portainer

### Étapes pour mettre à jour SANS perdre les images

1. **Aller dans Portainer** → Stacks → `maisonpardailhe`
2. **Cliquer sur "Editor"**
3. **Vérifier que les volumes sont bien configurés** (voir ci-dessus)
4. **Cliquer sur "Update the stack"**
5. **Cocher "Re-pull image and redeploy"**
6. **Cliquer sur "Update"**

✅ Les images dans le volume `menu_images` seront **préservées**

### Si vous utilisez docker-compose en SSH

```bash
cd /path/to/docker-compose
docker-compose pull
docker-compose up -d
```

## 🗂️ Backup des images

### Créer un backup du volume

```bash
# Créer un backup
docker run --rm -v menu_images:/data -v $(pwd):/backup alpine tar czf /backup/menu_images_backup.tar.gz -C /data .

# Restaurer un backup
docker run --rm -v menu_images:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/menu_images_backup.tar.gz"
```

## 📊 Vérifier les images

### Lister les fichiers dans le volume

```bash
docker exec maisonpardailhe ls -lh /app/maisonpardailhe/img/menus/
```

### Vérifier la taille du volume

```bash
docker volume inspect menu_images
```

## ⚠️ Important

- **NE PAS** supprimer le volume `menu_images` sauf si vous voulez effacer toutes les images
- Les images sont accessibles via `/img/menus/menu-{timestamp}-{random}.{ext}`
- Format accepté : JPG, PNG, WebP (max 5MB)
- Les anciennes images sont automatiquement supprimées lors du remplacement
