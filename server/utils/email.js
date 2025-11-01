const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../logger');
const Menu = require('../models/menu');
let nodemailer;
try { nodemailer = require('nodemailer'); } catch (e) { nodemailer = null; }

const DATA_DIR = path.join(__dirname, '..', 'data');
const UNSUB_FILE = path.join(DATA_DIR, 'unsubscribes.json');

// Ensure data dir exists (best-effort)
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function maskEmail(e) {
  if (!e) return '';
  const parts = String(e).split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  const visible = name.length > 1 ? name[0] + '***' : '*';
  return `${visible}@${domain}`;
}

function hashEmail(e) {
  return crypto.createHash('sha256').update(String(e).toLowerCase()).digest('hex');
}

async function loadUnsubscribes() {
  try {
    const raw = await fs.readFile(UNSUB_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

async function saveUnsubscribes(list) {
  await ensureDataDir();
  await fs.writeFile(UNSUB_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function getEmailSecret() {
  return process.env.EMAIL_SECRET || process.env.SESSION_SECRET || 'dev-email-secret';
}

function signToken(email) {
  const secret = getEmailSecret();
  const b = Buffer.from(String(email).toLowerCase(), 'utf8').toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(b).digest('base64url');
  return `${b}.${mac}`;
}

function verifyToken(token) {
  try {
    const [b, mac] = String(token).split('.');
    if (!b || !mac) return null;
    const secret = getEmailSecret();
    const expected = crypto.createHmac('sha256', secret).update(b).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
    const email = Buffer.from(b, 'base64url').toString('utf8');
    return email;
  } catch (e) { return null; }
}

// Build nodemailer transporter from env vars. Supports SMTP config.
function createTransporter() {
  if (!nodemailer) return null;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false' }
  });
}

// Initially create transporter if SMTP configured. Otherwise we'll lazily create
// a test transporter in development when sending the first email.
let transporter = createTransporter();

async function isUnsubscribed(email) {
  const list = await loadUnsubscribes();
  const h = hashEmail(email);
  return list.includes(h);
}

async function addUnsubscribe(email) {
  const list = await loadUnsubscribes();
  const h = hashEmail(email);
  if (!list.includes(h)) {
    list.push(h);
    await saveUnsubscribes(list);
  }
}

// Send email with retries and safe logging. Do not log recipient in clear.
async function sendMail({ to, subject, html, text, from } = {}, opts = {}) {
  const maxRetries = opts.retries === undefined ? 3 : Number(opts.retries);
  const baseDelay = opts.baseDelay || 500; // ms

  if (!to) throw new Error('Missing recipient');

  // If no transporter configured but we're in development and nodemailer is
  // available, create an Ethereal test account so devs can preview messages.
  if (!transporter) {
    if (nodemailer && process.env.NODE_ENV !== 'production') {
      try {
        const testAcct = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: testAcct.smtp.host,
          port: testAcct.smtp.port,
          secure: testAcct.smtp.secure,
          auth: { user: testAcct.user, pass: testAcct.pass }
        });
        logger.info({ toMasked: maskEmail(to), testUser: testAcct.user }, 'Using Ethereal test account for dev (emails will be previewable)');
      } catch (e) {
        logger.warn({ toMasked: maskEmail(to) }, 'SMTP not configured and unable to create test account - email not sent');
        return { ok: false, reason: 'SMTP not configured' };
      }
    } else {
      logger.warn({ toMasked: maskEmail(to) }, 'SMTP not configured - email not sent');
      return { ok: false, reason: 'SMTP not configured' };
    }
  }

  if (await isUnsubscribed(to)) {
    logger.info({ toMasked: maskEmail(to) }, 'Recipient unsubscribed - skipping email');
    return { ok: false, reason: 'unsubscribed' };
  }

  const mailOptions = {
    from: from || process.env.FROM_ADDRESS || `Maison Pardailhé <no-reply@${process.env.DOMAIN || 'localhost'}>`,
    to,
    subject,
    html,
    text
  };

  let attempt = 0;
  let lastErr = null;
  const masked = maskEmail(to);
  const hashed = hashEmail(to);

  while (attempt <= maxRetries) {
    try {
      attempt += 1;
      logger.info({ toMasked: masked, toHash: hashed, attempt }, 'Sending email (attempt)');
      const res = await transporter.sendMail(mailOptions);
      // If nodemailer test transport was used, provide preview URL
      let previewUrl = null;
      try {
        if (nodemailer && typeof nodemailer.getTestMessageUrl === 'function') {
          previewUrl = nodemailer.getTestMessageUrl(res) || null;
        }
      } catch (e) {
        previewUrl = null;
      }
      logger.info({ toMasked: masked, toHash: hashed, messageId: res.messageId, previewUrl }, 'Email sent');
      return { ok: true, result: res, previewUrl };
    } catch (err) {
      lastErr = err;
      logger.warn({ toMasked: masked, toHash: hashed, attempt, err: err && err.message }, 'Email send failed');
      if (attempt > maxRetries) break;
      // exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  logger.error({ toMasked: masked, toHash: hashed, err: lastErr && lastErr.message }, 'Email failed after retries');
  return { ok: false, reason: lastErr && lastErr.message };
}

// High-level helpers for types of messages
async function sendCommandeEmail(type, commande, extra = {}) {
  const to = commande.email || commande.telephone /* fallback */;
  if (!to) {
    logger.warn({ orderId: commande && commande.id }, 'No recipient for commande email');
    return { ok: false, reason: 'no-recipient' };
  }

  // Unsubscribe link
  const token = signToken(to);
  const unsubscribeUrl = `${process.env.APP_URL || 'http://localhost:3001'}/unsubscribe?token=${encodeURIComponent(token)}`;

  let subject, html, text;
  // helper: format cents to euros
  const fmt = (cents) => {
    if (cents === undefined || cents === null) return '';
    return (Number(cents) / 100).toFixed(2).replace('.', ',') + ' €';
  };

  // Try to parse produit (may be JSON array or legacy string)
  let items = [];
  try {
    const parsed = JSON.parse(commande.produit || '[]');
    if (Array.isArray(parsed)) items = parsed;
  } catch (e) {
    items = [];
  }

  // Bulk preload menu info to avoid one SELECT per item
  let itemsHtml = '';
  let computedTotal = null;
  if (items.length > 0) {
    const ids = items.map(it => Number(it.menu_id)).filter(n => !Number.isNaN(n) && n > 0);
    const menuMap = await Menu.getByIds(ids);
    itemsHtml = '<table style="border-collapse:collapse;width:100%"><thead><tr><th align="left">Produit</th><th align="right">Qté</th><th align="right">Prix</th></tr></thead><tbody>';
    let total = 0;
    for (const it of items) {
      const menuId = Number(it.menu_id);
      const qty = Number(it.qty || 0);
      const m = menuMap[menuId] || null;
      const name = it.name || (m ? m.name : ('#' + menuId));
      const priceCents = (it.price_cents !== undefined && it.price_cents !== null) ? Number(it.price_cents) : (m ? Number(m.price_cents || 0) : null);
      const priceDisplay = priceCents ? fmt(priceCents) : '';
      itemsHtml += `<tr><td>${escapeHtml(String(name))}</td><td align="right">${qty}</td><td align="right">${priceDisplay}</td></tr>`;
      if (priceCents) total += Number(priceCents || 0) * qty;
    }
    itemsHtml += `</tbody></table>`;
    computedTotal = total;
  }

  // Build a tracking/summary link for the customer
  const orderUrl = `${process.env.APP_URL || 'http://localhost:3001'}/commande/${commande.id || ''}`;

  if (type === 'creation') {
    // try to load HTML template
    subject = 'Confirmation de votre commande — Maison Pardailhé';
    try {
      const tpl = await fs.readFile(path.join(__dirname, '..', 'email_templates', 'creation.html'), 'utf8');
      html = tpl.replace(/{{customerName}}/g, escapeHtml(commande.nom_complet || ''))
                .replace(/{{date_retrait}}/g, escapeHtml(commande.date_retrait || ''))
                .replace(/{{creneau}}/g, escapeHtml(commande.creneau || ''))
                .replace(/{{location}}/g, escapeHtml(commande.location || ''))
                .replace(/{{orderUrl}}/g, orderUrl)
                .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl)
                .replace(/{{itemsHtml}}/g, itemsHtml || '')
                .replace(/{{total}}/g, fmt(commande.total_cents || computedTotal) || '');
    } catch (e) {
      html = `<p>Bonjour ${escapeHtml(commande.nom_complet || '')},</p><p>Nous avons bien reçu votre commande pour le ${escapeHtml(commande.date_retrait || '')} à ${escapeHtml(commande.creneau || '')} (${escapeHtml(commande.location || '')}).</p>`;
      if (itemsHtml) html += `<h4>Détails de la commande</h4>${itemsHtml}`;
      if (commande.total_cents || computedTotal) html += `<p><strong>Total:</strong> ${fmt(commande.total_cents || computedTotal)}</p>`;
      html += `<p>Vous pouvez consulter votre commande ici: <a href="${orderUrl}">${orderUrl}</a></p>`;
      html += `<p><small>Pour ne plus recevoir d'emails: <a href="${unsubscribeUrl}">se désabonner</a></small></p>`;
    }
    text = `Bonjour ${commande.nom_complet || ''}\nNous avons reçu votre commande pour le ${commande.date_retrait || ''} à ${commande.creneau || ''} (${commande.location || ''}).\nConsulter: ${orderUrl}\nSe désabonner: ${unsubscribeUrl}`;
  } else if (type === 'acceptation') {
    subject = 'Votre commande Maison Pardailhé est en traitement';
    try {
      const tpl = await fs.readFile(path.join(__dirname, '..', 'email_templates', 'acceptation.html'), 'utf8');
      html = tpl.replace(/{{customerName}}/g, escapeHtml(commande.nom_complet || ''))
                .replace(/{{date_retrait}}/g, escapeHtml(commande.date_retrait || ''))
                .replace(/{{creneau}}/g, escapeHtml(commande.creneau || ''))
                .replace(/{{orderUrl}}/g, orderUrl)
                .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl)
                .replace(/{{itemsHtml}}/g, itemsHtml || '')
                .replace(/{{total}}/g, fmt(commande.total_cents || computedTotal) || '');
    } catch (e) {
      html = `<p>Bonjour ${escapeHtml(commande.nom_complet || '')},</p><p>Bonne nouvelle — votre commande prévue le ${escapeHtml(commande.date_retrait || '')} à ${escapeHtml(commande.creneau || '')} est maintenant en traitement.</p>`;
      if (itemsHtml) html += `<h4>Détails de la commande</h4>${itemsHtml}`;
      if (commande.total_cents || computedTotal) html += `<p><strong>Total:</strong> ${fmt(commande.total_cents || computedTotal)}</p>`;
      html += `<p>Suivre votre commande: <a href="${orderUrl}">${orderUrl}</a></p>`;
      html += `<p>Merci pour votre commande — à bientôt !</p><p><small>Pour ne plus recevoir d'emails: <a href="${unsubscribeUrl}">se désabonner</a></small></p>`;
    }
    text = `Bonjour ${commande.nom_complet || ''}\nVotre commande du ${commande.date_retrait || ''} est en traitement. Consulter: ${orderUrl}\nSe désabonner: ${unsubscribeUrl}`;
  } else if (type === 'refus') {
    subject = 'Votre commande Maison Pardailhé a été refusée';
    try {
      const tpl = await fs.readFile(path.join(__dirname, '..', 'email_templates', 'refus.html'), 'utf8');
      html = tpl.replace(/{{customerName}}/g, escapeHtml(commande.nom_complet || ''))
                .replace(/{{date_retrait}}/g, escapeHtml(commande.date_retrait || ''))
                .replace(/{{reason}}/g, escapeHtml(extra.raison || ''))
                .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);
    } catch (e) {
      subject = 'Votre commande Maison Pardailhé a été refusée';
      html = `<p>Bonjour ${escapeHtml(commande.nom_complet || '')},</p><p>Malheureusement, votre commande prévue le ${escapeHtml(commande.date_retrait || '')} a été refusée.</p><p>Raison : ${escapeHtml(extra.raison || '')}</p><p><small>Pour ne plus recevoir d'emails: <a href="${unsubscribeUrl}">se désabonner</a></small></p>`;
    }
    text = `Bonjour ${commande.nom_complet || ''}\nVotre commande du ${commande.date_retrait || ''} a été refusée.\nRaison: ${extra.raison || ''}\nSe désabonner: ${unsubscribeUrl}`;
  }

  // Do not include the recipient email in logs except masked/hash
  return sendMail({ to, subject, html, text });
}

module.exports = { sendMail, sendCommandeEmail, signToken, verifyToken, addUnsubscribe, isUnsubscribed };

// small helper to escape HTML content used in templates
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
