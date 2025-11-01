const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const Commande = require('../models/commande');
const Admin = require('../models/admin');
const auth = require('../middleware/auth');
const { sendCommandeEmail } = require('../utils/email');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Rate limiter and slow-down for login attempts to mitigate brute-force
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');

// shared key generator: username + IP to avoid blocking entire IP ranges
const loginKeyGenerator = (req) => {
  const ip = (req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').toString();
  const username = (req.body && req.body.username) ? String(req.body.username).toLowerCase() : '';
  return `${username}:${ip}`;
};

// soft slowdown: start delaying after 2 attempts within window
const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // allow 2 fast attempts, then start delaying
  delayMs: 1000, // initial delay 1s, increases with each request
  maxDelayMs: 30 * 1000,
  keyGenerator: loginKeyGenerator
});

// hard rate-limit: block after 5 attempts within window; include Retry-After header
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // block after 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: loginKeyGenerator,
  handler: (req, res /*, next */) => {
    const retrySecs = req.rateLimit && req.rateLimit.resetTime ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) : Math.ceil(15 * 60);
    res.set('Retry-After', String(retrySecs));
    res.status(429).json({ message: 'Trop de tentatives de connexion. Réessayez plus tard.' });
  }
});


// Login (rate limited)
// Apply slowDown first (soft delays), then the hard limiter
router.post('/login',
  // validation + sanitization
  body('username').isString().trim().isLength({ min: 3 }).escape(),
  // allow any non-empty password at login (we don't enforce min length here because
  // older seeded accounts use shorter passwords like 'admin'). Creation/change enforce length.
  body('password').isString().notEmpty().withMessage('Le mot de passe est requis.'),
  loginSlowDown, loginLimiter,
  wrap(async (req, res) => {
    // check validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
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

// Change password for current admin
router.post('/change-password', auth, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Champs requis manquants.' });
  if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });

  // Load admin from session id
  const adminId = req.session?.admin?.id;
  if (!adminId) return res.status(401).json({ message: 'Non autorisé.' });

  const admin = await Admin.getById(adminId);
  if (!admin) return res.status(404).json({ message: "Administrateur introuvable." });

  const match = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!match) return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });

  const hash = await bcrypt.hash(newPassword, 10);
  await Admin.updatePassword(adminId, hash);
  res.json({ success: true, message: 'Mot de passe mis à jour.' });
}));

// Get commandes by statut
router.get('/commandes', auth, wrap(async (req, res) => {
  const { statut } = req.query;
  if (!statut) return res.status(400).json({ message: 'Statut requis.' });
  const commandes = await Commande.getByStatut(statut);
  res.json(commandes);
}));

// List admins (id, username) - protected
router.get('/admins', auth, wrap(async (req, res) => {
  const db = require('../models/db');
  const [rows] = await db.query('SELECT id, username FROM admins ORDER BY id ASC');
  res.json(rows.map(r => ({ id: r.id, username: r.username })));
}));

// Create a new admin (protected) - body: { username, password }
router.post('/admins', auth, wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password required' });
  if (typeof username !== 'string' || username.length < 3) return res.status(400).json({ message: 'username invalid (min 3 chars)' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'password invalid (min 8 chars)' });
  const db = require('../models/db');
  // check existing
  const [existing] = await db.query('SELECT id FROM admins WHERE username = ? LIMIT 1', [username]);
  if (existing && existing.length > 0) return res.status(409).json({ message: 'username already exists' });
  const hash = await bcrypt.hash(password, 10);
  await db.execute('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
  res.status(201).json({ success: true });
}));

// Accepter commande
router.post('/commandes/:id/accepter', auth, wrap(async (req, res) => {
  const id = req.params.id;
  const commande = await Commande.getById(id);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable.' });
  await Commande.updateStatut(id, 'en_cours');
  res.json({ success: true });
}));

// Refuser commande
router.post('/commandes/:id/refuser', auth, wrap(async (req, res) => {
  const id = req.params.id;
  const { raison } = req.body;
  const commande = await Commande.getById(id);
  if (!commande) return res.status(404).json({ message: 'Commande introuvable.' });
  await Commande.updateStatut(id, 'refusée', raison);
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

// Admin stats: aggregate commandes and items (protected)
router.get('/stats', auth, wrap(async (req, res) => {
  // lightweight aggregation similar to server/scripts/stats.js but returns JSON for the admin UI
  const db = require('../models/db');
  const Menu = require('../models/menu');
  // load menus into a map for name lookup
  const menus = new Map();
  try {
    const allMenus = await Menu.getAll(false);
    for (const m of allMenus) menus.set(Number(m.id), { name: m.name, price_cents: Number(m.price_cents || 0) });
  } catch (e) {
    // continue even if menus can't be loaded
  }

  const [rows] = await db.query('SELECT id, produit, statut, date_creation, total_cents FROM commandes ORDER BY date_creation DESC');
  const totalOrders = rows.length;
  const byStatus = {};
  let last30 = 0;
  const now = new Date();
  // prepare last 30 days maps (YYYY-MM-DD) -> count/revenue
  const ordersByDayMap = new Map();
  const revenueByDayMap = new Map();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    ordersByDayMap.set(key, 0);
    revenueByDayMap.set(key, 0);
  }
  const itemsSold = new Map();
  let totalRevenueCents = 0;

  for (const c of rows) {
    byStatus[c.statut] = (byStatus[c.statut] || 0) + 1;
    const created = c.date_creation ? new Date(c.date_creation) : null;
    if (created && ((now - created) / (1000 * 60 * 60 * 24) <= 30)) last30++;
    // increment day bucket when within last 30 days
    if (created) {
      const dayKey = new Date(created.getFullYear(), created.getMonth(), created.getDate()).toISOString().slice(0,10);
      if (ordersByDayMap.has(dayKey)) ordersByDayMap.set(dayKey, ordersByDayMap.get(dayKey) + 1);
    }
    // add total_cents to revenue (use stored value instead of recalculating)
    const orderTotal = Number(c.total_cents || 0);
    totalRevenueCents += orderTotal;
    if (created && orderTotal > 0) {
      const dayKey = new Date(created.getFullYear(), created.getMonth(), created.getDate()).toISOString().slice(0,10);
      if (revenueByDayMap.has(dayKey)) revenueByDayMap.set(dayKey, revenueByDayMap.get(dayKey) + orderTotal);
    }
    // try parse produit as JSON array for item counts
    if (c.produit) {
      try {
        const parsed = JSON.parse(c.produit);
        if (Array.isArray(parsed)) {
          for (const it of parsed) {
            const id = Number(it.menu_id);
            const qty = Math.max(0, Math.floor(Number(it.qty) || 0));
            if (!id || qty <= 0) continue;
            itemsSold.set(id, (itemsSold.get(id) || 0) + qty);
          }
        }
      } catch (e) {
        // ignore non-JSON produit (legacy format)
      }
    }
  }

  // convert itemsSold map to array for JSON
  const items = [];
  for (const [id, qty] of itemsSold.entries()) {
    const menu = menus.get(id);
    items.push({ menu_id: id, name: menu ? menu.name : null, qty });
  }

  // convert ordersByDayMap and revenueByDayMap to arrays ordered by date
  const orders_by_day = Array.from(ordersByDayMap.entries()).map(([date, count]) => ({ date, count }));
  const revenue_by_day = Array.from(revenueByDayMap.entries()).map(([date, cents]) => ({ date, cents }));

  res.json({ totalOrders, byStatus, last30, itemsSold: items, total_revenue_cents: totalRevenueCents, orders_by_day, revenue_by_day });
}));

module.exports = router;

