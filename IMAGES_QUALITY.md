# Guide Qualité des Images

## Problème Résolu : Images Pixelisées

### Modifications CSS
Les images des menus sont maintenant optimisées pour un rendu de meilleure qualité :
- `image-rendering: -webkit-optimize-contrast` pour WebKit/Chrome
- `image-rendering: crisp-edges` pour Firefox
- `object-position: center` pour un meilleur cadrage

### Optimisation Automatique lors de l'Upload
Les images uploadées via le panel admin sont maintenant **automatiquement optimisées** avec Sharp :
- Redimensionnement max : 1200px de largeur
- Qualité JPEG : 90% (mozjpeg)
- Conservation du ratio d'aspect
- Pas d'agrandissement si l'image est plus petite

### Pour les Images Existantes
Si vous avez des images déjà uploadées qui sont pixelisées :

1. **Option 1 : Ré-uploader via le panel admin**
   - Connectez-vous au panel admin
   - Supprimez l'ancienne image
   - Uploadez une nouvelle image (elle sera optimisée automatiquement)

2. **Option 2 : Optimiser toutes les images manuellement**
   ```powershell
   cd server
   npm run optimize:images
   ```
   Ce script optimisera toutes les images dans `maisonpardailhe/img/`

### Recommandations
- **Taille minimale recommandée** : 1200px de largeur
- **Format** : JPEG, PNG ou WebP
- **Poids max** : 5MB (limité par le serveur)
- Les images trop petites ne seront pas agrandies (qualité préservée)

### Fichiers Modifiés
- `server/routes/admin_menus.js` - Optimisation Sharp automatique
- `maisonpardailhe/css/style.css` - Amélioration du rendu CSS
  - `.menu-card__image img`
  - `.selection-item__image img`
