const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const auth = require('../middleware/auth');

const DATA_DIR = path.join(__dirname, '..', 'data');
const NOTIF_FILE = path.join(DATA_DIR, 'notifications.json');

async function loadNotifications() {
  try {
    const raw = await fs.readFile(NOTIF_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

async function saveNotifications(list) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {}
  await fs.writeFile(NOTIF_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// GET /api/admin/notifications - list (protected)
router.get('/', auth, async (req, res, next) => {
  try {
    const list = await loadNotifications();
    res.json(list);
  } catch (e) { next(e); }
});

// PUT /api/admin/notifications/:id/read - mark read
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    const id = req.params.id;
    let list = await loadNotifications();
    let found = false;
    list = list.map(n => {
      if (n.id === id) { found = true; return Object.assign({}, n, { read: true, read_at: new Date().toISOString() }); }
      return n;
    });
    if (!found) return res.status(404).json({ message: 'Not found' });
    await saveNotifications(list);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// DELETE /api/admin/notifications/:id - remove
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const id = req.params.id;
    let list = await loadNotifications();
    const before = list.length;
    list = list.filter(n => n.id !== id);
    if (list.length === before) return res.status(404).json({ message: 'Not found' });
    await saveNotifications(list);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
