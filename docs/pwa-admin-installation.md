# Guide : Installer l'interface Admin comme une App Android

L'interface d'administration est maintenant une **Progressive Web App (PWA)** installable sur Android comme une vraie application.

## ✅ Configuration effectuée

1. ✅ Manifest PWA créé (`/admin/manifest.json`)
2. ✅ Service Worker pour le mode hors ligne (`/admin/sw.js`)
3. ✅ Meta tags pour iOS et Android
4. ✅ Icônes et thème adaptés

## 📱 Installation sur Android

### Méthode 1 : Chrome Android (Recommandé)

1. **Ouvrir le site admin** dans Chrome sur Android :
   ```
   https://maisonpardailhe.fr/admin/
   ```

2. **Attendre le popup d'installation**
   - Chrome affichera automatiquement une bannière "Ajouter à l'écran d'accueil"
   - OU appuyez sur le menu ⋮ (3 points) → "Installer l'application"

3. **Confirmer l'installation**
   - Appuyez sur "Installer"
   - L'icône apparaîtra sur l'écran d'accueil

4. **Lancer l'app**
   - Tap sur l'icône depuis l'écran d'accueil
   - L'app s'ouvre en plein écran sans la barre d'adresse

### Méthode 2 : Depuis le menu Chrome

1. Ouvrir `https://maisonpardailhe.fr/admin/` dans Chrome
2. Menu ⋮ (3 points en haut à droite)
3. Sélectionner **"Ajouter à l'écran d'accueil"**
4. Personnaliser le nom si besoin
5. Appuyer sur **"Ajouter"**

## 📱 Installation sur iOS (iPhone/iPad)

1. Ouvrir `https://maisonpardailhe.fr/admin/` dans **Safari**
2. Appuyer sur l'icône de partage 📤 (en bas)
3. Faire défiler et appuyer sur **"Sur l'écran d'accueil"**
4. Appuyer sur **"Ajouter"**

## 🎯 Fonctionnalités de l'App

### Mode Hors Ligne
- ✅ Interface accessible même sans connexion
- ✅ Pages en cache (login, dashboard, CSS, JS)
- ⚠️ Les données API nécessitent une connexion

### Avantages
- ✅ Icône sur l'écran d'accueil
- ✅ Lancement rapide
- ✅ Plein écran (pas de barre d'adresse)
- ✅ Notifications push (à venir)
- ✅ Expérience native

### Fonctionnalités en ligne
- ✅ Notifications temps réel (SSE)
- ✅ Gestion des commandes
- ✅ Gestion du stock
- ✅ Toutes les fonctionnalités admin

## 🔧 Vérification de l'installation

### Sur Android
1. Aller dans **Paramètres** → **Applications**
2. Chercher "Admin MP" ou "Maison Pardailhé"
3. L'app devrait apparaître comme une app normale

### Tester l'installation
1. Ouvrir `https://maisonpardailhe.fr/admin/` dans Chrome
2. Ouvrir les **DevTools** (F12)
3. Onglet **Application** → **Manifest**
4. Vérifier que le manifest se charge correctement
5. Section **Service Workers** → Vérifier qu'il est "activated"

## 🚀 Déploiement

Après avoir poussé le code en production :

1. **Vider le cache du navigateur** sur mobile
2. **Visiter l'URL** `/admin/`
3. **Chrome proposera automatiquement** l'installation

## 📝 Fichiers créés/modifiés

- ✅ `/admin/manifest.json` - Configuration PWA
- ✅ `/admin/sw.js` - Service Worker
- ✅ `/admin/dashboard.html` - Meta tags PWA ajoutés
- ✅ `/admin/login.html` - Meta tags PWA ajoutés
- ✅ `/admin/js/admin.js` - Enregistrement du Service Worker

## ⚙️ Configuration du Manifest

```json
{
  "name": "Maison Pardailhé - Admin",
  "short_name": "Admin MP",
  "start_url": "/admin/dashboard.html",
  "display": "standalone",
  "theme_color": "#c24b3f",
  "background_color": "#0a0a0a"
}
```

## 🔄 Mise à jour de l'app

Quand vous modifiez le code :

1. Incrémenter la version dans `sw.js` :
   ```javascript
   const CACHE_NAME = 'maisonpardailhe-admin-v2'; // v1 → v2
   ```

2. Les utilisateurs verront la mise à jour au prochain lancement

## 🐛 Dépannage

### L'app ne propose pas l'installation

1. Vérifier que le site est en **HTTPS**
2. Vérifier que le **manifest.json** est accessible
3. Vérifier que le **Service Worker** est enregistré (DevTools)
4. Essayer en navigation privée puis normale

### L'app ne fonctionne pas hors ligne

1. Vérifier que le Service Worker est activé (DevTools → Application)
2. Vider le cache et réinstaller
3. Vérifier les erreurs dans la Console

### L'icône ne s'affiche pas

1. Vérifier que `/img/logo.png` existe et fait au moins 192x192
2. Régénérer le manifest
3. Désinstaller et réinstaller l'app

## 📊 Statistiques

Pour voir combien d'utilisateurs ont installé l'app :
- Google Analytics → Événements → `install_app`
- Chrome DevTools → Lighthouse → PWA Audit

---

**L'interface admin est maintenant installable comme une vraie app Android ! 🎉**
