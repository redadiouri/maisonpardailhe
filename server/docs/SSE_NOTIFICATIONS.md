# Système de notifications en temps réel (SSE)

## Vue d'ensemble

Le panel admin utilise maintenant **Server-Sent Events (SSE)** pour recevoir les nouvelles commandes instantanément sans polling. Chaque nouvelle commande déclenche :

1. 🔔 **Une notification sonore** (bip à deux tons)
2. 📱 **Une notification visuelle** (popup en haut à droite)
3. 🔄 **Une mise à jour automatique** de la liste des commandes en attente

## Architecture

### Backend

**`server/utils/eventEmitter.js`**
- Gestionnaire d'événements centralisé
- Maintient une liste des clients SSE connectés
- Diffuse les nouvelles commandes à tous les clients

**`server/routes/admin.js`** (endpoint `/api/admin/commandes/stream`)
- Établit la connexion SSE avec authentification
- Envoie un heartbeat toutes les 30 secondes
- Nettoie les connexions fermées

**`server/routes/commandes.js`** (POST `/api/commandes`)
- Émet un événement après création de commande
- Fonctionne pour les deux formats (legacy et items array)

### Frontend

**`maisonpardailhe/admin/js/admin.js`**
- Établit une connexion SSE au chargement du dashboard
- Reconnecte automatiquement en cas de déconnexion (5s delay)
- Génère un son de notification avec Web Audio API
- Affiche une notification visuelle animée
- Rafraîchit automatiquement la liste des commandes

## Utilisation

### Configuration

Aucune configuration supplémentaire n'est requise. Le système fonctionne automatiquement dès que :

1. Le serveur est démarré (`npm run dev` dans `server/`)
2. Un admin se connecte au dashboard

### Comportement

- **Connexion automatique** : La connexion SSE s'établit dès l'ouverture du dashboard
- **Reconnexion automatique** : En cas de déconnexion (ex: serveur redémarré), reconnexion après 5 secondes
- **Notification persistante** : La tablette peut rester ouverte en permanence
- **Son** : Bip à deux tons (800Hz puis 1000Hz, 0.4s total)
- **Popup** : Notification visuelle de 5 secondes avec animation

### Test manuel

1. Ouvrir le dashboard admin dans un navigateur
2. Dans un autre terminal, exécuter :

```powershell
cd server
node scripts/test_sse_notification.js
```

3. Vérifier que :
   - ✅ Un son est joué
   - ✅ Une notification apparaît en haut à droite
   - ✅ La liste des commandes est mise à jour

### Console du navigateur

Pour déboguer, ouvrir la console développeur (F12) :

```
SSE connection established
SSE connected successfully
New order received via SSE: {id: 123, nom_complet: "...", ...}
```

## Détails techniques

### Format des événements SSE

```javascript
// Événement de connexion
{"type": "connected"}

// Nouvelle commande
{
  "type": "new_order",
  "data": {
    "id": 123,
    "nom_complet": "Jean Dupont",
    "telephone": "0612345678",
    "email": "jean@example.com",
    "produit": "[{\"menu_id\":1,\"qty\":2}]",
    "date_retrait": "2025-11-15",
    "creneau": "12:30",
    "location": "roquettes",
    "statut": "en_attente",
    "total_cents": 2400
  }
}
```

### Gestion des erreurs

- **Déconnexion réseau** : Reconnexion automatique après 5 secondes
- **Serveur éteint** : Tentatives de reconnexion continues
- **Session expirée** : L'utilisateur sera redirigé vers la page de login

### Performances

- **Connexions persistantes** : Une connexion SSE par client admin
- **Heartbeat** : Ping toutes les 30s pour maintenir la connexion
- **Nettoyage** : Les connexions fermées sont automatiquement retirées
- **Overhead minimal** : ~1KB par nouvelle commande

## Compatibilité

✅ Chrome, Edge, Firefox, Safari (tous les navigateurs modernes)  
✅ iOS Safari (pour tablettes iPad)  
✅ Android Chrome  

⚠️ **Note** : Internet Explorer n'est pas supporté (SSE non disponible)

## Dépannage

### Le son ne joue pas

- Vérifier que le volume de la tablette n'est pas coupé
- Certains navigateurs bloquent l'autoplay audio avant interaction utilisateur
- Solution : cliquer n'importe où dans le dashboard au moins une fois

### Les notifications n'apparaissent pas

1. Vérifier la console : y a-t-il des erreurs ?
2. Vérifier que la connexion SSE est établie : `SSE connection established`
3. Tester avec le script : `node scripts/test_sse_notification.js`

### Reconnexion constante

- Le serveur est peut-être surchargé ou redémarre fréquemment
- Vérifier les logs serveur : `npm run dev`
- Vérifier que `SESSION_SECRET` est bien défini dans `.env`

## Amélioration future possible

- [ ] Notification push sur mobile via PWA
- [ ] Sons personnalisables
- [ ] Filtres de notification par type de commande
- [ ] Indicateur visuel de connexion SSE (badge vert/rouge)
