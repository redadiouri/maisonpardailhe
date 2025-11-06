const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const Commande = require('../models/commande');
const EmailUtil = require('../utils/email');
const Admin = require('../models/admin');
const auth = require('../middleware/auth');

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

// SSE endpoint for real-time order updates
router.get('/commandes/stream', auth, (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection success message
  res.write('data: {"type":"connected"}\n\n');

  // Register this client with the order event emitter
  const orderEmitter = require('../utils/eventEmitter');
  orderEmitter.addClient(res);

  // Keep connection alive with heartbeat every 30 seconds
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Clean up when client disconnects
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    orderEmitter.removeClient(res);
  });
});

// Get commandes by statut
router.get('/commandes', auth, wrap(async (req, res) => {
  const { statut } = req.query;
  if (!statut) return res.status(400).json({ message: 'Statut requis.' });
  const commandes = await Commande.getByStatut(statut);
  res.json(commandes);
}));

// List admins (id, username) - protected
router.get('/admins', auth, wrap(async (req, res) => {
  // only primary admin may list admins
  const adminId = req.session?.admin?.id;
  const AdminModel = require('../models/admin');
  const current = await AdminModel.getById(adminId);
  if (!current || String(current.username).toLowerCase() !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const db = require('../models/db');
  const [rows] = await db.query('SELECT id, username, can_edit_menus FROM admins ORDER BY id ASC');
  res.json(rows.map(r => ({ id: r.id, username: r.username, can_edit_menus: r.can_edit_menus ? 1 : 0 })));
}));

// Create a new admin (protected) - body: { username, password }
router.post('/admins', auth, wrap(async (req, res) => {
  const { username, password, can_edit_menus } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password required' });
  if (typeof username !== 'string' || username.length < 3) return res.status(400).json({ message: 'username invalid (min 3 chars)' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'password invalid (min 8 chars)' });
  const db = require('../models/db');
  // only primary admin may create other admins
  const adminId = req.session?.admin?.id;
  const AdminModel = require('../models/admin');
  const current = await AdminModel.getById(adminId);
  if (!current || String(current.username).toLowerCase() !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  // check existing
  const [existing] = await db.query('SELECT id FROM admins WHERE username = ? LIMIT 1', [username]);
  if (existing && existing.length > 0) return res.status(409).json({ message: 'username already exists' });
  const hash = await bcrypt.hash(password, 10);
  const canEdit = (can_edit_menus === undefined) ? 0 : (can_edit_menus ? 1 : 0);
  await db.execute('INSERT INTO admins (username, password_hash, can_edit_menus) VALUES (?, ?, ?)', [username, hash, canEdit]);
  res.status(201).json({ success: true });
}));

// Update admin permissions (protected)
router.put('/admins/:id', auth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const adminId = req.session?.admin?.id;
  if (!adminId) return res.status(401).json({ message: 'Non autorisé.' });

  const { can_edit_menus } = req.body || {};
  if (can_edit_menus === undefined) return res.status(400).json({ message: 'No permissions provided' });

  const AdminModel = require('../models/admin');
  // only primary admin may change admin permissions
  const current = await AdminModel.getById(adminId);
  if (!current || String(current.username).toLowerCase() !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  // prevent changing permissions of the primary admin account
  const target = await AdminModel.getById(id);
  if (target && String(target.username).toLowerCase() === 'admin' && !can_edit_menus) {
    return res.status(400).json({ message: 'Impossible de retirer la permission de modification des menus pour l\'administrateur principal.' });
  }
  const affected = await AdminModel.updatePermissions(id, { can_edit_menus: can_edit_menus ? 1 : 0 });
  res.json({ affected });
}));

// Delete admin (protected)
router.delete('/admins/:id', auth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const adminId = req.session?.admin?.id;
  if (!adminId) return res.status(401).json({ message: 'Non autorisé.' });
  if (adminId === id) return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });

  const AdminModel = require('../models/admin');
  // only primary admin may delete admins
  const current = await AdminModel.getById(adminId);
  if (!current || String(current.username).toLowerCase() !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  // prevent deletion of the primary admin account
  const target = await AdminModel.getById(id);
  if (target && String(target.username).toLowerCase() === 'admin') {
    return res.status(400).json({ message: "Impossible de supprimer l'administrateur principal." });
  }
  const total = await AdminModel.count();
  if (total <= 1) return res.status(400).json({ message: "Impossible de supprimer le dernier administrateur." });

  const affected = await AdminModel.deleteById(id);
  res.json({ affected });
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
  // Send a thank-you email to customer if email is available (fire-and-forget)
  try {
    EmailUtil.sendCommandeEmail('terminee', commande).catch(()=>{});
  } catch (e) { /* ignore email errors */ }
  res.json({ success: true });
}));

// Admin stats: aggregate commandes and items (protected)
router.get('/stats', auth, wrap(async (req, res) => {
  // Enhanced analytics with period filtering and additional metrics
  const db = require('../models/db');
  const Menu = require('../models/menu');
  
  // Get period parameter (default 30 days)
  const period = Math.min(365, Math.max(1, parseInt(req.query.period) || 30));
  
  // load menus into a map for name lookup
  const menus = new Map();
  try {
    const allMenus = await Menu.getAll(false);
    for (const m of allMenus) menus.set(Number(m.id), { name: m.name, price_cents: Number(m.price_cents || 0) });
  } catch (e) {
    // continue even if menus can't be loaded
  }

  const [rows] = await db.query('SELECT id, produit, statut, date_creation, total_cents, nom_complet, telephone, location FROM commandes ORDER BY date_creation DESC');
  
  // Ne compter que les commandes acceptées (en_cours ou terminée)
  const acceptedRows = rows.filter(c => c.statut === 'en_cours' || c.statut === 'terminée');
  
  const totalOrders = acceptedRows.length;
  const byStatus = {};
  let periodOrders = 0;
  let previousPeriodOrders = 0;
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  
  // prepare period days maps (YYYY-MM-DD) -> count/revenue
  const ordersByDayMap = new Map();
  const revenueByDayMap = new Map();
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    ordersByDayMap.set(key, 0);
    revenueByDayMap.set(key, 0);
  }
  
  // Year-over-year comparison maps
  const yoyCurrentMap = new Map();
  const yoyPreviousMap = new Map();
  for (let i = period - 1; i >= 0; i--) {
    const currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    currentDate.setDate(currentDate.getDate() - i);
    const currentKey = currentDate.toISOString().slice(0,10);
    
    const previousDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
    const previousKey = previousDate.toISOString().slice(0,10);
    
    yoyCurrentMap.set(currentKey, { orders: 0, revenue: 0 });
    yoyPreviousMap.set(previousKey, { orders: 0, revenue: 0 });
  }
  
  const itemsSold = new Map();
  const itemsByDay = new Map(); // For product-specific trends
  let totalRevenueCents = 0;
  let periodRevenueCents = 0;
  let previousPeriodRevenueCents = 0;
  const recentOrders = [];
  
  // Location-based stats
  const locationStats = {
    roquettes: { orders: 0, revenue: 0 },
    victor_hugo: { orders: 0, revenue: 0 },
    other: { orders: 0, revenue: 0 }
  };
  
  // Customer stats
  const customerMap = new Map(); // key: nom_complet|telephone

  for (const c of acceptedRows) {
    byStatus[c.statut] = (byStatus[c.statut] || 0) + 1;
    const created = c.date_creation ? new Date(c.date_creation) : null;
    const daysAgo = created ? (now - created) / (1000 * 60 * 60 * 24) : null;
    const orderTotal = Number(c.total_cents || 0);
    
    // Count orders in current period and previous period (for trends)
    if (daysAgo !== null && daysAgo <= period) {
      periodOrders++;
      periodRevenueCents += orderTotal;
    }
    if (daysAgo !== null && daysAgo > period && daysAgo <= period * 2) {
      previousPeriodOrders++;
      previousPeriodRevenueCents += orderTotal;
    }
    
    // Year-over-year tracking
    if (created) {
      const dayKey = new Date(created.getFullYear(), created.getMonth(), created.getDate()).toISOString().slice(0,10);
      if (yoyCurrentMap.has(dayKey)) {
        const entry = yoyCurrentMap.get(dayKey);
        entry.orders++;
        entry.revenue += orderTotal;
      }
      if (yoyPreviousMap.has(dayKey)) {
        const entry = yoyPreviousMap.get(dayKey);
        entry.orders++;
        entry.revenue += orderTotal;
      }
    }
    
    // increment day bucket when within period
    if (created && daysAgo !== null && daysAgo <= period) {
      const dayKey = new Date(created.getFullYear(), created.getMonth(), created.getDate()).toISOString().slice(0,10);
      if (ordersByDayMap.has(dayKey)) ordersByDayMap.set(dayKey, ordersByDayMap.get(dayKey) + 1);
    }
    
    // add total_cents to revenue
    totalRevenueCents += orderTotal;
    if (created && orderTotal > 0 && daysAgo !== null && daysAgo <= period) {
      const dayKey = new Date(created.getFullYear(), created.getMonth(), created.getDate()).toISOString().slice(0,10);
      if (revenueByDayMap.has(dayKey)) revenueByDayMap.set(dayKey, revenueByDayMap.get(dayKey) + orderTotal);
    }
    
    // Location stats (within period)
    if (daysAgo !== null && daysAgo <= period && c.location) {
      const loc = String(c.location).toLowerCase().trim();
      if (loc.includes('roquettes')) {
        locationStats.roquettes.orders++;
        locationStats.roquettes.revenue += orderTotal;
      } else if (loc.includes('victor') || loc.includes('hugo') || loc.includes('toulouse')) {
        locationStats.victor_hugo.orders++;
        locationStats.victor_hugo.revenue += orderTotal;
      } else {
        locationStats.other.orders++;
        locationStats.other.revenue += orderTotal;
      }
    }
    
    // Customer tracking (within period)
    if (daysAgo !== null && daysAgo <= period && c.nom_complet) {
      const customerKey = `${c.nom_complet}|${c.telephone || ''}`;
      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          name: c.nom_complet,
          phone: c.telephone || '',
          orders: 0,
          total_spent: 0,
          order_ids: []
        });
      }
      const customer = customerMap.get(customerKey);
      customer.orders++;
      customer.total_spent += orderTotal;
      customer.order_ids.push(c.id);
    }
    
    // Collect recent orders (last 10 within period)
    if (daysAgo !== null && daysAgo <= period && recentOrders.length < 10) {
      recentOrders.push({
        id: c.id,
        date: created ? created.toISOString().slice(0,10) : null,
        customer: c.nom_complet || 'Inconnu',
        total_cents: orderTotal,
        statut: c.statut
      });
    }
    
    // try parse produit as JSON array for item counts
    if (c.produit && daysAgo !== null && daysAgo <= period) {
      try {
        const parsed = JSON.parse(c.produit);
        if (Array.isArray(parsed)) {
          for (const it of parsed) {
            const id = Number(it.menu_id);
            const qty = Math.max(0, Math.floor(Number(it.qty) || 0));
            if (!id || qty <= 0) continue;
            itemsSold.set(id, (itemsSold.get(id) || 0) + qty);
            
            // Track by day for product trends
            if (created) {
              const dayKey = new Date(created.getFullYear(), created.getMonth(), created.getDate()).toISOString().slice(0,10);
              if (!itemsByDay.has(id)) itemsByDay.set(id, new Map());
              const productDays = itemsByDay.get(id);
              productDays.set(dayKey, (productDays.get(dayKey) || 0) + qty);
            }
          }
        }
      } catch (e) {
        // ignore non-JSON produit (legacy format)
      }
    }
  }

  // Calculate trends (percentage change vs previous period)
  const ordersTrend = previousPeriodOrders > 0 
    ? ((periodOrders - previousPeriodOrders) / previousPeriodOrders * 100).toFixed(1)
    : null;
  const revenueTrend = previousPeriodRevenueCents > 0
    ? ((periodRevenueCents - previousPeriodRevenueCents) / previousPeriodRevenueCents * 100).toFixed(1)
    : null;
  
  // Calculate average basket
  const avgBasketCents = periodOrders > 0 ? Math.round(periodRevenueCents / periodOrders) : 0;
  const previousAvgBasketCents = previousPeriodOrders > 0 ? Math.round(previousPeriodRevenueCents / previousPeriodOrders) : 0;
  const basketTrend = previousAvgBasketCents > 0
    ? ((avgBasketCents - previousAvgBasketCents) / previousAvgBasketCents * 100).toFixed(1)
    : null;

  // Detect significant CA drop (>20% drop is alert-worthy)
  const alerts = [];
  if (revenueTrend && parseFloat(revenueTrend) < -20) {
    alerts.push({
      type: 'warning',
      title: 'Baisse significative du CA',
      message: `Le chiffre d'affaires a chuté de ${Math.abs(parseFloat(revenueTrend))}% par rapport à la période précédente.`
    });
  }
  if (ordersTrend && parseFloat(ordersTrend) < -30) {
    alerts.push({
      type: 'danger',
      title: 'Forte baisse des commandes',
      message: `Le nombre de commandes a baissé de ${Math.abs(parseFloat(ordersTrend))}% par rapport à la période précédente.`
    });
  }

  // convert itemsSold map to sorted array (top sellers first)
  const items = [];
  for (const [id, qty] of itemsSold.entries()) {
    const menu = menus.get(id);
    items.push({ menu_id: id, name: menu ? menu.name : `Menu #${id}`, qty });
  }
  items.sort((a, b) => b.qty - a.qty);

  // Prepare product trends (top 5 products with daily data)
  const productTrends = [];
  const topProducts = items.slice(0, 5);
  for (const product of topProducts) {
    const dayData = itemsByDay.get(product.menu_id);
    if (dayData) {
      const trend = [];
      for (let i = period - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0,0,0,0);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0,10);
        trend.push({ date: key, qty: dayData.get(key) || 0 });
      }
      productTrends.push({
        menu_id: product.menu_id,
        name: product.name,
        trend
      });
    }
  }

  // Customer insights
  const customers = Array.from(customerMap.values());
  customers.sort((a, b) => b.total_spent - a.total_spent);
  const regularCustomers = customers.filter(c => c.orders >= 3); // 3+ orders = regular
  const topCustomers = customers.slice(0, 10);
  
  const customerInsights = {
    total_customers: customers.length,
    regular_customers: regularCustomers.length,
    top_customers: topCustomers.map(c => ({
      name: c.name,
      phone: c.phone,
      orders: c.orders,
      total_spent: c.total_spent,
      avg_basket: c.orders > 0 ? Math.round(c.total_spent / c.orders) : 0
    }))
  };

  // convert ordersByDayMap and revenueByDayMap to arrays ordered by date
  const orders_by_day = Array.from(ordersByDayMap.entries()).map(([date, count]) => ({ date, count }));
  const revenue_by_day = Array.from(revenueByDayMap.entries()).map(([date, cents]) => ({ date, cents }));
  
  // Year-over-year comparison
  const yoy_comparison = {
    current: Array.from(yoyCurrentMap.entries()).map(([date, data]) => ({ date, orders: data.orders, revenue: data.revenue })),
    previous: Array.from(yoyPreviousMap.entries()).map(([date, data]) => ({ date, orders: data.orders, revenue: data.revenue }))
  };

  res.json({ 
    totalOrders, 
    byStatus, 
    periodOrders,
    itemsSold: items,
    total_revenue_cents: totalRevenueCents,
    period_revenue_cents: periodRevenueCents,
    avg_basket_cents: avgBasketCents,
    orders_by_day,
    revenue_by_day,
    recent_orders: recentOrders,
    trends: {
      orders: ordersTrend,
      revenue: revenueTrend,
      basket: basketTrend
    },
    alerts,
    location_stats: locationStats,
    customer_insights: customerInsights,
    product_trends: productTrends,
    yoy_comparison
  });
}));

// Current logged-in admin info
router.get('/me', auth, wrap(async (req, res) => {
  const adminId = req.session?.admin?.id;
  if (!adminId) return res.status(401).json({ message: 'Non autorisé.' });
  const AdminModel = require('../models/admin');
  const admin = await AdminModel.getById(adminId);
  if (!admin) return res.status(404).json({ message: 'Administrateur introuvable.' });
  res.json({ id: admin.id, username: admin.username, can_edit_menus: !!admin.can_edit_menus });
}));

module.exports = router;


