# 🚀 Guide Rapide - Soumettre le site aux moteurs de recherche

## ✅ Étape 1 : Google Search Console

### Configuration initiale
1. Aller sur : https://search.google.com/search-console
2. Cliquer sur "Ajouter une propriété"
3. Choisir "Préfixe d'URL" et entrer : `https://maisonpardailhe.fr`
4. Vérifier la propriété :
   - **Méthode recommandée** : Balise HTML
   - Copier la balise `<meta name="google-site-verification" content="...">` 
   - L'ajouter dans le `<head>` de `index.html`
   - Cliquer sur "Vérifier"

### Soumettre le sitemap
1. Dans Search Console, aller dans "Sitemaps"
2. Entrer : `sitemap.xml`
3. Cliquer sur "Envoyer"
4. Attendre 24-48h pour l'indexation

### Demander l'indexation
1. Aller dans "Inspection d'URL"
2. Entrer chaque URL importante :
   - `https://maisonpardailhe.fr/`
   - `https://maisonpardailhe.fr/menu`
   - `https://maisonpardailhe.fr/commande`
   - `https://maisonpardailhe.fr/services`
   - `https://maisonpardailhe.fr/contact`
3. Cliquer sur "Demander l'indexation" pour chaque page

---

## ✅ Étape 2 : Google My Business

### Créer le profil
1. Aller sur : https://business.google.com
2. Cliquer sur "Gérer maintenant"
3. Renseigner :
   - **Nom** : Maison Pardailhé
   - **Catégorie** : Charcuterie
   - **Adresse** : Place de la République, 31120 Roquettes
   - **Téléphone** : 05 62 48 02 29
   - **Site web** : https://maisonpardailhe.fr
   - **Horaires** : 
     - Mar-Sam : 09h00-13h00, 16h00-19h30
     - Dim : 08h30-13h00
     - Lun : Fermé

4. Vérifier le profil (par courrier ou téléphone)
5. Ajouter :
   - Logo (logo.png)
   - Photos de produits (pâté en croûte, vitrine, etc.)
   - Description (copier celle du site)

---

## ✅ Étape 3 : Bing Webmaster Tools

1. Aller sur : https://www.bing.com/webmasters
2. Se connecter avec compte Microsoft
3. Ajouter le site : `https://maisonpardailhe.fr`
4. Vérifier (balise HTML ou fichier XML)
5. Soumettre sitemap : `https://maisonpardailhe.fr/sitemap.xml`

---

## ✅ Étape 4 : Google Analytics 4

1. Aller sur : https://analytics.google.com
2. Créer une propriété "Maison Pardailhé"
3. Récupérer l'ID de mesure (G-XXXXXXXXXX)
4. Ajouter le code de suivi dans `index.html` avant `</head>` :

\`\`\`html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
\`\`\`

---

## ✅ Étape 5 : Annuaires locaux

### À inscrire sur :
- [ ] **Pages Jaunes** : https://www.pagesjaunes.fr
- [ ] **La Fourchette / TheFork** (si restaurant)
- [ ] **TripAdvisor** : https://www.tripadvisor.fr
- [ ] **Yelp** : https://www.yelp.fr
- [ ] **Mairie de Roquettes** : Demander inscription annuaire local
- [ ] **Office de Tourisme Haute-Garonne**
- [ ] **CCI Toulouse** : https://www.toulouse.cci.fr

### Informations à fournir
- Nom : Maison Pardailhé
- Catégorie : Charcuterie / Traiteur
- Adresse : Place de la République, 31120 Roquettes
- Téléphone : 05 62 48 02 29
- Email : maisonpardailhe@gmail.com
- Site web : https://maisonpardailhe.fr
- Description : Artisan charcutier-traiteur primé. Pâté en croûte médaillé, charcuterie fine artisanale. Click & Collect disponible.

---

## 📊 Suivi des résultats

### Semaine 1
- [ ] Vérifier indexation des pages (Google : `site:maisonpardailhe.fr`)
- [ ] Vérifier présence sitemap dans Search Console
- [ ] Vérifier erreurs dans Search Console

### Semaine 2-4
- [ ] Analyser positions mots-clés (Search Console > Performances)
- [ ] Surveiller impressions et clics
- [ ] Corriger erreurs techniques si présentes

### Mois 2-3
- [ ] Demander avis clients Google (5-10 minimum)
- [ ] Publier 1-2 articles blog/actualités
- [ ] Obtenir 2-3 backlinks locaux

---

## 🎯 Objectifs de référencement

### Court terme (1 mois)
- ✅ 100% pages indexées
- ✅ 0 erreurs Search Console
- ✅ Profil Google My Business actif

### Moyen terme (3 mois)
- 🎯 Top 5 pour "charcutier Roquettes"
- 🎯 Top 10 pour "traiteur Toulouse"
- 🎯 100+ visiteurs organiques/mois

### Long terme (6 mois)
- 🎯 Position #1 pour "charcutier Roquettes"
- 🎯 Top 3 pour "pâté en croûte Toulouse"
- 🎯 500+ visiteurs organiques/mois
- 🎯 Note Google > 4.5 avec 50+ avis

---

**Questions ?** Consultez `docs/SEO-OPTIMIZATIONS.md` pour plus de détails.
