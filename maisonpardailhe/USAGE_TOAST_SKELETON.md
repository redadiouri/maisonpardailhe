# Guide d'utilisation - Toast & Skeleton Loaders

## 🎉 Toast Notifications

### Installation
Ajouter dans votre HTML :
```html
<script src="/js/toast.js"></script>
```

### Utilisation basique

```javascript
// Méthode 1 : Fonction générique
showToast('Message de succès', 'success');
showToast('Erreur critique', 'error');
showToast('Attention !', 'warning');
showToast('Information', 'info');

// Méthode 2 : Raccourcis
toast.success('Commande enregistrée !');
toast.error('Erreur lors de l\'envoi');
toast.warning('Stock limité');
toast.info('Nouvelle fonctionnalité disponible');
```

### Durée personnalisée
```javascript
// Afficher pendant 6 secondes au lieu de 4
toast.success('Message long', 6000);

// Toast permanent (ne disparaît que sur clic)
showToast('Lisez attentivement', 'warning', 0);
```

### Types disponibles
- `success` 🟢 - Vert, icône check
- `error` 🔴 - Rouge, icône X
- `warning` 🟡 - Orange, icône triangle
- `info` 🔵 - Bleu, icône i

### Caractéristiques
- ✅ Auto-positionnement responsive (top-right desktop, bottom mobile)
- ✅ Pause au survol
- ✅ Fermeture au clic
- ✅ Animations fluides
- ✅ Empilable (plusieurs toasts simultanés)
- ✅ Accessible (ARIA live regions)

---

## 💀 Skeleton Loaders

### Installation
Ajouter dans votre HTML :
```html
<link rel="stylesheet" href="/css/skeleton.css">
<script src="/js/skeleton.js"></script>
```

### Utilisation simple

```javascript
// Afficher un skeleton dans un élément
showSkeleton('#menu-container', 'menu-card', 3);

// Cacher et remplacer par le contenu
hideSkeleton('#menu-container', '<div>Contenu chargé</div>');
```

### Templates disponibles

#### 1. Menu Card
```javascript
showSkeleton('#menu', 'menu-card', 6);
// Affiche 6 cartes skeleton pour le menu
```

#### 2. Order Recap
```javascript
showSkeleton('#recap', 'order-recap');
// Affiche un récapitulatif de commande skeleton
```

#### 3. Product List
```javascript
showSkeleton('#products', 'product-list', 5);
// Affiche 5 items produits skeleton
```

#### 4. Grid
```javascript
showSkeleton('#gallery', 'grid', 9);
// Affiche une grille 3x3 de cartes
```

#### 5. Form
```javascript
showSkeleton('#contact-form', 'form');
// Affiche un formulaire skeleton
```

#### 6. Header
```javascript
showSkeleton('#page-header', 'header');
// Titre + sous-titre skeleton
```

#### 7. Text
```javascript
showSkeleton('#description', 'text', 4);
// 4 lignes de texte skeleton
```

### Wrapper async automatique

```javascript
// Affiche skeleton pendant le chargement
await withSkeleton(
  '#menu-container',
  'grid',
  async () => {
    const data = await fetch('/api/menus').then(r => r.json());
    renderMenus(data);
  },
  6 // nombre de skeletons
);
```

### Création manuelle

```javascript
// Générer le HTML
const html = createSkeleton('menu-card', 3);
document.getElementById('container').innerHTML = html;
```

### Classes CSS disponibles

```css
.skeleton              /* Base */
.skeleton-text         /* Ligne de texte */
.skeleton-text-lg      /* Texte large */
.skeleton-title        /* Titre */
.skeleton-subtitle     /* Sous-titre */
.skeleton-image        /* Image 3:2 */
.skeleton-avatar       /* Avatar rond 60px */
.skeleton-circle       /* Cercle 40px */
.skeleton-button       /* Bouton */
.skeleton-card         /* Carte complète */
.skeleton-pulse        /* Animation pulse au lieu de shimmer */
```

### Personnalisation

```html
<!-- Largeurs personnalisées -->
<div class="skeleton skeleton-text skeleton-w-3-4"></div>
<div class="skeleton skeleton-text skeleton-w-1-2"></div>

<!-- Skeleton inline -->
<span class="skeleton skeleton-inline" style="width: 100px; height: 20px;"></span>
```

---

## 📖 Exemples complets

### Exemple 1 : Chargement menu

```javascript
// Afficher skeleton
showSkeleton('#menu-grid', 'grid', 6);

// Charger les données
fetch('/api/menus')
  .then(res => res.json())
  .then(data => {
    // Générer le HTML des menus
    const html = data.map(menu => `
      <div class="menu-card">
        <img src="${menu.image}" alt="${menu.name}">
        <h3>${menu.name}</h3>
        <p>${menu.description}</p>
        <span class="price">${menu.price}€</span>
      </div>
    `).join('');
    
    // Remplacer skeleton par contenu
    hideSkeleton('#menu-grid', html);
    
    // Toast de succès
    toast.success('Menu chargé !');
  })
  .catch(error => {
    hideSkeleton('#menu-grid', '<p>Erreur de chargement</p>');
    toast.error('Impossible de charger le menu');
  });
```

### Exemple 2 : Formulaire avec feedback

```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Envoi...';
  
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: new FormData(form)
    });
    
    if (response.ok) {
      toast.success('Message envoyé avec succès !');
      form.reset();
    } else {
      toast.error('Erreur lors de l\'envoi');
    }
  } catch (error) {
    toast.error('Problème de connexion');
  } finally {
    button.disabled = false;
    button.textContent = 'Envoyer';
  }
});
```

### Exemple 3 : Commande avec skeleton

```javascript
async function loadOrder(orderId) {
  const container = document.getElementById('order-recap');
  
  // Skeleton
  showSkeleton(container, 'order-recap');
  
  try {
    const response = await fetch(`/api/commandes/${orderId}`);
    const order = await response.json();
    
    // Générer le HTML de la commande
    const html = `
      <div class="order-card">
        <h2>Commande #${order.id}</h2>
        <p>Statut: ${order.statut}</p>
        <p>Total: ${order.total}€</p>
      </div>
    `;
    
    hideSkeleton(container, html);
  } catch (error) {
    toast.error('Commande introuvable');
    hideSkeleton(container, '<p>Erreur</p>');
  }
}
```

---

## 🎨 Personnalisation avancée

### Modifier les couleurs des toasts

```javascript
// Dans votre fichier JS custom
const customToast = (message) => {
  const toast = showToast(message, 'success');
  toast.style.borderLeftColor = '#your-color';
};
```

### Créer un template skeleton personnalisé

```javascript
// Ajouter dans skeletonTemplates
window.skeletonTemplates['custom-card'] = () => `
  <div class="skeleton-card">
    <div class="skeleton" style="height: 150px; border-radius: 12px;"></div>
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-text"></div>
  </div>
`;

// Utiliser
showSkeleton('#container', 'custom-card', 3);
```

---

## ✅ Bonnes pratiques

### Toast
- ✅ Utiliser `success` pour confirmations
- ✅ Utiliser `error` pour erreurs bloquantes
- ✅ Utiliser `warning` pour avertissements importants
- ✅ Utiliser `info` pour notifications neutres
- ✅ Messages courts (< 80 caractères)
- ✅ Toujours permettre la fermeture

### Skeleton
- ✅ Utiliser pour chargements > 500ms
- ✅ Respecter la structure du contenu final
- ✅ Animer avec shimmer (par défaut) ou pulse
- ✅ Ne pas cumuler skeleton + spinner
- ✅ Toujours avoir un fallback en cas d'erreur

---

## 🚀 Performance

### Toast
- Poids : ~3KB (non gzippé)
- Pas de dépendances
- Animation GPU-accelerated

### Skeleton
- CSS : ~4KB
- JS : ~3KB
- Pas de dépendances
- Optimisé pour mobile

---

## 📱 Compatibilité

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ iOS Safari 14+
- ✅ Android Chrome 90+

---

## 🐛 Debug

```javascript
// Vérifier si toast.js est chargé
console.log(typeof showToast); // 'function'

// Vérifier si skeleton.js est chargé
console.log(typeof createSkeleton); // 'function'

// Tester tous les types de toast
['success', 'error', 'warning', 'info'].forEach((type, i) => {
  setTimeout(() => showToast(`Test ${type}`, type), i * 1000);
});
```

---

## 📞 Support

Pour plus d'aide, consultez :
- Code source : `/js/toast.js` et `/js/skeleton.js`
- CSS : `/css/skeleton.css`
- Exemples : Ce fichier

Bonne utilisation ! 🎉
