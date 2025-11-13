# 🛠️ Scripts Utilitaires

Ce dossier contient des scripts pour la maintenance, les tests et l'administration du projet.

---

## 📊 Scripts de Performance

### `benchmark.js`

Tests de performance généraux.

```bash
node scripts/benchmark.js
```

### `benchmark-api.js`

Tests de charge des endpoints API.

```bash
node scripts/benchmark-api.js
```

### `benchmark-load.js`

Tests de charge avec requêtes concurrentes.

```bash
node scripts/benchmark-load.js
```

---

## 🗄️ Scripts de Base de Données

### `db_backup.js`

Sauvegarde de la base de données MySQL.

```bash
node scripts/db_backup.js
```

Crée un dump SQL dans `server/backups/` avec timestamp.

### `seed_stock.js`

Initialise ou réinitialise le stock des menus.

```bash
node scripts/seed_stock.js
```

---

## 🖼️ Scripts d'Images

### `images_optimize.js`

Optimise toutes les images dans `maisonpardailhe/img/`.

```bash
# Depuis server/
node scripts/images_optimize.js

# Ou avec npm script
npm run optimize:images
```

Génère :

- Versions WebP
- Versions redimensionnées (400px, 800px, 1200px, 1600px)
- Images optimisées JPG/PNG
- Manifest JSON dans `maisonpardailhe/img/optimized/`

---

## 📧 Scripts de Test Email

### `test_send_email.js`

Teste l'envoi d'emails SMTP.

```bash
node scripts/test_send_email.js
```

Envoie un email de test à l'adresse configurée dans `.env`.  
**Prérequis** : SMTP configuré dans `.env`

### `test_mail_tester.js`

Teste l'envoi vers mail-tester.com pour vérifier le score anti-spam.

```bash
node scripts/test_mail_tester.js
```

---

## 🔔 Scripts de Notifications

### `test_sse_notification.js`

Teste le système de notifications temps réel (SSE).

```bash
node scripts/test_sse_notification.js
```

Envoie une notification test aux clients SSE connectés.

---

## 📊 Scripts de Statistiques

### `stats.js`

Génère des statistiques sur les commandes et les ventes.

```bash
node scripts/stats.js
```

Affiche :

- Nombre total de commandes
- Commandes par statut
- Revenus totaux
- Produits les plus vendus

---

## 🧹 Scripts de Migration

### `migrate_menu_html_to_db.js`

Migration legacy : importe les menus depuis HTML vers MySQL.

```bash
node scripts/migrate_menu_html_to_db.js
```

⚠️ **Obsolète** - Conservé pour référence historique uniquement.

---

## 🧮 Scripts de Calcul

### `test_total_calculation.js`

Teste le calcul des totaux de commande.

```bash
node scripts/test_total_calculation.js
```

Vérifie que les prix en centimes sont calculés correctement.

---

## 💡 Ajouter un nouveau script

1. Créer `scripts/mon_script.js`
2. Ajouter le shebang : `#!/usr/bin/env node`
3. Documenter dans ce README
4. (Optionnel) Ajouter un npm script dans `package.json` :

```json
{
  "scripts": {
    "mon-script": "node scripts/mon_script.js"
  }
}
```

---

## 🔗 Voir aussi

- [Documentation principale](../../docs/README.md)
- [Guide de contribution](../../CONTRIBUTING.md)
