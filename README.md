# 🏪 Maison Pardailhe — Site Web & Plateforme de Commande# Maison Pardailhe — Site Web & Plateforme de Commande



[![CI](https://github.com/redadiouri/maisonpardailhe/actions/workflows/ci.yml/badge.svg)](https://github.com/redadiouri/maisonpardailhe/actions/workflows/ci.yml)[![CI](https://github.com/redadiouri/maisonpardailhe/actions/workflows/ci.yml/badge.svg)](https://github.com/redadiouri/maisonpardailhe/actions/workflows/ci.yml)



Site web professionnel et plateforme de commande en ligne pour Maison Pardailhe, artisan charcutier-traiteur. Système complet avec interface d'administration, gestion de stock, notifications temps réel et paiements en ligne.Site web statique et plateforme de commande en ligne pour Maison Pardailhe, avec interface d'administration pour la gestion des commandes, menus et notifications.



---## 📋 Table des matières



## 📚 Table des matières- [Architecture](#architecture)

- [Prérequis](#prérequis)

- [🎯 Aperçu rapide](#-aperçu-rapide)- [Installation & Démarrage rapide](#installation--démarrage-rapide)

- [🏗️ Architecture](#️-architecture)- [Développement](#développement)

- [⚡ Démarrage rapide](#-démarrage-rapide)- [Tests](#tests)

- [🛠️ Développement](#️-développement)- [Déploiement](#déploiement)

- [📖 Documentation](#-documentation)- [Sécurité](#sécurité)

- [🚀 Déploiement](#-déploiement)- [Structure du projet](#structure-du-projet)

- [🤝 Contribution](#-contribution)- [Scripts disponibles](#scripts-disponibles)

- [Contributing](#contributing)

---- [License](#license)



## 🎯 Aperçu rapide---



### Fonctionnalités principales## 🏗️ Architecture



- ✅ **Site vitrine** responsive (HTML/CSS/Vanilla JS)### Frontend

- ✅ **Système de commande** Click & Collect avec validation- **Site public** : HTML/CSS/Vanilla JS statique dans `maisonpardailhe/`

- ✅ **Gestion de stock** transactionnelle (MySQL)- **Interface admin** : SPA dans `maisonpardailhe/admin/` (HTML + JS vanilla)

- ✅ **Paiements en ligne** via Stripe- **Notifications temps réel** : Server-Sent Events (SSE)

- ✅ **Panel admin** complet avec notifications temps réel (SSE)

- ✅ **Emails automatiques** (confirmation, acceptation, refus, terminée)### Backend

- ✅ **Sécurité renforcée** (CSRF, rate limiting, sanitization)- **Serveur** : Node.js + Express (CommonJS)

- **Base de données** : MySQL 8.0

### Technologies- **ORM/Migrations** : Knex.js

- **Sessions** : `express-session` avec MySQL store

**Frontend:** HTML5, CSS3, Vanilla JavaScript  - **Authentification** : Bcrypt pour hashage des mots de passe admin

**Backend:** Node.js 20+, Express.js (CommonJS)  - **Email** : Nodemailer (SMTP)

**Database:** MySQL 8.0 + Knex.js  

**Payments:** Stripe Checkout  ### Technologies clés

**Email:** Nodemailer (SMTP)  - **Logging** : Pino (JSON structuré)

**Tests:** Jest + Supertest  - **Validation** : Express-validator + Joi

- **Sécurité** : Helmet, CSRF, Rate limiting, Sanitization

---- **Tests** : Jest + Supertest



## 🏗️ Architecture---



```## 📦 Prérequis

maisonpardailhe/

├── maisonpardailhe/       # Frontend statique- **Node.js** : v18+ (recommandé v20+)

│   ├── admin/             # Interface d'administration (SPA)- **npm** : v9+

│   ├── css/               # Styles (minifiés en prod)- **MySQL** : 8.0+

│   ├── js/                # JavaScript vanilla (icônes, commandes, etc.)- **Docker** (optionnel, pour déploiement) : 24+

│   └── img/               # Images optimisées- **PowerShell** (pour scripts Windows) : 7+

│

├── server/                # Backend Node.js---

│   ├── routes/            # API endpoints

│   ├── models/            # Modèles de données (MySQL)## 🚀 Installation & Démarrage rapide

│   ├── middleware/        # Auth, validation, sanitization, rate limits

│   ├── migrations/        # Knex migrations (versionnement DB)### 1. Cloner le dépôt

│   ├── utils/             # Email, dates, SSE eventEmitter

│   ├── scripts/           # Scripts utilitaires (backup, seed, stats)```bash

│   ├── __tests__/         # Tests Jestgit clone https://github.com/redadiouri/maisonpardailhe.git

│   └── server.js          # Point d'entrée Expresscd maisonpardailhe

│```

├── deploy/                # Docker, nginx, scripts de déploiement

├── docs/                  # 📖 Documentation complète### 2. Configuration de la base de données

└── .github/               # CI/CD workflows

```Créer une base MySQL :



### Architecture de données```sql

CREATE DATABASE maisonpardailhe_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

- **MySQL** : Pool de connexions via `mysql2/promise`CREATE USER 'maisonpardailhe'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';

- **Transactions** : Gestion de stock avec `SELECT ... FOR UPDATE`GRANT ALL PRIVILEGES ON maisonpardailhe_db.* TO 'maisonpardailhe'@'localhost';

- **Sessions** : `express-session` avec MySQL storeFLUSH PRIVILEGES;

- **Real-time** : SSE pour notifications admin```



---### 3. Configuration de l'environnement



## ⚡ Démarrage rapide```bash

cd server

### Prérequiscp .env.example .env

```

- **Node.js** ≥ 18 (recommandé: 20+)

- **MySQL** ≥ 8.0Éditer `server/.env` et remplir les valeurs :

- **npm** ≥ 9

```env

### Installation (5 minutes)# Database

DB_HOST=localhost

```bashDB_USER=maisonpardailhe

# 1. Cloner le projetDB_PASSWORD=votre_mot_de_passe

git clone https://github.com/redadiouri/maisonpardailhe.gitDB_NAME=maisonpardailhe_db

cd maisonpardailhe

# Session

# 2. Créer la base de données MySQLSESSION_SECRET=un_secret_tres_long_et_aleatoire

mysql -u root -p

```# Optional: SMTP pour emails

SMTP_HOST=smtp.example.com

```sqlSMTP_PORT=587

CREATE DATABASE maisonpardailhe_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;SMTP_USER=user@example.com

CREATE USER 'maisonpardailhe'@'localhost' IDENTIFIED BY 'votre_mot_de_passe_fort';SMTP_PASS=password

GRANT ALL PRIVILEGES ON maisonpardailhe_db.* TO 'maisonpardailhe'@'localhost';SMTP_FROM=noreply@maisonpardailhe.fr

FLUSH PRIVILEGES;

EXIT;# Environment

```NODE_ENV=development

PORT=3000

```bash```

# 3. Configuration backend

cd server### 4. Installation des dépendances

cp .env.example .env

# ✏️ Éditer .env avec vos paramètres (DB, SESSION_SECRET, SMTP optionnel)```bash

npm install

# 4. Installation et migration```

npm install

npm run migrate:latest### 5. Migrations de la base de données



# 5. Créer un compte admin```bash

node add_admin.jsnpm run migrate:latest

```

# 6. Démarrer le serveur

npm run dev### 6. Créer un compte admin

```

```bash

🎉 **C'est prêt !**  node add_admin.js

- Site public : http://localhost:3001# Suivre les instructions (username + password)

- Panel admin : http://localhost:3001/admin```



---### 7. Démarrer le serveur



## 🛠️ Développement```bash

npm run dev

### Structure des commandes (depuis `server/`)```



```bashLe serveur démarre sur `http://localhost:3000`.

npm run dev              # Serveur dev avec hot-reload + logs pretty

npm test                 # Tests Jest (unit + integration)- **Site public** : `http://localhost:3000/`

npm run migrate:latest   # Appliquer les migrations- **Admin login** : `http://localhost:3000/admin/login.html`

npm run migrate:rollback # Annuler la dernière migration- **Admin dashboard** : `http://localhost:3000/admin/dashboard.html` (après login)

node add_admin.js        # Créer un utilisateur admin

```---



### Workflows importants## 💻 Développement



#### 1. Créer une nouvelle commande (frontend → backend)### Structure des dossiers



```javascript```

// maisonpardailhe/js/commande.jsmaisonpardailhe/

fetch('/api/commandes', {├── maisonpardailhe/          # Frontend statique

  method: 'POST',│   ├── index.html            # Page d'accueil

  body: JSON.stringify({│   ├── commande.html         # Formulaire de commande

    nom_complet: "Alice Dupont",│   ├── menu.html             # Affichage des menus

    telephone: "0600000000",│   ├── admin/                # Interface admin

    date_retrait: "2025-11-15",│   │   ├── login.html

    creneau: "12:30",│   │   ├── dashboard.html

    location: "roquettes",│   │   └── js/admin.js       # Logique admin + SSE

    items: [{ menu_id: 2, qty: 1 }]│   ├── css/

  })│   ├── js/

})│   └── img/

```├── server/                   # Backend Node.js

│   ├── server.js             # Point d'entrée

**Backend traite :**│   ├── routes/               # Routes Express

- Validation (dates, créneaux, stock)│   ├── models/               # Modèles DB

- Transaction MySQL (`SELECT ... FOR UPDATE`)│   ├── middleware/           # Auth, validation, rate limits

- Envoi email de confirmation│   ├── migrations/           # Knex migrations

- Notification SSE aux admins│   ├── scripts/              # Scripts utilitaires

│   ├── __tests__/            # Tests Jest

#### 2. Ajouter un menu (panel admin)│   └── utils/                # Email, logger, SSE

├── deploy/                   # Docker & déploiement

```│   ├── build-and-push.ps1

/admin → Menus → Ajouter menu│   ├── docker-compose.yml

- Upload image (optimisation Sharp automatique → max 1200px, qualité 90%)│   └── docker-compose.dev.yml

- Prix en centimes (stocké en INT, affiché en EUR)└── .github/workflows/        # CI/CD GitHub Actions

- Stock initial```

```

### Conventions de code

#### 3. Tests et sécurité

- **Module system** : CommonJS (`require`/`module.exports`)

Les tests couvrent :- **Langue** : textes utilisateur en français, code/commentaires en anglais ou français

- Routes API (CSRF bypass pour tests)- **Prices** : stockés en centimes d'euro (`price_cents` INTEGER), divisés par 100 pour affichage

- Validation de dates/créneaux (`schedules.test.js`)- **Dates** : format `YYYY-MM-DD` ou `DD/MM/YYYY` accepté, converti en interne

- Gestion de stock transactionnelle- **Booleans** : `tinyint(0|1)` en DB, mappés en `true`/`false` en JS

- Permissions admin

### Points importants (à ne pas modifier sans précaution)

```bash

npm test -- --verbose      # Tests détaillés- **Transactions stock** : `server/routes/commandes.js` utilise `SELECT ... FOR UPDATE` pour éviter race conditions

npm test -- --coverage     # Coverage report- **Prix** : `server/models/menu.js` gère la logique `price_cents`

```- **Slots** : `server/data/schedules.js` définit les créneaux de retrait (15min alignés)



### Conventions de code---



- **Module system** : CommonJS (`require/module.exports`)## 🧪 Tests

- **Langue** : Code en anglais, UI en français

- **Prix** : Toujours en centimes (INT) dans la DB### Lancer tous les tests

- **Dates** : `YYYY-MM-DD` ou `DD/MM/YYYY` acceptés, normalisés par `utils/dates.js`

- **Logging** : Utiliser `logger` (Pino) au lieu de `console.log````bash

cd server

---npm test

```

## 📖 Documentation

### Lancer un test spécifique

Toute la documentation technique est dans `/docs/` :

```bash

| Document | Description |npm test -- __tests__/commandes.validate.test.js

|----------|-------------|npm test -- __tests__/security.test.js

| [**stripe-setup.md**](docs/stripe-setup.md) | 💳 Configuration Stripe (clés API, webhooks, tests) |```

| [**deployment.md**](docs/deployment.md) | 🚀 Déploiement Docker + nginx + SSL |

| [**email-templates.md**](docs/email-templates.md) | 📧 Système d'emails (templates, anti-spam) |### Couverture de code

| [**smtp-setup.md**](docs/smtp-setup.md) | ✉️ Configuration SMTP (Gmail, Brevo, etc.) |

| [**images-optimization.md**](docs/images-optimization.md) | 🖼️ Optimisation automatique des images (Sharp) |```bash

| [**sse-subdomain.md**](docs/sse-subdomain.md) | 🔔 Configuration SSE pour notifications temps réel |npm test -- --coverage

| [**benchmark.md**](docs/benchmark.md) | ⚡ Performance et tests de charge |```



### Fichiers clés à lire en premier### Tests disponibles



1. **`server/server.js`** — Bootstrap Express, middleware, routes- `commandes.validate.test.js` : validation des commandes (dates, créneaux, items)

2. **`server/routes/commandes.js`** — Logique métier des commandes (validation + transactions)- `schedules.test.js` : validation des créneaux de retrait

3. **`server/models/menu.js`** — Prix en centimes, gestion stock- `admin.permissions.test.js` : permissions admin

4. **`server/data/schedules.js`** — Créneaux horaires et lieux de retrait- `security.test.js` : sanitization, XSS, rate limiting

5. **`.github/copilot-instructions.md`** — Guide pour développeurs (patterns, gotchas)

---

---

## 🚢 Déploiement

## 🚀 Déploiement

### Méthode 1 : Docker Compose (développement local)

### Production avec Docker

```bash

```bashcd deploy

# 1. Configuration environnementdocker-compose -f docker-compose.dev.yml up -d

cd server```

cp .env.production.example .env.production

# ✏️ Éditer avec les vraies valeurs de prod (DB, Stripe, SMTP)Accessible sur `http://localhost:3000`.



# 2. Build et push DockerPour arrêter :

cd ../deploy

pwsh ./build-and-push.ps1 -Username votre_username -Repo maisonpardailhe-server -Tag latest```bash

docker-compose -f docker-compose.dev.yml down

# 3. Déployer sur le serveur```

# Voir docs/deployment.md pour configuration nginx + SSL + docker-compose

```### Méthode 2 : Build & Push manuel (production)



### Checklist pré-déploiement```powershell

# Depuis la racine du dépôt

- [ ] Variables d'environnement production configuréespwsh ./deploy/build-and-push.ps1 `

- [ ] Migrations DB appliquées (`npm run migrate:latest`)  -Username votre_username `

- [ ] Compte admin créé  -Repo maisonpardailhe-server `

- [ ] Stripe en mode live (clés `pk_live_`, `sk_live_`)  -Tag v1.0.0 `

- [ ] Webhook Stripe configuré avec `STRIPE_WEBHOOK_SECRET`  -ContextPath server

- [ ] SMTP configuré et testé (`node scripts/test_send_email.js`)```

- [ ] SSL/TLS activé (Let's Encrypt)

- [ ] CSP headers vérifiés dans `server.js`Voir [deploy/README.md](deploy/README.md) pour plus de détails.



Voir [docs/deployment.md](docs/deployment.md) pour le guide complet.### Méthode 3 : CI/CD GitHub Actions (recommandé)



---Le repo utilise GitHub Actions pour automatiser le déploiement :



## 🤝 Contribution1. **CI** (`.github/workflows/ci.yml`) : tests + lint sur chaque PR et push vers `main`

2. **Release** (`.github/workflows/release.yml`) : build et push Docker sur tag `v*`

### Workflow Git

Pour créer une release :

```bash

# 1. Créer une branche feature```bash

git checkout -b feature/nom-de-la-featuregit tag v1.0.0

git push origin v1.0.0

# 2. Faire vos commits (messages en français ou anglais)```

git commit -m "feat: Ajouter filtre par date dans admin"

L'image sera poussée sur Docker Hub avec les tags `v1.0.0` et `latest`.

# 3. Tests avant push

cd server && npm test**Configuration requise** :

- Secrets GitHub : `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `DOCKERHUB_REPO`

# 4. Push et créer une Pull Request

git push origin feature/nom-de-la-feature---

```

## 🔒 Sécurité

### Guidelines

Ce projet implémente plusieurs couches de sécurité :

- **Tests obligatoires** pour les nouvelles fonctionnalités critiques (stock, paiements)

- **Linter** : ESLint + Prettier configurés (`.eslintrc.cjs`, `.prettierrc`)- ✅ **CSP (Content Security Policy)** : Helmet configuré

- **Logs** : Utiliser `logger.info/warn/error` (pas de `console.log`)- ✅ **CSRF Protection** : tokens CSRF pour toutes les actions state-changing

- **Sécurité** : Ne jamais commit de `.env` ou secrets- ✅ **Rate Limiting** : limiters configurés par endpoint (auth, commandes, emails)

- **Documentation** : Mettre à jour `/docs/` si changement d'architecture- ✅ **XSS Prevention** : sanitization HTML (`sanitize-html`)

- ✅ **SQL Injection Prevention** : requêtes paramétrées exclusivement

### Reporting de bugs- ✅ **HSTS** : Strict-Transport-Security en production

- ✅ **Session sécurisée** : httpOnly, secure (HTTPS), sameSite cookies

Ouvrir une issue GitHub avec :- ✅ **Bcrypt** : hashage des mots de passe admin (cost: 10)

- Description du problème

- Étapes de reproductionVoir [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) pour la checklist complète.

- Logs pertinents (`server/logs/` si disponibles)

- Version Node.js / MySQL**Signaler une vulnérabilité** : Contactez [security@maisonpardailhe.fr](mailto:security@maisonpardailhe.fr) (ou créer une issue privée GitHub).



------



## 📄 License## 📜 Scripts disponibles



Ce projet est sous licence privée. Tous droits réservés à Maison Pardailhe.Tous les scripts se lancent depuis `server/` :



---```bash

cd server

## 🆘 Support

# Développement

Pour toute question :npm run dev              # Serveur avec logs Pino pretty

1. Consulter la [documentation](docs/)

2. Vérifier les [issues GitHub](https://github.com/redadiouri/maisonpardailhe/issues)# Production

3. Contacter l'équipe devnpm start                # Serveur en mode production



---# Tests

npm test                 # Lancer tous les tests Jest

**Développé avec ❤️ pour Maison Pardailhe**npm run lint             # Linter ESLint

npm run format           # Formatter Prettier

# Base de données
npm run migrate:latest   # Appliquer les migrations
npm run migrate:rollback # Rollback dernière migration
npm run migrate:make     # Créer une nouvelle migration
npm run db:backup        # Backup de la DB (scripts/db_backup.js)

# Build assets
npm run images:optimize  # Optimiser images (WebP + responsive)
npm run css:minify       # Minifier CSS
npm run build            # images:optimize + css:minify
```

---

## 🤝 Contributing

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines de contribution.

**Quick checklist avant de soumettre une PR** :

- [ ] Code lint passe (`npm run lint`)
- [ ] Tests passent (`npm test`)
- [ ] Pas de données sensibles commitées (mots de passe, tokens, clés API)
- [ ] Documentation mise à jour si nécessaire
- [ ] Commits suivent [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 License

Ce projet est propriétaire. Tous droits réservés © Maison Pardailhe 2025.

---

## 📞 Support

Pour toute question ou problème :

- **Issues GitHub** : [github.com/redadiouri/maisonpardailhe/issues](https://github.com/redadiouri/maisonpardailhe/issues)
- **Email** : contact@maisonpardailhe.fr
- **Documentation** : Voir dossier `docs/` (à venir)

---

## 🙏 Remerciements

Développé avec ❤️ par l'équipe Maison Pardailhe.

Technologies utilisées : Node.js, Express, MySQL, Docker, GitHub Actions.
