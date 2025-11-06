const express = require('express');
const router = express.Router();
const Menu = require('../models/menu');
const auth = require('../middleware/auth');
const { validate, menuSchema } = require('../middleware/validation');
const { sanitizeMiddleware } = require('../middleware/sanitize');
const { adminActionLimiter } = require('../middleware/rateLimits');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', auth, wrap(async (req, res) => {
  const items = await Menu.getAll(false);
  res.json(items);
}));

router.post('/', 
  auth, 
  adminActionLimiter,
  sanitizeMiddleware(['name', 'description'], false),
  validate(menuSchema),
  wrap(async (req, res) => {
    const adminId = req.session?.admin?.id;
  const Admin = require('../models/admin');
  const current = await Admin.getById(adminId);
  if (!current || !current.can_edit_menus) return res.status(403).json({ message: 'Forbidden' });
  const { name, description, price_cents, is_quote, stock, visible_on_menu, available } = req.body;
  const id = await Menu.create({
    name,
    description: description || '',
    price_cents,
    is_quote: Boolean(is_quote),
    stock,
    visible_on_menu: visible_on_menu === undefined ? 1 : (visible_on_menu ? 1 : 0),
    available: available === undefined ? 1 : (available ? 1 : 0)
  });
  res.status(201).json({ id });
}));

router.put('/:id', 
  auth, 
  adminActionLimiter,
  sanitizeMiddleware(['name', 'description'], false),
  wrap(async (req, res) => {
    const adminId = req.session?.admin?.id;
  const Admin = require('../models/admin');
  const current = await Admin.getById(adminId);
  if (!current || !current.can_edit_menus) return res.status(403).json({ message: 'Forbidden' });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const affected = await Menu.update(id, req.body);
  res.json({ affected });
}));

router.delete('/:id', 
  auth, 
  adminActionLimiter,
  wrap(async (req, res) => {
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
