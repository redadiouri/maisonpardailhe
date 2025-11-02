const express = require('express');
const router = express.Router();
const Menu = require('../models/menu');
const auth = require('../middleware/auth');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// List all menus (admin)
router.get('/', auth, wrap(async (req, res) => {
  const items = await Menu.getAll(false);
  res.json(items);
}));

// Create
router.post('/', auth, wrap(async (req, res) => {
  // only admins with can_edit_menus are allowed to create
  const adminId = req.session?.admin?.id;
  const Admin = require('../models/admin');
  const current = await Admin.getById(adminId);
  if (!current || !current.can_edit_menus) return res.status(403).json({ message: 'Forbidden' });
  const { name, description, price_cents, is_quote, stock, visible_on_menu, available } = req.body || {};
  if (!name || String(name).trim() === '') return res.status(400).json({ message: 'Name required.' });
  if (!Number.isInteger(Number(price_cents)) || Number(price_cents) < 0) return res.status(400).json({ message: 'price_cents must be integer >= 0' });
  if (!Number.isInteger(Number(stock)) || Number(stock) < 0) return res.status(400).json({ message: 'stock must be integer >= 0' });
  const id = await Menu.create({
    name: String(name).trim(),
    description: description || '',
    price_cents: Number(price_cents),
    is_quote: Boolean(is_quote),
    stock: Number(stock),
    visible_on_menu: visible_on_menu === undefined ? 1 : (visible_on_menu ? 1 : 0),
    available: available === undefined ? 1 : (available ? 1 : 0)
  });
  res.status(201).json({ id });
}));

// Update
router.put('/:id', auth, wrap(async (req, res) => {
  // only admins with can_edit_menus are allowed to update
  const adminId = req.session?.admin?.id;
  const Admin = require('../models/admin');
  const current = await Admin.getById(adminId);
  if (!current || !current.can_edit_menus) return res.status(403).json({ message: 'Forbidden' });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const body = req.body || {};
  if (body.price_cents !== undefined && (!Number.isInteger(Number(body.price_cents)) || Number(body.price_cents) < 0)) return res.status(400).json({ message: 'price_cents must be integer >=0' });
  if (body.stock !== undefined && (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)) return res.status(400).json({ message: 'stock must be integer >=0' });
  // Do not accept slug from client. Slug will be regenerated server-side when name changes.
  if (body.available !== undefined && typeof body.available !== 'boolean' && body.available !== 0 && body.available !== 1) return res.status(400).json({ message: 'available must be boolean/0/1' });
  const affected = await Menu.update(id, body);
  res.json({ affected });
}));

// Delete
router.delete('/:id', auth, wrap(async (req, res) => {
  // only admins with can_edit_menus are allowed to delete
  const adminId = req.session?.admin?.id;
  const Admin = require('../models/admin');
  const current = await Admin.getById(adminId);
  if (!current || !current.can_edit_menus) return res.status(403).json({ message: 'Forbidden' });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const affected = await Menu.delete(id);
  res.json({ affected });
}));

module.exports = router;
