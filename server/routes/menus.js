const express = require('express');
const router = express.Router();
const Menu = require('../models/menu');

router.get('/', async (req, res) => {
  try {
    const items = await Menu.getAll(true);
    res.json(items.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      description: m.description,
      price_cents: Number(m.price_cents || 0),
      is_quote: Boolean(m.is_quote),
      stock: Number(m.stock || 0),
      visible_on_menu: Boolean(m.visible_on_menu),
      image_url: m.image_url || ''
    })));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
