# 💳 Configuration Stripe pour Maison Pardailhé

## 📋 Table des matières
1. [Création du compte Stripe](#1-création-du-compte-stripe)
2. [Configuration des clés API](#2-configuration-des-clés-api)
3. [Configuration du Webhook](#3-configuration-du-webhook)
4. [Migration de la base de données](#4-migration-de-la-base-de-données)
5. [Installation du package Stripe](#5-installation-du-package-stripe)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Test en mode développement](#7-test-en-mode-développement)
8. [Passage en production](#8-passage-en-production)

---

## 1. Création du compte Stripe

### Étape 1.1 : Inscription
1. Allez sur https://stripe.com
2. Cliquez sur "Commencer" ou "S'inscrire"
3. Créez votre compte avec votre email professionnel
4. Vérifiez votre email

### Étape 1.2 : Activer votre compte
1. Complétez les informations de votre entreprise
2. Fournissez les informations bancaires (IBAN) pour recevoir les paiements
3. Vérifiez votre identité (pièce d'identité, justificatif de domicile)

> **Note**: Vous pouvez commencer à développer en mode test sans activer complètement votre compte.

---

## 2. Configuration des clés API

### Étape 2.1 : Récupérer les clés de test
1. Connectez-vous à https://dashboard.stripe.com
2. Allez dans **Développeurs** → **Clés API**
3. Assurez-vous que le mode **Test** est activé (toggle en haut)
4. Copiez :
   - **Clé publiable** : commence par `pk_test_...`
   - **Clé secrète** : commence par `sk_test_...` (cliquez sur "Révéler la clé de test secrète")

### Étape 2.2 : Clés de production (plus tard)
- **Clé publiable** : commence par `pk_live_...`
- **Clé secrète** : commence par `sk_live_...`

---

## 3. Configuration du Webhook

### Qu'est-ce qu'un webhook ?
Un webhook permet à Stripe de notifier votre serveur quand un paiement est confirmé. C'est **essentiel** pour marquer les commandes comme payées.

### Étape 3.1 : Créer le webhook (développement)

#### Option A : Stripe CLI (recommandé pour le développement local)
```powershell
# 1. Installer Stripe CLI
# Téléchargez depuis https://stripe.com/docs/stripe-cli
# Ou avec Scoop (Windows) :
scoop install stripe

# 2. Se connecter
stripe login

# 3. Écouter les webhooks localement
stripe listen --forward-to http://localhost:3001/api/payment/webhook
```

Vous verrez un **signing secret** qui commence par `whsec_...`. Copiez-le !

#### Option B : Webhook manuel (production)
1. Dashboard Stripe → **Développeurs** → **Webhooks**
2. Cliquez sur **Ajouter un point de terminaison**
3. URL : `https://votre-domaine.com/api/payment/webhook`
4. Événements à écouter :
   - `checkout.session.completed`
   - `payment_intent.payment_failed` (optionnel)
5. Copiez le **signing secret** (commence par `whsec_...`)

---

## 4. Migration de la base de données

### Appliquer la migration
```powershell
cd C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server
npm run migrate:latest
```

Cette migration ajoute les colonnes suivantes à la table `commandes` :
- `statut_paiement` : 'impaye' | 'paye' | 'rembourse'
- `stripe_checkout_session_id` : ID de session Stripe
- `stripe_payment_intent_id` : ID du paiement
- `date_paiement` : Date du paiement
- `methode_paiement` : Méthode utilisée (card, paypal, etc.)

### Vérifier la migration
```sql
DESCRIBE commandes;
```

Vous devriez voir les nouvelles colonnes.

---

## 5. Installation du package Stripe

```powershell
cd C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server
npm install stripe
```

---

## 6. Variables d'environnement

### Modifier `server/.env`
```bash
# Base de données (existant)
DB_HOST=127.0.0.1
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=maisonpardailhe

# Session (existant)
SESSION_SECRET=votre_secret_session

# Serveur
PORT=3001
NODE_ENV=development

# URL publique (important pour Stripe)
APP_URL=http://localhost:3001

# Stripe - MODE TEST
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE_ICI
STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLIQUE_ICI
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET_WEBHOOK_ICI

# SMTP (existant, optionnel)
# ... vos paramètres SMTP
```

### Pour la production
Remplacez par vos clés **live** :
```bash
NODE_ENV=production
APP_URL=https://votre-domaine.com
STRIPE_SECRET_KEY=sk_live_VOTRE_CLE_LIVE
STRIPE_PUBLISHABLE_KEY=pk_live_VOTRE_CLE_LIVE
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET_WEBHOOK_LIVE
```

---

## 7. Test en mode développement

### Démarrer le serveur
```powershell
cd C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server
npm run dev
```

### Dans un autre terminal : Stripe CLI (si utilisé)
```powershell
stripe listen --forward-to http://localhost:3001/api/payment/webhook
```

### Tester un paiement
1. Créez une commande sur http://localhost:3001
2. Allez sur http://localhost:3001/commande.html?id=123 (remplacez 123 par l'ID de votre commande)
3. Cliquez sur **"Payer X.XX €"**
4. Vous serez redirigé vers Stripe Checkout

### Cartes de test Stripe
- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- **Authentification 3D Secure** : `4000 0025 0000 3155`
- **Date d'expiration** : N'importe quelle date future (ex: 12/34)
- **CVC** : N'importe quel code à 3 chiffres (ex: 123)

### Vérifier le paiement
1. Dans le **Dashboard Stripe** → **Paiements** : vous devriez voir le paiement
2. Dans votre **base de données** :
```sql
SELECT id, nom_complet, statut_paiement, date_paiement, total_cents 
FROM commandes 
WHERE id = 123;
```
Le `statut_paiement` devrait être `'paye'`.

3. Dans le **panel admin** :
   - La commande affiche un badge ✅ PAYÉ

---

## 8. Passage en production

### Étape 8.1 : Activer le compte Stripe
1. Complétez toutes les informations requises par Stripe
2. Vérifiez votre identité et vos coordonnées bancaires
3. Stripe activera votre compte (généralement 24-48h)

### Étape 8.2 : Créer le webhook de production
1. Dashboard Stripe → Mode **Live** (toggle en haut)
2. **Développeurs** → **Webhooks** → **Ajouter un point de terminaison**
3. URL : `https://votre-domaine.com/api/payment/webhook`
4. Événements : `checkout.session.completed`, `payment_intent.payment_failed`
5. Copiez le nouveau **signing secret** (live)

### Étape 8.3 : Mettre à jour les variables d'environnement
```bash
NODE_ENV=production
APP_URL=https://votre-domaine.com
STRIPE_SECRET_KEY=sk_live_VOTRE_CLE_LIVE
STRIPE_PUBLISHABLE_KEY=pk_live_VOTRE_CLE_LIVE
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET_WEBHOOK_LIVE
```

### Étape 8.4 : Redéployer
```powershell
cd C:\Users\mehdi\Documents\GitHub\maisonpardailhe
pwsh ./deploy/build-and-push.ps1 -Username mehdimp4 -Repo maisonpardailhe-server -Tag latest -ContextPath server
```

---

## 🔒 Sécurité

### Points importants
1. **Ne commitez JAMAIS** vos clés secrètes dans Git
2. Les clés secrètes doivent rester dans `.env` (déjà dans `.gitignore`)
3. Utilisez des clés **test** en développement, **live** en production
4. Activez l'authentification 3D Secure pour réduire les fraudes

### Vérifier la sécurité du webhook
Le webhook vérifie automatiquement la signature Stripe :
```javascript
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
```

---

## 📊 Fonctionnalités implémentées

### Frontend (page commande)
- ✅ Badge de statut de paiement (Payé / Impayé)
- ✅ Bouton "Payer X.XX €" avec Stripe Checkout
- ✅ Redirection vers Stripe
- ✅ Messages de confirmation/annulation
- ✅ Design responsive

### Backend (routes API)
- ✅ `POST /api/payment/create-checkout-session` : Créer une session Stripe
- ✅ `POST /api/payment/webhook` : Recevoir les notifications Stripe
- ✅ `GET /api/payment/status/:commande_id` : Vérifier le statut de paiement

### Panel admin
- ✅ Badge "✓ PAYÉ" ou "⏳ IMPAYÉ" sur chaque commande
- ✅ Date de paiement affichée
- ✅ Filtre visuel par statut de paiement

### Base de données
- ✅ Table `commandes` enrichie avec colonnes de paiement
- ✅ Index pour recherche rapide
- ✅ Migration Knex

---

## 🧪 Checklist de test

Avant de mettre en production :

- [ ] Créer une commande test
- [ ] Voir le bouton "Payer" sur la page de détail
- [ ] Cliquer et être redirigé vers Stripe Checkout
- [ ] Utiliser carte test `4242 4242 4242 4242`
- [ ] Compléter le paiement
- [ ] Être redirigé vers la page commande avec message de succès
- [ ] Vérifier le badge "PAYÉ" dans le panel admin
- [ ] Vérifier `statut_paiement = 'paye'` dans la BDD
- [ ] Tester une annulation de paiement
- [ ] Vérifier que le webhook fonctionne (logs)

---

## 🆘 Dépannage

### Le bouton "Payer" n'apparaît pas
- Vérifiez que `total_cents > 0` dans la commande
- Vérifiez que `statut_paiement !== 'paye'`
- Vérifiez que `statut !== 'refusée'`

### Erreur "Stripe non configuré"
- Vérifiez que `STRIPE_SECRET_KEY` est dans `.env`
- Redémarrez le serveur après modification de `.env`

### Le webhook ne fonctionne pas
- En local : utilisez `stripe listen`
- En production : vérifiez l'URL du webhook dans Stripe Dashboard
- Vérifiez les logs serveur pour voir les erreurs

### La commande n'est pas marquée comme payée
- Vérifiez que le webhook reçoit bien l'événement `checkout.session.completed`
- Vérifiez les logs du serveur (pino)
- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct

---

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Webhooks Stripe](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Cartes de test](https://stripe.com/docs/testing)

---

## 🎉 Félicitations !

Votre système de paiement est maintenant opérationnel. Les clients peuvent payer directement en ligne et vous voyez le statut dans le panel admin.
