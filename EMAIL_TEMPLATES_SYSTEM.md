# Système de modification des templates email

## Vue d'ensemble

Le système a été entièrement refait pour être plus simple, robuste et maintenable.

## Caractéristiques principales

### Interface simplifiée
- **3 onglets** au lieu de modes complexes :
  - 🎨 **Visuel** : Éditeur WYSIWYG avec `contenteditable`
  - 📝 **HTML** : Éditeur de code source brut
  - 👁️ **Aperçu** : Prévisualisation dans un iframe

### Fonctionnalités

1. **Gestion d'état**
   - Détection automatique des modifications non sauvegardées
   - Indicateur visuel sur le bouton "Enregistrer" (point rouge pulsant)
   - Confirmation avant changement de template si modifications en cours
   - Warning `beforeunload` pour éviter les pertes de données

2. **Synchronisation bidirectionnelle**
   - Visuel → HTML : sync automatique lors de la modification
   - HTML → Visuel : mise à jour de l'affichage visuel

3. **Variables**
   - Liste déroulante des variables disponibles
   - Copie dans le presse-papiers d'un simple clic
   - Affichage conditionnel (uniquement si variables présentes)

4. **Feedback utilisateur**
   - Barre de statut colorée :
     - 🔵 Info (bleu) pour les chargements
     - ✅ Succès (vert) pour les opérations réussies
     - ❌ Erreur (rouge) pour les échecs
   - Messages auto-effaçants après 3 secondes (succès)

5. **Sauvegarde & Restauration**
   - Sauvegarde avec backup automatique (côté serveur)
   - Restauration depuis la dernière sauvegarde
   - Confirmation avant restauration

## Architecture du code

### Fichiers modifiés

1. **`maisonpardailhe/admin/js/admin.js`**
   - Fonction `initEmailTemplatesTab()` entièrement refaite (~300 lignes)
   - Code propre, commenté, maintenable

2. **`maisonpardailhe/admin/dashboard.html`**
   - Structure HTML simplifiée
   - Suppression de la toolbar complexe
   - 3 conteneurs d'onglets au lieu de modes multiples

3. **`maisonpardailhe/admin/css/admin-clean.css`**
   - Nouveaux styles pour `.email-editor-tab-btn`
   - `.email-editor-tab-content` avec transition
   - `.email-template-item` avec état actif
   - `.btn.unsaved` avec animation pulse
   - `.email-variable-tag` avec effet hover

### État local

```javascript
let templates = [];           // Liste des templates
let currentTemplate = null;   // Template en cours d'édition
let isDirty = false;          // Modifications non sauvegardées
```

### Flux de données

```
Chargement initial
  ↓
loadTemplates() → GET /api/admin/email-templates
  ↓
renderTemplatesList() → Affichage de la sidebar
  ↓
[Clic sur template]
  ↓
loadTemplate(filename) → GET /api/admin/email-templates/:filename
  ↓
renderEditor() → Affichage de l'éditeur
  ↓
[Modification]
  ↓
markDirty() → isDirty = true, indicateur visuel
  ↓
[Clic Enregistrer]
  ↓
syncVisualToHtml() → Synchronisation
  ↓
PUT /api/admin/email-templates/:filename
  ↓
markClean() + Rechargement
```

## API utilisée

### Routes

| Méthode | Route | CSRF | Description |
|---------|-------|------|-------------|
| GET | `/api/admin/email-templates` | ❌ | Liste tous les templates |
| GET | `/api/admin/email-templates/:filename` | ❌ | Récupère un template |
| PUT | `/api/admin/email-templates/:filename` | ✅ | Sauvegarde un template |
| POST | `/api/admin/email-templates/:filename/restore` | ✅ | Restaure depuis backup |

### Payloads

**Sauvegarde** (PUT):
```json
{
  "content": "<html>...</html>"
}
```

**Réponse template**:
```json
{
  "filename": "creation.html",
  "name": "Email de création",
  "description": "Email envoyé...",
  "content": "<html>...</html>",
  "variables": ["nom_complet", "numero_commande"]
}
```

## Sécurité

- **CSRF** : Token requis pour PUT/POST
- **Validation** : Contenu non vide côté client
- **Sanitization** : Côté serveur (dans `server/routes/email_templates.js`)
- **Sandbox** : iframe preview avec `sandbox="allow-same-origin"`

## Points d'amélioration futurs

1. **Éditeur de code avancé** : Intégrer Monaco Editor ou CodeMirror pour :
   - Coloration syntaxique HTML
   - Auto-complétion
   - Validation en temps réel

2. **Prévisualisation temps réel** : Mise à jour automatique de l'aperçu pendant la saisie

3. **Historique** : Système d'undo/redo plus robuste que le navigateur

4. **Tests de rendu** : Prévisualisation multi-clients email (Gmail, Outlook, etc.)

5. **Variables intelligentes** : Auto-complétion des variables dans l'éditeur HTML

## Debugging

### Console errors
Tous les appels API loguent les erreurs dans la console avec contexte

### Status bar
La barre de statut affiche les messages d'erreur détaillés

### Network tab
Vérifier les requêtes pour :
- Status codes
- Response body
- CSRF token presence

## Migration depuis l'ancien système

Aucune migration nécessaire :
- Les templates existants fonctionnent sans modification
- Le format de stockage reste identique
- Les backups sont préservés

---

**Dernière mise à jour** : 6 novembre 2024  
**Version** : 2.0  
**Auteur** : GitHub Copilot
