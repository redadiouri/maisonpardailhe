# 🤝 Guide de Contribution

Merci de votre intérêt pour contribuer à Maison Pardailhe ! Ce guide vous aidera à comprendre les conventions et le workflow du projet.

---

## 📋 Table des matières

- [Code de conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Conventions de code](#conventions-de-code)
- [Workflow Git](#workflow-git)
- [Tests](#tests)
- [Documentation](#documentation)

---

## Code de conduite

- Soyez respectueux et professionnel
- Acceptez les critiques constructives
- Focalisez sur ce qui est meilleur pour le projet
- Faites preuve d'empathie envers les autres contributeurs

---

## Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'est pas déjà signalé dans les [issues](https://github.com/redadiouri/maisonpardailhe/issues)
2. Créez une nouvelle issue avec :
   - Titre clair et descriptif
   - Étapes de reproduction détaillées
   - Comportement attendu vs comportement observé
   - Logs pertinents (si applicable)
   - Environnement (OS, Node.js version, MySQL version)

### Proposer une fonctionnalité

1. Ouvrez une issue pour discuter de la fonctionnalité
2. Attendez l'approbation avant de commencer le développement
3. Suivez le workflow Git ci-dessous

### Soumettre une Pull Request

1. Fork le projet
2. Créez une branche depuis `main`
3. Implémentez vos changements
4. Ajoutez/mettez à jour les tests
5. Mettez à jour la documentation si nécessaire
6. Créez la Pull Request

---

## Conventions de code

### Style général

- **Indentation** : 2 espaces (pas de tabs)
- **Quotes** : Simple quotes `'` pour les strings
- **Semicolons** : Toujours utiliser des points-virgules
- **Langue** : Code et commentaires en anglais, UI/messages en français

### JavaScript (Backend)

```javascript
// ✅ BON
const express = require('express');
const router = express.Router();

router.get('/api/menus', async (req, res) => {
  try {
    const menus = await Menu.getAll();
    res.json(menus);
  } catch (err) {
    logger.error('Error fetching menus:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ❌ MAUVAIS
const express=require("express")
const router=express.Router()

router.get("/api/menus",async(req,res)=>{
  try{
    const menus=await Menu.getAll()
    res.json(menus)
  }catch(err){
    console.log(err) // Utiliser logger, pas console.log
    res.status(500).json({message:"Erreur serveur"})
  }
})
```

### Conventions spécifiques au projet

#### 1. Prix en centimes

```javascript
// ✅ BON - Toujours stocker en centimes
const menu = {
  name: 'Pâté en croûte',
  price_cents: 2450  // 24.50€
};

// Affichage
const priceEur = (menu.price_cents / 100).toFixed(2); // "24.50"

// ❌ MAUVAIS - Ne jamais stocker en décimal
const menu = {
  name: 'Pâté en croûte',
  price: 24.50  // Risque d'erreurs de précision
};
```

#### 2. Dates

```javascript
// ✅ BON - Utiliser utils/dates.js
const { parseDateInput, formatDateForDB } = require('../utils/dates');

const dateRetrait = parseDateInput('15/11/2025'); // Accepte DD/MM/YYYY ou YYYY-MM-DD
const dbDate = formatDateForDB(dateRetrait);      // Toujours YYYY-MM-DD pour MySQL

// ❌ MAUVAIS - Manipulation directe
const dateRetrait = req.body.date_retrait; // Peut être dans n'importe quel format
await db.query('INSERT INTO commandes (date_retrait) VALUES (?)', [dateRetrait]);
```

#### 3. Logging

```javascript
// ✅ BON - Utiliser logger (Pino)
const logger = require('./logger');

logger.info('Server started on port 3001');
logger.warn('Stock faible pour menu_id=5');
logger.error('DB connection failed:', err);

// ❌ MAUVAIS - console.log
console.log('Server started');
console.error(err);
```

#### 4. Transactions de stock

```javascript
// ✅ BON - Utiliser SELECT ... FOR UPDATE
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  
  const [rows] = await conn.query(
    'SELECT stock FROM menus WHERE id = ? FOR UPDATE',
    [menuId]
  );
  
  if (rows[0].stock < qty) {
    throw new Error('Stock insuffisant');
  }
  
  await conn.query(
    'UPDATE menus SET stock = stock - ? WHERE id = ?',
    [qty, menuId]
  );
  
  await conn.commit();
} catch (err) {
  await conn.rollback();
  throw err;
} finally {
  conn.release();
}

// ❌ MAUVAIS - Sans transaction
const [menu] = await db.query('SELECT stock FROM menus WHERE id = ?', [menuId]);
if (menu.stock >= qty) {
  await db.query('UPDATE menus SET stock = stock - ? WHERE id = ?', [qty, menuId]);
}
```

---

## Workflow Git

### Branches

- `main` - Branche stable, déployée en production
- `feature/nom-feature` - Nouvelles fonctionnalités
- `fix/nom-bug` - Corrections de bugs
- `hotfix/nom-urgence` - Corrections urgentes en production

### Messages de commit

Format recommandé : **`type: description`**

Types :
- `feat:` - Nouvelle fonctionnalité
- `fix:` - Correction de bug
- `docs:` - Documentation uniquement
- `style:` - Formatage, indentation (pas de changement de code)
- `refactor:` - Refactoring (pas de nouvelle fonctionnalité ni bug fix)
- `test:` - Ajout/modification de tests
- `chore:` - Tâches de maintenance (deps, config)

```bash
# ✅ BON
git commit -m "feat: Ajouter filtre par date dans commandes admin"
git commit -m "fix: Corriger calcul de stock dans transactions"
git commit -m "docs: Mettre à jour guide Stripe"

# ❌ MAUVAIS
git commit -m "update"
git commit -m "bug fix"
git commit -m "wip"
```

### Processus

```bash
# 1. Sync avec main
git checkout main
git pull origin main

# 2. Créer une branche
git checkout -b feature/ma-nouvelle-fonctionnalite

# 3. Développer et tester
# ... modifications ...
cd server && npm test

# 4. Commits atomiques
git add -p  # Ajouter par morceaux
git commit -m "feat: Ajouter validation de créneaux horaires"

# 5. Push et Pull Request
git push origin feature/ma-nouvelle-fonctionnalite
# Créer PR sur GitHub avec description détaillée
```

---

## Tests

### Lancer les tests

```bash
cd server

# Tous les tests
npm test

# Tests avec coverage
npm test -- --coverage

# Test spécifique
npm test -- commandes.validate.test.js

# Mode watch
npm test -- --watch
```

### Écrire des tests

```javascript
// server/__tests__/exemple.test.js
const request = require('supertest');
const app = require('../server');

describe('GET /api/menus', () => {
  it('devrait retourner la liste des menus', async () => {
    const res = await request(app)
      .get('/api/menus')
      .expect(200);
    
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
  
  it('devrait retourner des menus avec price_cents', async () => {
    const res = await request(app)
      .get('/api/menus')
      .expect(200);
    
    const menu = res.body[0];
    expect(menu).toHaveProperty('price_cents');
    expect(typeof menu.price_cents).toBe('number');
  });
});
```

### Couverture des tests

- **Minimum requis** : 70% de couverture
- **Critique** : 90%+ pour routes de commandes et stock
- Tester les cas limites et erreurs

---

## Documentation

### Mettre à jour la documentation

Lors de changements significatifs, mettre à jour :

1. **README.md** - Si architecture ou installation change
2. **docs/[fichier-pertinent].md** - Pour fonctionnalités spécifiques
3. **Commentaires JSDoc** - Pour fonctions publiques

### Format JSDoc

```javascript
/**
 * Récupère tous les menus actifs
 * @param {boolean} includeQuotes - Inclure les menus "sur devis"
 * @returns {Promise<Array>} Liste des menus
 * @throws {Error} Si erreur de connexion DB
 */
async function getAll(includeQuotes = false) {
  // ...
}
```

---

## Checklist avant Pull Request

- [ ] Tests passent (`npm test`)
- [ ] Code formaté (`npm run format` si configuré)
- [ ] Pas de `console.log` (utiliser `logger`)
- [ ] Documentation mise à jour
- [ ] Messages de commit clairs
- [ ] Pas de fichiers `.env` ou secrets
- [ ] Branch à jour avec `main`

---

## Questions ?

Pour toute question sur le processus de contribution :
- Consultez le [README](../README.md)
- Ouvrez une issue avec le tag `question`
- Contactez l'équipe dev

---

**Merci de contribuer à Maison Pardailhe ! 🎉**
