const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Commande = require('../models/commande');
const { sendCommandeEmail } = require('../utils/email');
const db = require('../models/db');
const Menu = require('../models/menu');

// Validation simple améliorée
function parseDateString(s) {
  if (!s) return null;
  // Accept ISO YYYY-MM-DD
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (isoMatch) {
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  // Accept French DD/MM/YYYY
  const frMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (frMatch) {
    const day = Number(frMatch[1]);
    const month = Number(frMatch[2]) - 1;
    const year = Number(frMatch[3]);
    const d = new Date(year, month, day);
    d.setHours(0,0,0,0);
    return (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) ? d : null;
  }
  return null;
}

function toMinutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function roundUpToSlotMinutes(now = new Date(), step = 15) {
  const minutes = now.getMinutes();
  const rem = minutes % step;
  const add = rem === 0 ? 0 : (step - rem);
  const d = new Date(now.getTime() + add * 60 * 1000);
  d.setSeconds(0,0);
  return d;
}

function validateCommande(data) {
  if (!data) return { ok: false, error: 'Aucune donnée fournie.' };
  const requiredFields = ['nom_complet', 'telephone', 'produit', 'date_retrait', 'creneau', 'email', 'location'];
  for (const f of requiredFields) {
    if (!data[f] || String(data[f]).trim() === '') return { ok: false, error: `Champ manquant: ${f}` };
  }
  // email
  const emailRe = /^\S+@\S+\.\S+$/;
  if (!emailRe.test(String(data.email))) return { ok: false, error: 'Email invalide.' };

  // parse date (accept ISO or dd/mm/YYYY)
  const date = parseDateString(String(data.date_retrait));
  if (!date) return { ok: false, error: 'Date invalide. Utilisez YYYY-MM-DD ou JJ/MM/AAAA.' };

  // date not in the past and within 30 days
  const today = new Date();
  today.setHours(0,0,0,0);
  const max = new Date();
  max.setDate(max.getDate() + 30);
  max.setHours(23,59,59,999);
  if (date < today) return { ok: false, error: "La date ne peut pas être antérieure à aujourd'hui." };
  if (date > max) return { ok: false, error: 'La date est trop éloignée (max 30 jours).' };

  // location and allowed time windows
  const locationSettings = {
    roquettes: { min: '08:30', max: '19:30' },
    toulouse: { min: '07:00', max: '13:30' },
  };
  const location = String(data.location);
  if (!locationSettings[location]) return { ok: false, error: 'Lieu de retrait invalide.' };
  const locMin = locationSettings[location].min;
  const locMax = locationSettings[location].max;

  // time format and step
  if (!/^\d{2}:\d{2}$/.test(String(data.creneau))) return { ok: false, error: 'Format du créneau invalide (hh:mm).' };
  const [hh, mm] = String(data.creneau).split(':').map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return { ok: false, error: 'Créneau horaire invalide.' };
  // enforce 15-min step
  if (mm % 15 !== 0) return { ok: false, error: 'Le créneau doit être un multiple de 15 minutes.' };

  // ensure within location window
  const cMinutes = toMinutes(data.creneau);
  const minM = toMinutes(locMin);
  const maxM = toMinutes(locMax);
  if (cMinutes === null || cMinutes < minM || cMinutes > maxM) return { ok: false, error: 'Le créneau choisi n\'est pas disponible pour le lieu.' };

  // if date is today, ensure time is not in the past relative to now rounded up
  const now = new Date();
  const dateIsToday = (function(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); })(date, today);
  if (dateIsToday) {
    const rounded = roundUpToSlotMinutes(now, 15);
    const roundedMinutes = rounded.getHours() * 60 + rounded.getMinutes();
    if (cMinutes < roundedMinutes) return { ok: false, error: 'Le créneau doit être ultérieur à l\'heure actuelle.' };
  }

  return { ok: true };
}

// Validation middleware for commandes (basic + sanitization)
const validateCommandeFields = [
  body('nom_complet').isString().trim().isLength({ min: 1 }).escape(),
  body('telephone').isString().trim().isLength({ min: 6 }).escape(),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('date_retrait').isString().trim(),
  body('creneau').matches(/^\d{2}:\d{2}$/),
  body('location').isString().trim().escape(),
  // optional precisions: sanitize text
  body('precisions').optional({ nullable: true }).trim().escape(),
  // items array validation (if present)
  body('items').optional().isArray(),
  body('items.*.menu_id').optional().isInt({ gt: 0 }),
  body('items.*.qty').optional().isInt({ gt: 0 })
];

router.post('/', validateCommandeFields, async (req, res) => {
  const valErr = validationResult(req);
  if (!valErr.isEmpty()) return res.status(400).json({ errors: valErr.array() });
  const data = req.body;
  // If items are provided as [{menu_id, qty}], perform transactional stock checks and decrement
  if (Array.isArray(data.items) && data.items.length > 0) {
    // validate basic customer fields
    const v = validateCommande(data);
    if (!v.ok) return res.status(400).json({ message: v.error || 'Données invalides.' });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      // lock each menu row and check stock
      let totalCents = 0; // accumulate total price
      for (const it of data.items) {
        const menuId = Number(it.menu_id);
        const qty = Math.floor(Number(it.qty) || 0);
        if (!menuId || qty <= 0) {
          await conn.rollback();
          return res.status(400).json({ message: 'Item invalide.' });
        }
        const [rows] = await conn.execute('SELECT stock, price_cents FROM menus WHERE id = ? FOR UPDATE', [menuId]);
        const row = rows[0];
        if (!row) {
          await conn.rollback();
          return res.status(404).json({ message: 'Menu introuvable', menu_id: menuId });
        }
        if (row.stock < qty) {
          await conn.rollback();
          return res.status(409).json({ message: 'Stock insuffisant', menu_id: menuId, available: row.stock });
        }
        // decrement
        const newStock = row.stock - qty;
        await conn.execute('UPDATE menus SET stock = ? WHERE id = ?', [newStock, menuId]);
        // add to total
        totalCents += row.price_cents * qty;
      }

      // All stock decremented successfully — create a commande record. Store produit as JSON string for traceability
      const produit = JSON.stringify(data.items);
      const id = await (async () => {
        const [result] = await conn.execute(
          `INSERT INTO commandes (nom_complet, telephone, email, produit, date_retrait, creneau, location, precisions, statut, total_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', ?)`,
          [data.nom_complet, data.telephone, data.email || '', produit, data.date_retrait, data.creneau, data.location || 'roquettes', data.precisions, totalCents]
        );
        return result.insertId;
      })();

      await conn.commit();
      // Fire-and-forget: notify customer that the order was received (en_attente)
      (async () => {
        try {
          const commande = await Commande.getById(id);
          if (commande) await sendCommandeEmail('creation', commande);
        } catch (e) {
          const logger = require('../logger');
          logger.error('Failed to send creation email for commande %s: %o', id, e && (e.stack || e));
        }
      })();
      res.status(201).json({ id, total_cents: totalCents });
    } catch (err) {
      try { await conn.rollback(); } catch (e) {}
      res.status(500).json({ message: 'Erreur serveur.' });
    } finally {
      conn.release();
    }
    return;
  }

  // Backwards-compatible single-product behaviour
  const v = validateCommande(data);
  if (!v.ok) return res.status(400).json({ message: v.error || 'Données invalides.' });
  try {
    const id = await Commande.create(data);
    // Send creation confirmation email (non-blocking)
    (async () => {
      try {
        const commande = await Commande.getById(id);
        if (commande) await sendCommandeEmail('creation', commande);
      } catch (e) {
        const logger = require('../logger');
        logger.error('Failed to send creation email for commande %s: %o', id, e && (e.stack || e));
      }
    })();
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
