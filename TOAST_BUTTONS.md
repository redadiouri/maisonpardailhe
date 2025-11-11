# 🎉 Notifications Toast avec Boutons d'Action

## ✅ Modifications appliquées

### 1. Fonction `showToast()` améliorée (`maisonpardailhe/js/toast.js`)
- Ajout d'un paramètre `options` pour personnaliser le toast
- Support d'un bouton d'action avec URL et texte personnalisables
- Le toast n'est plus cliquable pour se fermer quand un bouton d'action est présent

#### Nouvelle signature
```javascript
showToast(message, type = 'info', duration = 4000, options = {})
```

#### Options disponibles
```javascript
{
  actionUrl: '/commande.html?id=123',  // URL du bouton
  actionText: 'Voir ma commande'        // Texte du bouton
}
```

### 2. Notification de commande améliorée (`maisonpardailhe/js/app.js`)
Quand une commande est créée avec succès :
- ✅ Toast principal avec bouton "Voir ma commande"
- ✅ Mini-toast secondaire (toast compact en bas à droite)
- ✅ Durée prolongée (10 secondes au lieu de 4)
- ✅ Message incluant le rappel spam

### 3. Page de test créée (`maisonpardailhe/test-toast.html`)
Pour tester les différents types de notifications.

## 🧪 Comment tester

### Test 1 : Page de test dédiée
1. Démarrez le serveur :
```powershell
cd C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server
npm run dev
```

2. Ouvrez dans votre navigateur :
```
http://localhost:3001/test-toast.html
```

3. Cliquez sur les boutons pour tester :
   - Toast simples (sans bouton)
   - Toast avec boutons d'action

### Test 2 : Créer une vraie commande
1. Allez sur http://localhost:3001/
2. Ajoutez des produits au panier
3. Remplissez le formulaire de commande
4. Cliquez sur "Valider la commande"
5. **Résultat attendu :**
   - Toast vert avec message de succès
   - Bouton "Voir ma commande" dans le toast
   - Mini-toast compact en bas à droite
   - Les deux notifications restent 8-10 secondes

## 🎨 Apparence du toast avec bouton

```
┌─────────────────────────────────────────┐
│ ✓  Votre commande a bien été           │
│    enregistrée : 2 × Pâté en croûte.   │
│    Nous vous confirmerons sous 2h...   │
│                                         │
│    ┌─────────────────────┐             │
│    │ Voir ma commande → │             │
│    └─────────────────────┘             │
└─────────────────────────────────────────┘
```

## 📝 Exemples d'utilisation

### Toast simple (sans bouton)
```javascript
showToast('Opération réussie !', 'success', 4000);
```

### Toast avec bouton d'action
```javascript
showToast(
  'Votre commande #123 a été créée',
  'success',
  10000,
  {
    actionUrl: '/commande.html?id=123',
    actionText: 'Voir ma commande'
  }
);
```

### Toast d'avertissement avec action
```javascript
showToast(
  'Vérifiez votre dossier spam',
  'warning',
  8000,
  {
    actionUrl: 'https://mail.google.com',
    actionText: 'Ouvrir Gmail'
  }
);
```

## 🎯 Fonctionnalités

### Toast avec bouton
- ✅ Bouton stylé avec la couleur du type de toast
- ✅ Effet hover avec animation
- ✅ Ouvre le lien dans un nouvel onglet (target="_blank")
- ✅ Le toast ne se ferme pas au clic (seulement via le bouton X)
- ✅ Durée prolongée automatiquement

### Toast sans bouton
- ✅ Comportement classique
- ✅ Clic n'importe où pour fermer
- ✅ Fermeture automatique après la durée définie

## 🔧 Personnalisation

### Changer le style du bouton
Modifiez le CSS inline dans `toast.js` (ligne ~100) :
```javascript
actionBtn.style.cssText = `
  background: ${config.color};  // Couleur du type (success, error, etc.)
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  // ... autres styles
`;
```

### Ajouter plusieurs boutons
Modifiez la logique dans `toast.js` pour accepter un tableau d'actions :
```javascript
options: {
  actions: [
    { url: '/commande.html?id=123', text: 'Voir' },
    { url: '/facture.html?id=123', text: 'Télécharger' }
  ]
}
```

## ✅ Checklist de validation

- [x] Toast simple fonctionne (sans bouton)
- [x] Toast avec bouton s'affiche correctement
- [x] Bouton cliquable et ouvre la bonne page
- [x] Toast ne se ferme pas au clic quand bouton présent
- [x] Bouton X ferme toujours le toast
- [x] Style responsive (mobile + desktop)
- [x] Intégré dans le flux de création de commande
- [x] Message rappelle de vérifier le spam
- [x] Durée prolongée pour les toasts importants

## 📱 Responsive

Le toast s'adapte automatiquement :
- **Desktop** : Coin supérieur droit
- **Mobile** : Bas de l'écran, pleine largeur

## 🚀 Déploiement

Aucune configuration supplémentaire nécessaire. Les modifications sont dans :
- `maisonpardailhe/js/toast.js` (fonction toast)
- `maisonpardailhe/js/app.js` (utilisation dans commande)

Redéployez simplement votre application pour activer les nouveaux toasts.
