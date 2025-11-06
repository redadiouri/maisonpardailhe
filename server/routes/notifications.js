const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const emailer = require('../utils/email');
const logger = require('../logger');

const DATA_DIR = path.join(__dirname, '..', 'data');
const NOTIF_FILE = path.join(DATA_DIR, 'notifications.json');

async function ensureDataDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch (e) { }
}

async function loadNotifications() {
  try {
    const raw = await fs.readFile(NOTIF_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

async function saveNotifications(list) {
  await ensureDataDir();
  await fs.writeFile(NOTIF_FILE, JSON.stringify(list, null, 2), 'utf8');
}

router.post('/', async (req, res, next) => {
  try {
    const { fullname, email, subject, message } = req.body || {};
    if (!fullname || !email || !message) return res.status(400).json({ message: 'fullname, email and message are required' });

    const list = await loadNotifications();
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
    const created_at = new Date().toISOString();
    const notif = { id, fullname, email, subject: subject || '', message, created_at, read: false };
    list.unshift(notif);
    await saveNotifications(list);

        const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || process.env.FROM_ADDRESS || null;
    let emailResult = null;
    if (!adminTo) {
      logger.warn('No admin email configured for notifications (set ADMIN_NOTIFICATION_EMAIL or FROM_ADDRESS)');
    } else {
      const html = `<p>Nouveau message de contact</p><ul><li><strong>Nom:</strong> ${escapeHtml(fullname)}</li><li><strong>Email:</strong> ${escapeHtml(email)}</li><li><strong>Objet:</strong> ${escapeHtml(subject || '')}</li></ul><p>${escapeHtml(message)}</p>`;
      const text = `Nouveau message de contact\nNom: ${fullname}\nEmail: ${email}\nObjet: ${subject || ''}\n---\n${message}`;
      try {
                emailResult = await emailer.sendMail({ to: adminTo, subject: `Contact: ${subject || 'Nouveau message'}`, html, text });
        if (emailResult && emailResult.previewUrl) {
          logger.info({ previewUrl: emailResult.previewUrl }, 'Notification email sent (preview available)');
        } else if (emailResult && emailResult.ok) {
          logger.info('Notification email sent');
        } else {
          logger.warn({ reason: emailResult && emailResult.reason }, 'Notification email not sent');
        }
      } catch (e) {
        logger.warn({ err: e && e.message }, 'Error sending notification email');
      }
    }

    const resp = { ok: true, id };
    if (emailResult) resp.email = { ok: !!emailResult.ok, previewUrl: emailResult.previewUrl || null, reason: emailResult.reason || null };
    res.status(201).json(resp);
  } catch (e) { next(e); }
});

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

module.exports = router;
