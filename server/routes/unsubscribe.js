const express = require('express');
const router = express.Router();
const { verifyToken, addUnsubscribe } = require('../utils/email');
const logger = require('../logger');

// GET /unsubscribe?token=...
router.get('/', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send('<h1>Token manquant</h1>');
  const email = verifyToken(token);
  if (!email) {
    logger.warn('Invalid unsubscribe token');
    return res.status(400).send('<h1>Jeton invalide</h1>');
  }
  try {
    await addUnsubscribe(email);
    // Simple confirmation page (email masked)
    const parts = String(email).split('@');
    let displayed = '***';
    if (parts.length === 2) {
      const name = parts[0];
      const domain = parts[1];
      const visible = name.length > 1 ? name[0] + '***' : '*';
      displayed = `${visible}@${domain}`;
    }
    res.send(`<html><head><meta charset="utf-8"><title>Désabonnement</title></head><body><h1>Adresse désabonnée</h1><p>L'adresse <strong>${displayed}</strong> a été retirée de la liste de diffusion.</p></body></html>`);
  } catch (e) {
    logger.error('Failed to add unsubscribe: %o', e && (e.stack || e));
    res.status(500).send('<h1>Erreur serveur</h1>');
  }
});

module.exports = router;
