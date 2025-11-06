# Maison Pardailhe — Site Web & Plateforme de Commande

[![CI](https://github.com/redadiouri/maisonpardailhe/actions/workflows/ci.yml/badge.svg)](https://github.com/redadiouri/maisonpardailhe/actions/workflows/ci.yml)

Site web statique et plateforme de commande en ligne pour Maison Pardailhe, avec interface d'administration pour la gestion des commandes, menus et notifications.

## 📋 Table des matières

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation & Démarrage rapide](#installation--démarrage-rapide)
- [Développement](#développement)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Sécurité](#sécurité)
- [Structure du projet](#structure-du-projet)
- [Scripts disponibles](#scripts-disponibles)
- [Contributing](#contributing)
- [License](#license)

---

## 🏗️ Architecture

### Frontend
- **Site public** : HTML/CSS/Vanilla JS statique dans `maisonpardailhe/`
- **Interface admin** : SPA dans `maisonpardailhe/admin/` (HTML + JS vanilla)
- **Notifications temps réel** : Server-Sent Events (SSE)

### Backend
- **Serveur** : Node.js + Express (CommonJS)
- **Base de données** : MySQL 8.0
- **ORM/Migrations** : Knex.js
- **Sessions** : `express-session` avec MySQL store
- **Authentification** : Bcrypt pour hashage des mots de passe admin
- **Email** : Nodemailer (SMTP)

### Technologies clés
- **Logging** : Pino (JSON structuré)
- **Validation** : Express-validator + Joi
- **Sécurité** : Helmet, CSRF, Rate limiting, Sanitization
- **Tests** : Jest + Supertest

---

## 📦 Prérequis

- **Node.js** : v18+ (recommandé v20+)
- **npm** : v9+
- **MySQL** : 8.0+
- **Docker** (optionnel, pour déploiement) : 24+
- **PowerShell** (pour scripts Windows) : 7+

---

## 🚀 Installation & Démarrage rapide

### 1. Cloner le dépôt

```bash
git clone https://github.com/redadiouri/maisonpardailhe.git
cd maisonpardailhe
```

### 2. Configuration de la base de données

Créer une base MySQL :

```sql
CREATE DATABASE maisonpardailhe_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'maisonpardailhe'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON maisonpardailhe_db.* TO 'maisonpardailhe'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configuration de l'environnement

```bash
cd server
cp .env.example .env
```

Éditer `server/.env` et remplir les valeurs :

```env
# Database
DB_HOST=localhost
DB_USER=maisonpardailhe
DB_PASSWORD=votre_mot_de_passe
DB_NAME=maisonpardailhe_db

# Session
SESSION_SECRET=un_secret_tres_long_et_aleatoire

# Optional: SMTP pour emails
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@maisonpardailhe.fr

# Environment
NODE_ENV=development
PORT=3000
```

### 4. Installation des dépendances

```bash
npm install
```

### 5. Migrations de la base de données

```bash
npm run migrate:latest
```

### 6. Créer un compte admin

```bash
node add_admin.js
# Suivre les instructions (username + password)
```

### 7. Démarrer le serveur

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`.

- **Site public** : `http://localhost:3000/`
- **Admin login** : `http://localhost:3000/admin/login.html`
- **Admin dashboard** : `http://localhost:3000/admin/dashboard.html` (après login)

---

## 💻 Développement

### Structure des dossiers

```
maisonpardailhe/
├── maisonpardailhe/          # Frontend statique
│   ├── index.html            # Page d'accueil
│   ├── commande.html         # Formulaire de commande
│   ├── menu.html             # Affichage des menus
│   ├── admin/                # Interface admin
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   └── js/admin.js       # Logique admin + SSE
│   ├── css/
│   ├── js/
│   └── img/
├── server/                   # Backend Node.js
│   ├── server.js             # Point d'entrée
│   ├── routes/               # Routes Express
│   ├── models/               # Modèles DB
│   ├── middleware/           # Auth, validation, rate limits
│   ├── migrations/           # Knex migrations
│   ├── scripts/              # Scripts utilitaires
│   ├── __tests__/            # Tests Jest
│   └── utils/                # Email, logger, SSE
├── deploy/                   # Docker & déploiement
│   ├── build-and-push.ps1
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
└── .github/workflows/        # CI/CD GitHub Actions
```

### Conventions de code

- **Module system** : CommonJS (`require`/`module.exports`)
- **Langue** : textes utilisateur en français, code/commentaires en anglais ou français
- **Prices** : stockés en centimes d'euro (`price_cents` INTEGER), divisés par 100 pour affichage
- **Dates** : format `YYYY-MM-DD` ou `DD/MM/YYYY` accepté, converti en interne
- **Booleans** : `tinyint(0|1)` en DB, mappés en `true`/`false` en JS

### Points importants (à ne pas modifier sans précaution)

- **Transactions stock** : `server/routes/commandes.js` utilise `SELECT ... FOR UPDATE` pour éviter race conditions
- **Prix** : `server/models/menu.js` gère la logique `price_cents`
- **Slots** : `server/data/schedules.js` définit les créneaux de retrait (15min alignés)

---

## 🧪 Tests

### Lancer tous les tests

```bash
cd server
npm test
```

### Lancer un test spécifique

```bash
npm test -- __tests__/commandes.validate.test.js
npm test -- __tests__/security.test.js
```

### Couverture de code

```bash
npm test -- --coverage
```

### Tests disponibles

- `commandes.validate.test.js` : validation des commandes (dates, créneaux, items)
- `schedules.test.js` : validation des créneaux de retrait
- `admin.permissions.test.js` : permissions admin
- `security.test.js` : sanitization, XSS, rate limiting

---

## 🚢 Déploiement

### Méthode 1 : Docker Compose (développement local)

```bash
cd deploy
docker-compose -f docker-compose.dev.yml up -d
```

Accessible sur `http://localhost:3000`.

Pour arrêter :

```bash
docker-compose -f docker-compose.dev.yml down
```

### Méthode 2 : Build & Push manuel (production)

```powershell
# Depuis la racine du dépôt
pwsh ./deploy/build-and-push.ps1 `
  -Username votre_username `
  -Repo maisonpardailhe-server `
  -Tag v1.0.0 `
  -ContextPath server
```

Voir [deploy/README.md](deploy/README.md) pour plus de détails.

### Méthode 3 : CI/CD GitHub Actions (recommandé)

Le repo utilise GitHub Actions pour automatiser le déploiement :

1. **CI** (`.github/workflows/ci.yml`) : tests + lint sur chaque PR et push vers `main`
2. **Release** (`.github/workflows/release.yml`) : build et push Docker sur tag `v*`

Pour créer une release :

```bash
git tag v1.0.0
git push origin v1.0.0
```

L'image sera poussée sur Docker Hub avec les tags `v1.0.0` et `latest`.

**Configuration requise** :
- Secrets GitHub : `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `DOCKERHUB_REPO`

---

## 🔒 Sécurité

Ce projet implémente plusieurs couches de sécurité :

- ✅ **CSP (Content Security Policy)** : Helmet configuré
- ✅ **CSRF Protection** : tokens CSRF pour toutes les actions state-changing
- ✅ **Rate Limiting** : limiters configurés par endpoint (auth, commandes, emails)
- ✅ **XSS Prevention** : sanitization HTML (`sanitize-html`)
- ✅ **SQL Injection Prevention** : requêtes paramétrées exclusivement
- ✅ **HSTS** : Strict-Transport-Security en production
- ✅ **Session sécurisée** : httpOnly, secure (HTTPS), sameSite cookies
- ✅ **Bcrypt** : hashage des mots de passe admin (cost: 10)

Voir [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) pour la checklist complète.

**Signaler une vulnérabilité** : Contactez [security@maisonpardailhe.fr](mailto:security@maisonpardailhe.fr) (ou créer une issue privée GitHub).

---

## 📜 Scripts disponibles

Tous les scripts se lancent depuis `server/` :

```bash
cd server

# Développement
npm run dev              # Serveur avec logs Pino pretty

# Production
npm start                # Serveur en mode production

# Tests
npm test                 # Lancer tous les tests Jest
npm run lint             # Linter ESLint
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
