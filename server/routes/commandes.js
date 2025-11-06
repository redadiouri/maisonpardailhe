const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Commande = require('../models/commande');
const { sendCommandeEmail } = require('../utils/email');
const db = require('../models/db');
const { normalizeToYMD, formatForDisplay, TZ } = require('../utils/dates');

function parseDateString(s) {
  if (!s) return null;
  const ymd = normalizeToYMD(String(s));
  if (!ymd) return null;
  const parts = ymd.split('-').map(Number);
  const d = new Date(parts[0], parts[1]-1, parts[2]);
  d.setHours(0,0,0,0);
  return d;
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
    const emailRe = /^\S+@\S+\.\S+$/;
  if (!emailRe.test(String(data.email))) return { ok: false, error: 'Email invalide.' };

    const date = parseDateString(String(data.date_retrait));
  if (!date) return { ok: false, error: 'Date invalide. Utilisez YYYY-MM-DD ou JJ/MM/AAAA.' };

    const today = new Date();
  today.setHours(0,0,0,0);
  const max = new Date();
  max.setDate(max.getDate() + 30);
  max.setHours(23,59,59,999);
  if (date < today) return { ok: false, error: "La date ne peut pas être antérieure à aujourd'hui." };
  if (date > max) return { ok: false, error: 'La date est trop éloignée (max 30 jours).' };

    const locationSettings = require('../data/schedules');
  const location = String(data.location);
  if (!locationSettings[location]) return { ok: false, error: 'Lieu de retrait invalide.' };
  const locMin = locationSettings[location].min;
  const locMax = locationSettings[location].max;

    if (!/^\d{2}:\d{2}$/.test(String(data.creneau))) return { ok: false, error: 'Format du créneau invalide (hh:mm).' };
  const [hh, mm] = String(data.creneau).split(':').map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return { ok: false, error: 'Créneau horaire invalide.' };
    if (mm % 15 !== 0) return { ok: false, error: 'Le créneau doit être un multiple de 15 minutes.' };

      const cMinutes = toMinutes(data.creneau);
  const wk = date.getDay();
  const rangesForDay = (locationSettings[location].ranges && locationSettings[location].ranges[wk]) ? locationSettings[location].ranges[wk] : [];
  const isAllowedInRanges = (ranges) => {
    if (!Array.isArray(ranges) || ranges.length === 0) return false;
    for (const [s,e] of ranges) {
      const sM = toMinutes(s);
      const eM = toMinutes(e);
      if (sM === null || eM === null) continue;
            if (cMinutes >= sM && cMinutes < eM) return true;
    }
    return false;
  };

  if (rangesForDay && rangesForDay.length > 0) {
    if (!isAllowedInRanges(rangesForDay)) return { ok: false, error: 'Le créneau choisi n\'est pas disponible pour le jour et le lieu sélectionnés.' };
  } else {
  const minM = toMinutes(locMin);
  const maxM = toMinutes(locMax);
    if (cMinutes === null || cMinutes < minM || cMinutes >= maxM) return { ok: false, error: 'Le créneau choisi n\'est pas disponible pour le lieu.' };
  }

    const now = new Date();
  const dateIsToday = (function(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); })(date, today);
  if (dateIsToday) {
    const rounded = roundUpToSlotMinutes(now, 15);
    const roundedMinutes = rounded.getHours() * 60 + rounded.getMinutes();
    if (cMinutes < roundedMinutes) return { ok: false, error: 'Le créneau doit être ultérieur à l\'heure actuelle.' };
  }

  return { ok: true };
}

const validateCommandeFields = [
  body('nom_complet').isString().trim().isLength({ min: 1 }).escape(),
  body('telephone').isString().trim().isLength({ min: 6 }).escape(),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('date_retrait').isString().trim(),
  body('creneau').matches(/^\d{2}:\d{2}$/),
  body('location').isString().trim().escape(),
    body('precisions').optional({ nullable: true }).trim().escape(),
    body('items').optional().isArray(),
  body('items.*.menu_id').optional().isInt({ gt: 0 }),
  body('items.*.qty').optional().isInt({ gt: 0 })
];

router.post('/', validateCommandeFields, async (req, res) => {
  const valErr = validationResult(req);
  if (!valErr.isEmpty()) return res.status(400).json({ errors: valErr.array() });
  const data = req.body;
    if (Array.isArray(data.items) && data.items.length > 0) {
        const v = validateCommande(data);
    if (!v.ok) return res.status(400).json({ message: v.error || 'Données invalides.' });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
            let totalCents = 0;       for (const it of data.items) {
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
                const newStock = row.stock - qty;
        await conn.execute('UPDATE menus SET stock = ? WHERE id = ?', [newStock, menuId]);
                totalCents += row.price_cents * qty;
      }

            const produit = JSON.stringify(data.items);
        const dateYMD = normalizeToYMD(data.date_retrait) || data.date_retrait;
        const id = await (async () => {
          const [result] = await conn.execute(
            `INSERT INTO commandes (nom_complet, telephone, email, produit, date_retrait, creneau, location, precisions, statut, total_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', ?)`,
            [data.nom_complet, data.telephone, data.email || '', produit, dateYMD, data.creneau, data.location || 'roquettes', data.precisions, totalCents]
          );
          return result.insertId;
        })();

      await conn.commit();
            (async () => {
        try {
          const commande = await Commande.getById(id);
          if (commande) {
            await sendCommandeEmail('creation', commande);
                        const orderEmitter = require('../utils/eventEmitter');
            orderEmitter.broadcastNewOrder(commande);
          }
        } catch (e) {
          const logger = require('../logger');
          logger.error('Failed to send creation email for commande %s: %o', id, e && (e.stack || e));
        }
      })();
      res.status(201).json({ id, total_cents: totalCents });
    } catch (err) {
      try { await conn.rollback(); } catch (e) {  }
      res.status(500).json({ message: 'Erreur serveur.' });
    } finally {
      conn.release();
    }
    return;
  }

    const v = validateCommande(data);
  if (!v.ok) return res.status(400).json({ message: v.error || 'Données invalides.' });
  try {
    const normalized = Object.assign({}, data, { date_retrait: normalizeToYMD(data.date_retrait) || data.date_retrait });
  const id = await Commande.create(normalized);
        (async () => {
      try {
        const commande = await Commande.getById(id);
        if (commande) {
          await sendCommandeEmail('creation', commande);
                    const orderEmitter = require('../utils/eventEmitter');
          orderEmitter.broadcastNewOrder(commande);
        }
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

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ message: 'ID invalide' });
  try {
    const cmd = await Commande.getById(id);
    if (!cmd) return res.status(404).json({ message: 'Commande introuvable' });
        const out = {
      id: cmd.id,
      nom_complet: cmd.nom_complet,
      telephone: cmd.telephone,
      email: cmd.email,
      produit: cmd.produit,
      date_retrait: cmd.date_retrait,
            date_retrait_display: formatForDisplay(cmd.date_retrait, false),
      datetime_retrait_display: formatForDisplay((cmd.date_retrait && cmd.creneau) ? `${cmd.date_retrait}T${cmd.creneau}:00` : cmd.date_retrait, true),
      creneau: cmd.creneau,
      location: cmd.location,
      precisions: cmd.precisions,
      statut: cmd.statut,
      total_cents: cmd.total_cents || null,
      date_creation: cmd.date_creation || null
    };
    return res.json({ commande: out });
  } catch (err) {
    console.error('Error fetching commande %s: %o', id, err && (err.stack || err));
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.validateCommande = validateCommande;
module.exports = router;
