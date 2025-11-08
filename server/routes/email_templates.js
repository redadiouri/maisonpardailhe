const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { validate, emailTemplateSchema } = require('../middleware/validation');
const { adminActionLimiter } = require('../middleware/rateLimits');
const logger = require('../logger');

const TEMPLATES_DIR = path.join(__dirname, '..', 'email_templates');

const TEMPLATE_INFO = {
  'creation.html': {
    name: 'Confirmation de commande',
    description: 'Email envoyé au client lors de la création de sa commande',
    variables: ['customerName', 'date_retrait', 'creneau', 'location', 'itemsHtml', 'total', 'produit']
  },
  'acceptation.html': {
    name: 'Commande acceptée',
    description: 'Email envoyé au client quand sa commande est acceptée',
    variables: ['customerName', 'date_retrait', 'creneau', 'location', 'itemsHtml', 'total', 'produit']
  },
  'refus.html': {
    name: 'Commande refusée',
    description: 'Email envoyé au client quand sa commande est refusée',
    variables: ['customerName', 'date_retrait', 'creneau', 'location']
  },
  'terminee.html': {
    name: 'Commande terminée',
    description: 'Email envoyé au client quand sa commande est marquée comme terminée',
    variables: ['customerName', 'date_retrait', 'creneau', 'location']
  }
};

const normalizeFilename = (name = '') => {
  const cleanedName = name.replace(/\.html$/, '');
  return `${cleanedName}.html`;
};

router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);
    const templates = files
      .filter(f => f.endsWith('.html') && !f.endsWith('.backup'))
      .map(filename => ({
        filename,
        ...TEMPLATE_INFO[filename]
      }));
    
    res.json({ templates });
  } catch (err) {
    logger.error({ err }, 'Failed to list templates');
    res.status(500).json({ error: 'Erreur lors de la lecture des templates' });
  }
});

router.get('/:filename', async (req, res) => {
  try {
    const filename = normalizeFilename(req.params.filename);
    
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }

    const filePath = path.join(TEMPLATES_DIR, filename);
    const content = await fs.readFile(filePath, 'utf8');
    
    res.json({
      filename,
      content,
      ...TEMPLATE_INFO[filename]
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Template non trouvé' });
    }
    logger.error({ err, filename: req.params.filename }, 'Failed to read template');
    res.status(500).json({ error: 'Erreur lors de la lecture du template' });
  }
});

router.put('/:filename', 
  adminActionLimiter,
  validate(emailTemplateSchema),
  async (req, res) => {
  try {
    const filename = normalizeFilename(req.params.filename);
    const { content } = req.body;

    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Contenu invalide' });
    }

    const filePath = path.join(TEMPLATES_DIR, filename);
    const backupPath = path.join(TEMPLATES_DIR, `${filename}.backup`);
    
    try {
      const oldContent = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupPath, oldContent, 'utf8');
    } catch (err) {
      // Log warning but continue, backup is not critical
      logger.warn({ err }, 'Could not create template backup');
    }

    await fs.writeFile(filePath, content, 'utf8');
    
    logger.info({ filename }, 'Email template updated');
    res.json({ 
      success: true, 
      message: 'Template mis à jour avec succès',
      filename 
    });
  } catch (err) {
    logger.error({ err, filename: req.params.filename }, 'Failed to update template');
    res.status(500).json({ error: 'Erreur lors de la mise à jour du template' });
  }
});

// Restaure le backup d'un template
router.post('/:filename/restore', async (req, res) => {
  try {
    const filename = normalizeFilename(req.params.filename);

    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }

    const filePath = path.join(TEMPLATES_DIR, filename);
    const backupPath = path.join(TEMPLATES_DIR, `${filename}.backup`);

    const backupContent = await fs.readFile(backupPath, 'utf8');
    await fs.writeFile(filePath, backupContent, 'utf8');

    logger.info({ filename }, 'Email template restored from backup');
    res.json({ 
      success: true, 
      message: 'Template restauré avec succès',
      filename 
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Backup non trouvé' });
    }
    logger.error({ err, filename: req.params.filename }, 'Failed to restore template');
    res.status(500).json({ error: 'Erreur lors de la restauration du template' });
  }
});

module.exports = router;
