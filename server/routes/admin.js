const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const Commande = require('../models/commande');
const Admin = require('../models/admin');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Login
router.post('/login', wrap(async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.getByUsername(username);
  if (!admin) return res.status(401).json({ message: 'Identifiants invalides.' });
  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) return res.status(401).json({ message: 'Identifiants invalides.' });
  req.session.admin = { id: admin.id, username: admin.username };
  res.json({ success: true });
}));

// Logout
router.post('/logout', auth, (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get commandes by statut
router.get('/commandes', auth, wrap(async (req, res) => {
  const { statut } = req.query;
  if (!statut) return res.status(400).json({ message: 'Statut requis.' });
  const commandes = await Commande.getByStatut(statut);
  res.json(commandes);
}));

// Accepter commande
router.post('/commandes/:id/accepter', auth, wrap(async (req, res) => {
  const id = req.params.id;
  const commande = await Commande.getById(id);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable.' });
  await Commande.updateStatut(id, 'en_cours');
  sendEmail(commande.telephone, 'acceptation', commande);
  res.json({ success: true });
}));

// Refuser commande
router.post('/commandes/:id/refuser', auth, wrap(async (req, res) => {
  const id = req.params.id;
  const { raison } = req.body;
  const commande = await Commande.getById(id);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable.' });
  await Commande.updateStatut(id, 'refusée', raison);
  sendEmail(commande.telephone, 'refus', commande, raison);
  res.json({ success: true });
}));

// Terminer commande
router.post('/commandes/:id/terminer', auth, wrap(async (req, res) => {
  const id = req.params.id;
  const commande = await Commande.getById(id);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable.' });
  await Commande.updateStatut(id, 'terminée');
  res.json({ success: true });
}));

module.exports = router;
