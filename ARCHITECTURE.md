# 🏗️ Architecture du Projet

Guide visuel de l'architecture de Maison Pardailhe.

---

## 📁 Structure des Dossiers

```
maisonpardailhe/
│
├── 📄 README.md                    # Documentation principale (START HERE)
├── 📄 CONTRIBUTING.md              # Guide pour contributeurs
├── 📄 .gitignore                   # Fichiers à ignorer par Git
│
├── 📂 docs/                        # 📖 Documentation complète
│   ├── README.md                   # Index de la documentation
│   ├── stripe-setup.md             # Configuration Stripe
│   ├── deployment.md               # Guide de déploiement
│   ├── email-templates.md          # Système d'emails
│   ├── smtp-setup.md               # Configuration SMTP
│   ├── images-optimization.md      # Optimisation d'images
│   └── ...autres guides
│
├── 📂 maisonpardailhe/             # 🎨 FRONTEND (site statique)
│   ├── index.html                  # Page d'accueil
│   ├── menu.html                   # Page menu
│   ├── commande.html               # Page de commande
│   ├── contact.html                # Page contact
│   ├── services.html               # Page services
│   ├── identite.html               # Page identité
│   │
│   ├── 📂 admin/                   # Interface d'administration
│   │   ├── login.html              # Connexion admin
│   │   ├── dashboard.html          # Dashboard principal
│   │   ├── 📂 js/
│   │   │   └── admin.js            # Logique admin (SSE, gestion commandes)
│   │   └── 📂 css/
│   │       └── admin-clean.css     # Styles admin
│   │
│   ├── 📂 css/                     # Styles globaux
│   │   ├── style.css               # CSS principal
│   │   ├── style.min.css           # CSS minifié (production)
│   │   └── datepicker.css          # Styles datepicker
│   │
│   ├── 📂 js/                      # JavaScript vanilla
│   │   ├── app.js                  # Init générale
│   │   ├── commande.js             # Logique de commande
│   │   ├── menus.js                # Affichage des menus
│   │   ├── icons.js                # Bibliothèque d'icônes SVG
│   │   ├── toast.js                # Notifications toast
│   │   ├── datepicker.js           # Sélecteur de date
│   │   └── skeleton.js             # Loading skeletons
│   │
│   └── 📂 img/                     # Images
│       ├── logo.png
│       ├── 📂 menus/               # Images uploadées (gitignored)
│       └── 📂 optimized/           # Images optimisées
│
├── 📂 server/                      # ⚙️ BACKEND (Node.js + Express)
│   ├── server.js                   # 🚀 Point d'entrée principal
│   ├── logger.js                   # Configuration Pino
│   ├── knexfile.js                 # Configuration Knex (migrations)
│   ├── add_admin.js                # Script création admin
│   ├── reset_database.sql          # Script reset DB
│   │
│   ├── 📂 routes/                  # API Endpoints
│   │   ├── commandes.js            # ⭐ Routes commandes (validation + transactions)
│   │   ├── menus.js                # Routes menus publiques
│   │   ├── admin.js                # Routes admin (auth, SSE)
│   │   ├── admin_menus.js          # Gestion menus admin
│   │   ├── payment.js              # Routes Stripe
│   │   ├── stock.js                # Gestion de stock
│   │   ├── schedules.js            # Créneaux horaires
│   │   ├── email_templates.js      # Templates d'emails
│   │   ├── notifications.js        # Notifications admin
│   │   └── unsubscribe.js          # Désabonnement emails
│   │
│   ├── 📂 models/                  # Modèles de données (MySQL)
│   │   ├── db.js                   # ⭐ Pool de connexion MySQL
│   │   ├── commande.js             # Modèle Commande
│   │   ├── menu.js                 # ⭐ Modèle Menu (prix_cents, stock)
│   │   ├── admin.js                # Modèle Admin
│   │   └── stock.js                # Gestion stock
│   │
│   ├── 📂 middleware/              # Middleware Express
│   │   ├── auth.js                 # Authentification admin
│   │   ├── validation.js           # Validation Joi
│   │   ├── sanitize.js             # Sanitization XSS
│   │   └── rateLimits.js           # Rate limiting
│   │
│   ├── 📂 migrations/              # Migrations Knex (versionnement DB)
│   │   ├── 20251102_initial.js
│   │   └── 20251111_add_payment_fields.js
│   │
│   ├── 📂 utils/                   # Utilitaires
│   │   ├── email.js                # Envoi d'emails (Nodemailer)
│   │   ├── dates.js                # Manipulation de dates
│   │   └── eventEmitter.js         # ⭐ SSE pour notifications temps réel
│   │
│   ├── 📂 data/                    # Données de configuration
│   │   ├── schedules.js            # ⭐ Créneaux et lieux de retrait
│   │   └── notifications.json      # Config notifications
│   │
│   ├── 📂 email_templates/         # Templates HTML emails
│   │   ├── creation.html           # Email confirmation commande
│   │   ├── acceptation.html        # Email acceptation
│   │   ├── refus.html              # Email refus
│   │   └── terminee.html           # Email commande prête
│   │
│   ├── 📂 scripts/                 # Scripts utilitaires
│   │   ├── README.md               # Documentation scripts
│   │   ├── db_backup.js            # Backup DB
│   │   ├── seed_stock.js           # Init stock
│   │   ├── images_optimize.js      # Optimisation images
│   │   ├── test_send_email.js      # Test SMTP
│   │   ├── benchmark.js            # Tests performance
│   │   └── stats.js                # Statistiques
│   │
│   ├── 📂 __tests__/               # Tests Jest
│   │   ├── commandes.validate.test.js
│   │   ├── schedules.test.js
│   │   ├── security.test.js
│   │   └── admin.permissions.test.js
│   │
│   ├── 📂 backups/                 # Backups DB (gitignored)
│   ├── .env.example                # Template variables d'environnement
│   ├── .env.production.example     # Template prod
│   ├── package.json                # Dépendances npm
│   └── Dockerfile                  # Image Docker
│
├── 📂 deploy/                      # 🚀 Déploiement
│   ├── docker-compose.yml          # Compose production
│   ├── docker-compose.dev.yml      # Compose dev
│   ├── build-and-push.ps1          # Script build Docker
│   └── nginx-*.conf                # Configurations nginx
│
└── 📂 .github/                     # CI/CD
    ├── copilot-instructions.md     # Guide pour AI assistants
    └── workflows/
        └── ci.yml                  # GitHub Actions
```

---

## 🔄 Flux de Données

### 1️⃣ Création de Commande (Frontend → Backend)

```
┌─────────────┐
│  Client     │
│ (Browser)   │
└──────┬──────┘
       │ POST /api/commandes
       │ {nom, tel, date_retrait, items: [{menu_id, qty}]}
       ▼
┌──────────────────────────────────────────────┐
│  server.js (Express)                         │
│  ├─ Helmet (CSP, security headers)           │
│  ├─ CSRF protection                          │
│  ├─ Rate limiting                            │
│  ├─ Body parser                              │
│  └─ Session middleware                       │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  routes/commandes.js                        │
│  ├─ Validation (Joi schema)                 │
│  │  • Date retrait (pas passée, <30 jours)  │
│  │  • Créneau (15min aligned)               │
│  │  • Items non vides                       │
│  ├─ Sanitization (XSS)                      │
│  └─ Transaction MySQL                       │
│     ├─ BEGIN TRANSACTION                    │
│     ├─ SELECT ... FOR UPDATE (lock stock)   │
│     ├─ Vérifier stock suffisant             │
│     ├─ UPDATE stock                         │
│     ├─ INSERT commande                      │
│     └─ COMMIT                               │
└──────┬──────────────────────────────────────┘
       │
       ├─► utils/email.js → Envoie email confirmation
       │
       └─► utils/eventEmitter.js → Notifie admins (SSE)
       
       ▼
┌──────────────┐
│  Response    │
│  201 Created │
│  {id, ref}   │
└──────────────┘
```

### 2️⃣ Notifications Temps Réel (SSE)

```
┌─────────────┐                ┌──────────────────┐
│ Admin UI    │◄───────SSE─────│ GET /api/admin/  │
│ (Browser)   │                │ events           │
└─────────────┘                └────────┬─────────┘
       ▲                                │
       │                                │
       │ Événements:                    │
       │ • new-order                    │
       │ • order-updated                │
       │ • stock-low                    │
       │                                │
       │                                ▼
       │                      ┌──────────────────┐
       │                      │ eventEmitter.js  │
       └──────────────────────│ (EventEmitter)   │
                              └────────┬─────────┘
                                       ▲
                                       │ emit()
                              ┌────────┴─────────┐
                              │ routes/          │
                              │ • commandes.js   │
                              │ • admin_menus.js │
                              └──────────────────┘
```

### 3️⃣ Paiement Stripe

```
┌─────────────┐
│  Client     │
│ (Page cmd)  │
└──────┬──────┘
       │ Click "Payer"
       ▼
┌──────────────────────────────────────┐
│ POST /api/payment/create-checkout    │
│ {commande_id}                        │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ routes/payment.js                   │
│ ├─ Vérifier commande existe         │
│ ├─ Créer Stripe Checkout Session    │
│ └─ Retourner session.url            │
└──────┬──────────────────────────────┘
       │
       ▼
┌──────────────┐         ┌──────────────┐
│ Redirect     │────────►│ Stripe       │
│ vers Stripe  │         │ Checkout     │
└──────────────┘         └──────┬───────┘
                                │ Paiement
                                ▼
                         ┌──────────────────┐
                         │ Stripe Webhook   │
                         │ checkout.session │
                         │ .completed       │
                         └──────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────────┐
                    │ POST /api/payment/webhook │
                    │ ├─ Vérifier signature     │
                    │ ├─ UPDATE commande        │
                    │ │  statut_paiement='paye' │
                    │ └─ date_paiement=NOW()    │
                    └───────────────────────────┘
```

---

## 🗄️ Schéma de Base de Données

```sql
┌─────────────────────────────────────────────┐
│ COMMANDES                                   │
├─────────────────────────────────────────────┤
│ id (INT, PK, AUTO_INCREMENT)                │
│ ref (VARCHAR, UNIQUE)                       │
│ nom_complet (VARCHAR)                       │
│ telephone (VARCHAR)                         │
│ email (VARCHAR, NULLABLE)                   │
│ date_retrait (DATE)                         │
│ creneau (TIME)                              │
│ location (ENUM: roquettes, toulouse)        │
│ produit (TEXT) -- legacy "pate×2;jambon×1"  │
│ items (JSON) -- [{menu_id, qty}]            │
│ precisions (TEXT, NULLABLE)                 │
│ total_cents (INT)                           │
│ statut (ENUM: en attente, acceptée, etc.)   │
│ statut_paiement (ENUM: impaye, paye, etc.)  │ ← Stripe
│ stripe_checkout_session_id (VARCHAR)        │ ← Stripe
│ stripe_payment_intent_id (VARCHAR)          │ ← Stripe
│ date_paiement (TIMESTAMP, NULLABLE)         │ ← Stripe
│ methode_paiement (VARCHAR, NULLABLE)        │ ← Stripe
│ created_at (TIMESTAMP)                      │
│ updated_at (TIMESTAMP)                      │
└─────────────────────────────────────────────┘
                 │
                 │ items (JSON)
                 ▼
┌─────────────────────────────────────────────┐
│ MENUS                                       │
├─────────────────────────────────────────────┤
│ id (INT, PK, AUTO_INCREMENT)                │
│ name (VARCHAR)                              │
│ description (TEXT)                          │
│ price_cents (INT) ⚠️ IMPORTANT: en centimes │
│ stock (INT)                                 │
│ is_quote (TINYINT) -- "sur devis"           │
│ image_url (VARCHAR)                         │
│ created_at (TIMESTAMP)                      │
│ updated_at (TIMESTAMP)                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ADMINS                                      │
├─────────────────────────────────────────────┤
│ id (INT, PK, AUTO_INCREMENT)                │
│ username (VARCHAR, UNIQUE)                  │
│ password_hash (VARCHAR) -- bcrypt           │
│ can_edit_menus (TINYINT)                    │
│ can_manage_orders (TINYINT)                 │
│ created_at (TIMESTAMP)                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ SESSIONS (express-session store)            │
├─────────────────────────────────────────────┤
│ session_id (VARCHAR, PK)                    │
│ expires (TIMESTAMP)                         │
│ data (TEXT) -- JSON serialized              │
└─────────────────────────────────────────────┘
```

---

## 🔐 Sécurité

### Layers de Protection

```
Request
  │
  ├─► Helmet (CSP, X-Frame-Options, etc.)
  ├─► Rate Limiting (express-rate-limit)
  ├─► CSRF Protection (csurf)
  ├─► Input Sanitization (sanitize-html)
  ├─► Input Validation (Joi schemas)
  ├─► Authentication (session-based pour admin)
  └─► Authorization (permissions admin)
```

### Variables d'Environnement Critiques

- `SESSION_SECRET` — Signature des sessions (min 32 chars aléatoires)
- `STRIPE_SECRET_KEY` — Clé API Stripe (sk_test_* ou sk_live_*)
- `STRIPE_WEBHOOK_SECRET` — Signature webhooks Stripe (whsec_*)
- `DB_PASSWORD` — Mot de passe MySQL

⚠️ **Ne JAMAIS commit de `.env`** → gitignored

---

## 📦 Dépendances Clés

### Backend (server/package.json)

```json
{
  "express": "Serveur HTTP",
  "mysql2": "Connexion MySQL (promise-based)",
  "knex": "Query builder + migrations",
  "bcrypt": "Hashage mots de passe",
  "express-session": "Gestion sessions",
  "express-mysql-session": "Store sessions MySQL",
  "helmet": "Headers de sécurité",
  "csurf": "Protection CSRF",
  "express-rate-limit": "Rate limiting",
  "joi": "Validation de données",
  "sanitize-html": "Sanitization XSS",
  "pino": "Logging JSON structuré",
  "nodemailer": "Envoi d'emails",
  "stripe": "Paiements en ligne",
  "sharp": "Optimisation d'images",
  "jest": "Framework de tests",
  "supertest": "Tests HTTP"
}
```

---

## 🚀 Points d'Entrée

### Frontend
- **http://localhost:3001/** → index.html
- **http://localhost:3001/admin** → admin/dashboard.html

### Backend API
- **POST /api/commandes** → Créer commande
- **GET /api/menus** → Liste menus publics
- **POST /api/admin/login** → Connexion admin
- **GET /api/admin/events** → SSE notifications
- **POST /api/payment/create-checkout-session** → Stripe

---

## 📚 Ressources

- [README principal](../README.md)
- [Guide de contribution](../CONTRIBUTING.md)
- [Documentation complète](../docs/README.md)
- [Scripts utilitaires](../server/scripts/README.md)

---

**Dernière mise à jour:** Novembre 2025
