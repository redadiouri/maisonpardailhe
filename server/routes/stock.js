const express = require('express');
const router = express.Router();
const Stock = require('../models/stock');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const items = await Stock.getAll();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/', auth, async (req, res) => {
  const data = req.body || {};
  const name = (data.name || '').toString().trim();
  const reference = (data.reference || '').toString().trim();
  const image_url = (data.image_url || '').toString();
  let quantity = Number.isFinite(Number(data.quantity)) ? Math.floor(Number(data.quantity)) : 0;
  const available = data.available === undefined ? 1 : data.available ? 1 : 0;
  if (!name) return res.status(400).json({ message: 'Nom requis.' });
  if (name.length > 255) return res.status(400).json({ message: 'Nom trop long (max 255).' });
  if (reference.length > 100)
    return res.status(400).json({ message: 'Référence trop longue (max 100).' });
  if (!Number.isFinite(quantity) || quantity < 0)
    return res.status(400).json({ message: 'Quantité invalide.' });
  try {
    const id = await Stock.create({ name, reference, quantity, image_url, available });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID invalide.' });
  const data = req.body || {};
  const updates = {};
  if (data.name !== undefined) {
    const n = (data.name || '').toString().trim();
    if (!n) return res.status(400).json({ message: 'Nom requis.' });
    if (n.length > 255) return res.status(400).json({ message: 'Nom trop long (max 255).' });
    updates.name = n;
  }
  if (data.reference !== undefined) {
    const r = (data.reference || '').toString().trim();
    if (r.length > 100)
      return res.status(400).json({ message: 'Référence trop longue (max 100).' });
    updates.reference = r;
  }
  if (data.quantity !== undefined) {
    const q = Number(data.quantity);
    if (!Number.isFinite(q) || q < 0)
      return res.status(400).json({ message: 'Quantité invalide.' });
    updates.quantity = Math.floor(q);
  }
  if (data.image_url !== undefined) updates.image_url = data.image_url || '';
  if (data.available !== undefined) updates.available = data.available ? 1 : 0;
  if (Object.keys(updates).length === 0) return res.json({ affected: 0 });
  try {
    const affected = await Stock.update(id, updates);
    res.json({ affected });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID invalide.' });
  try {
    const affected = await Stock.delete(id);
    res.json({ affected });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
