```markdown
# Maison Pardailhé 🏡

A simple website showcasing Maison Pardailhé, built with HTML and CSS.

This project provides a static website for Maison Pardailhé, offering information and visuals.

![License](https://img.shields.io/github/license/redadiouri/maisonpardailhe)
![GitHub stars](https://img.shields.io/github/stars/redadiouri/maisonpardailhe?style=social)
![GitHub forks](https://img.shields.io/github/forks/redadiouri/maisonpardailhe?style=social)
![GitHub issues](https://img.shields.io/github/issues/redadiouri/maisonpardailhe)
![GitHub pull requests](https://img.shields.io/github/issues-pr/redadiouri/maisonpardailhe)
![GitHub last commit](https://img.shields.io/github/last-commit/redadiouri/maisonpardailhe)

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)

# Maison Pardailhé — Site vitrine et back-office

Bienvenue dans le dépôt de la *Maison Pardailhé* — un site vitrine statique enrichi d'un back‑office minimal pour la gestion des commandes Click & Collect.

Ce README explique comment installer, lancer et développer le projet localement, ainsi que l'architecture principale et les endpoints disponibles.

## Contenu rapide
- Frontend statique : pages publiques (HTML/CSS/JS) dans `maisonpardailhe/`
- Back-office admin (HTML/CSS/JS) dans `maisonpardailhe/admin/`
- Backend Node/Express + MySQL dans le dossier `server/`

## Arborescence essentielle

```
.
├─ maisonpardailhe/         # Site public (HTML/CSS/JS + admin static)
│  ├─ index.html
│  ├─ menu.html
+  ├─ css/
│  └─ js/
├─ server/                  # Backend (Express)
│  ├─ server.js
│  ├─ package.json
│  ├─ routes/
│  ├─ models/
│  └─ utils/
├─ README.md
└─ server/schema.sql
```

## Objectif du projet

Offrir une vitrine (pages publiques) et un workflow simple Click & Collect :
- Le visiteur choisit des produits via un formulaire sur le site public.
- Le backend enregistre une commande en base MySQL.
- Un administrateur se connecte au back-office pour accepter, refuser ou marquer une commande comme terminée.

## Prérequis pour le développement

- Node.js 18+ (ou version LTS récente)
- MySQL (ou MariaDB)
- Git

## Installation et exécution (développement)

1. Cloner le dépôt :

```powershell
git clone https://github.com/redadiouri/maisonpardailhe.git
cd maisonpardailhe
```

2. Installer les dépendances du serveur :

```powershell
cd server
npm install
```

3. Préparer la base de données :
- Créez une base MySQL et exécutez `server/schema.sql` pour créer les tables `commandes` et `admins`.

4. Créer un fichier d'environnement :

Copiez `server/.env.example` vers `server/.env` et remplissez les variables requises :

- DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
- SESSION_SECRET

5. (Optionnel) Ajouter un administrateur :

```powershell
node add_admin.js monadmin monmotdepasse
```

6. Lancer le serveur :

```powershell
npm run dev
```

Le serveur écoute par défaut sur le port `3001`. Le site public statique est servi depuis `maisonpardailhe/` et le back-office depuis `maisonpardailhe/admin/`.

Ouvrez dans votre navigateur : http://localhost:3001

## Variables d'environnement importantes (server/.env)

- DB_HOST, DB_USER, DB_PASSWORD, DB_NAME : connexion MySQL
- SESSION_SECRET : secret pour `express-session` (indispensable en production)
- (Pour un vrai mailer) SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_ADDRESS — si vous intégrez nodemailer

## Base de données (schéma)

Fichier : `server/schema.sql`

- Table `commandes` : id, nom_complet, telephone, produit (texte sérialisé), date_retrait, creneau, precisions, statut, raison_refus, date_creation
- Table `admins` : id, username, password_hash

Remarque : le champ `produit` est actuellement une chaîne concaténée (ex: `pate×2;jambon×1`). Pour une gestion fine des articles, il faudra normaliser la structure (table `commande_items`).

## Endpoints utiles (API)

- POST /api/commandes
  - Crée une commande (publique).
  - Payload JSON attendu : { nom_complet, telephone, produit, date_retrait, creneau, precisions }

- POST /api/admin/login
  - Authentification admin (crée la session).

- POST /api/admin/logout
  - Détruit la session.

- GET /api/admin/commandes?statut=<statut>
  - Récupère les commandes filtrées par statut (protégé par session).

- POST /api/admin/commandes/:id/accepter
- POST /api/admin/commandes/:id/refuser  { raison }
- POST /api/admin/commandes/:id/terminer

Notes : les endpoints admin nécessitent la session (cookie HTTP). Le frontend admin envoie `credentials: 'include'`.

## Points d'attention / sécurité

- `SESSION_SECRET` doit être défini en production ; évitez le fallback en clair.
- Activez `cookie.secure` et un store de session persistant (ex: Redis) en production.
- Restreignez les origines CORS en production (dans `server/server.js`).
- Le système d'email est, par défaut, un stub console (voir `server/utils/email.js`). Intégrez `nodemailer` et ajoutez les variables SMTP pour les envois réels.
- Ajoutez un rate-limiter sur `/api/admin/login` pour réduire le risque de brute force.

## Lancer des tests manuels rapides

1. Vérifier la création d'une commande (curl) :

```powershell
curl -X POST http://localhost:3001/api/commandes -H "Content-Type: application/json" -d '{ "nom_complet":"Jean Dupont","telephone":"0600000000","produit":"pate×1","date_retrait":"2025-11-10","creneau":"12:30" }'
```

2. Se connecter en admin via l'interface `maisonpardailhe/admin/login.html` et vérifier le tableau de bord.

## Développement / Contribution

- Créez une branche feature pour vos changements : `git checkout -b feature/ma-modif`
- Faites des commits atomiques et tests locaux.
- Ouvrez une Pull Request et décrivez le changement.

Pour les modifications backend : installez les dépendances dans `server/`, modifiez puis testez via `npm run dev`.

## Idées d'améliorations

- Normaliser la structure des items de commande (table `commande_items`).
- Ajouter l'email client dans le formulaire de commande et envoyer des confirmations réelles via SMTP.
- Ajouter tests automatisés (supertest + jest/mocha) pour les endpoints critiques.
- Durcir la sécurité (rate limiting, CSRF protection, session store).

## Contact / Support

Pour toute question ou problème, ouvrez une issue sur GitHub : https://github.com/redadiouri/maisonpardailhe/issues

---

Merci — prêt à aider si vous voulez que j'implémente l'une des améliorations (ex : mailer, champ email, rate-limiter, migration DB, tests).