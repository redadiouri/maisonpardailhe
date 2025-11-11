# 🚀 Quick Start : Installation Stripe

## ⚡ Étapes rapides (5 minutes)

### 1. Installer Stripe
```powershell
cd C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server
npm install stripe
```

### 2. Appliquer la migration
```powershell
npm run migrate:latest
```

### 3. Configurer les clés Stripe

#### A. Créer un compte Stripe (si pas encore fait)
- Allez sur https://stripe.com
- Créez un compte gratuit

#### B. Récupérer les clés de test
1. https://dashboard.stripe.com → **Développeurs** → **Clés API**
2. Mode **Test** activé (toggle en haut)
3. Copiez :
   - Clé publiable : `pk_test_...`
   - Clé secrète : `sk_test_...`

#### C. Mettre à jour `server/.env`
```bash
# Ajoutez ces lignes à la fin :
APP_URL=http://localhost:3001
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_ICI
STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_ICI
STRIPE_WEBHOOK_SECRET=whsec_temporaire
```

### 4. Configurer le webhook (développement local)

#### Option A : Stripe CLI (recommandé)
```powershell
# Téléchargez depuis https://github.com/stripe/stripe-cli/releases
# Ou avec Scoop :
scoop install stripe

# Connectez-vous
stripe login

# Dans un terminal séparé, lancez :
stripe listen --forward-to http://localhost:3001/api/payment/webhook
```

Copiez le **signing secret** (`whsec_...`) et mettez-le dans `.env` :
```bash
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET_ICI
```

#### Option B : Sans Stripe CLI (test manuel seulement)
Gardez `STRIPE_WEBHOOK_SECRET=whsec_temporaire` pour l'instant.
Les paiements fonctionneront mais le statut ne sera pas mis à jour automatiquement.

### 5. Démarrer le serveur
```powershell
cd C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server
npm run dev
```

### 6. Tester !
1. Créez une commande sur http://localhost:3001
2. Allez sur http://localhost:3001/commande.html?id=1 (ID de votre commande)
3. Cliquez sur **"Payer X.XX €"**
4. Utilisez la carte test : `4242 4242 4242 4242`
5. Date : `12/34`, CVC : `123`

---

## ✅ Vérifier que ça fonctionne

### Frontend
- [ ] Le bouton "Payer" apparaît sur la page commande
- [ ] Clic → redirection vers Stripe Checkout
- [ ] Paiement test réussi → message de succès
- [ ] Badge "PAYÉ" apparaît

### Panel admin (http://localhost:3001/admin/dashboard)
- [ ] Badge "✓ PAYÉ" sur les commandes payées
- [ ] Badge "⏳ IMPAYÉ" sur les commandes non payées
- [ ] Date de paiement affichée

### Base de données
```sql
SELECT id, nom_complet, statut_paiement, date_paiement 
FROM commandes 
WHERE id = 1;
```
- [ ] `statut_paiement = 'paye'`
- [ ] `date_paiement` rempli

---

## 🎯 Cartes de test Stripe

| Carte | Résultat |
|-------|----------|
| `4242 4242 4242 4242` | ✅ Succès |
| `4000 0000 0000 0002` | ❌ Échec (carte refusée) |
| `4000 0025 0000 3155` | 🔐 3D Secure requis |

---

## 📁 Fichiers modifiés

### Backend
- ✅ `server/migrations/20251111_add_payment_fields.js` (nouvelle migration)
- ✅ `server/routes/payment.js` (nouvelles routes de paiement)
- ✅ `server/server.js` (ajout route `/api/payment` et CSP Stripe)
- ✅ `server/.env.example` (documentation Stripe)

### Frontend
- ✅ `maisonpardailhe/js/commande.js` (bouton de paiement)
- ✅ `maisonpardailhe/admin/js/admin.js` (badges de paiement dans admin)

### Documentation
- ✅ `STRIPE_SETUP.md` (guide complet de configuration)
- ✅ `STRIPE_QUICKSTART.md` (ce fichier)

---

## 🔥 Prochaines étapes

### Immédiat
1. ✅ Installer Stripe
2. ✅ Appliquer la migration
3. ✅ Configurer les clés
4. ✅ Tester en local

### Avant la production
- [ ] Activer le compte Stripe complet
- [ ] Créer un webhook de production
- [ ] Utiliser les clés `live` au lieu de `test`
- [ ] Tester avec de vrais paiements (petits montants)

---

## 🆘 Problèmes ?

### Le bouton de paiement ne s'affiche pas
```javascript
// Vérifiez dans la console navigateur :
console.log('total_cents:', commande.total_cents);
console.log('statut_paiement:', commande.statut_paiement);
console.log('statut:', commande.statut);
```

Conditions requises :
- `total_cents > 0`
- `statut_paiement !== 'paye'`
- `statut !== 'refusée'`

### Erreur "Stripe non configuré"
- Vérifiez que `STRIPE_SECRET_KEY` est dans `.env`
- Redémarrez le serveur : `Ctrl+C` puis `npm run dev`

### Le paiement ne se marque pas comme payé
- Si vous utilisez Stripe CLI : vérifiez qu'il tourne dans un terminal
- Si pas de Stripe CLI : le webhook ne fonctionnera pas en local
  - Solution : testez directement en production ou utilisez Stripe CLI

---

## 📚 Documentation complète

Pour plus de détails, consultez [STRIPE_SETUP.md](./STRIPE_SETUP.md)
