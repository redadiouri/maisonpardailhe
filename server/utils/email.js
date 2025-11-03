const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../logger');
const Menu = require('../models/menu');
let nodemailer;
try { nodemailer = require('nodemailer'); } catch (e) { nodemailer = null; }

const { formatForDisplay } = require('./dates');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UNSUB_FILE = path.join(DATA_DIR, 'unsubscribes.json');

async function ensureDataDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch (e) { /* ignore */ }
}

async function loadUnsubscribes() {
  try {
    await ensureDataDir();
    const raw = await fs.readFile(UNSUB_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

async function saveUnsubscribes(list) {
  await ensureDataDir();
  await fs.writeFile(UNSUB_FILE, JSON.stringify(list || [], null, 2), 'utf8');
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

function hashEmail(e) {
  try { return crypto.createHash('sha256').update(String(e || '')).digest('hex'); } catch (e) { return null; }
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
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false' }
  });
}

let transporter = createTransporter();

async function isUnsubscribed(email) {
  const list = await loadUnsubscribes();
  return list && Array.isArray(list) && list.includes(String(email).toLowerCase());
}

async function addUnsubscribe(email) {
  const e = String(email || '').toLowerCase();
  if (!e) return false;
  const list = await loadUnsubscribes();
  if (!list.includes(e)) {
    list.push(e);
    await saveUnsubscribes(list);
  }
  return true;
}

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

// Send email with a simple implementation: try SMTP transporter, or log in dev
async function sendMail({ to, subject, html, text, from } = {}) {
  const masked = maskEmail(to);
  const hashed = hashEmail(to);
  const mailFrom = from || process.env.EMAIL_FROM || `no-reply@${process.env.APP_HOST || 'localhost'}`;

  const mailOptions = {
    from: mailFrom,
    to,
    subject: subject || '(no subject)',
    text: text || undefined,
    html: html || undefined
  };

  // If no transporter configured but nodemailer is available in dev, create test acct
  if (!transporter && nodemailer && process.env.NODE_ENV !== 'production') {
    try {
      const testAcct = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAcct.smtp.host,
        port: testAcct.smtp.port,
        secure: testAcct.smtp.secure,
        auth: { user: testAcct.user, pass: testAcct.pass }
      });
    } catch (e) {
      logger.warn({ toMasked: masked }, 'nodemailer createTestAccount failed, falling back to console');
    }
  }

  if (!transporter) {
    // Last resort: log the email to console for dev inspection
    logger.info({ toMasked: masked, toHash: hashed }, 'No SMTP transporter - logging email');
    if (html) logger.info({ toMasked: masked }, '\n' + html);
    if (text) logger.info({ toMasked: masked }, '\n' + text);
    return { ok: true, previewUrl: null, logged: true };
  }

  try {
    const res = await transporter.sendMail(mailOptions);
    let previewUrl = null;
    if (nodemailer && typeof nodemailer.getTestMessageUrl === 'function') {
      previewUrl = nodemailer.getTestMessageUrl(res) || null;
    }
    logger.info({ toMasked: masked, toHash: hashed, messageId: res.messageId, previewUrl }, 'Email sent');
    return { ok: true, result: res, previewUrl };
  } catch (err) {
    logger.warn({ toMasked: masked, toHash: hashed, err: err && err.message }, 'Email send failed');
    return { ok: false, reason: err && err.message };
  }
}

// High-level helper to send commande emails (creation/acceptation/refus)
async function sendCommandeEmail(type, commande, extra = {}) {
  const to = commande.email || commande.telephone;
  if (!to) {
    logger.warn({ orderId: commande && commande.id }, 'No recipient for commande email');
    return { ok: false, reason: 'no-recipient' };
  }

  const token = signToken(to);
  const unsubscribeUrl = `${process.env.APP_URL || 'http://localhost:3001'}/unsubscribe?token=${encodeURIComponent(token)}`;

  // helper: format cents to euros
  const fmt = (cents) => {
    if (cents === undefined || cents === null) return '';
    return (Number(cents) / 100).toFixed(2).replace('.', ',') + ' €';
  };

  // Parse items (may be legacy string or JSON array)
  let items = [];
  try { const parsed = JSON.parse(commande.produit || '[]'); if (Array.isArray(parsed)) items = parsed; } catch (e) { items = []; }

  // preload menu info if needed
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

  const baseOrderUrl = `${process.env.APP_URL || 'http://localhost:3001'}/commande.html?id=${commande.id || ''}`;
  const utm = 'src=email&utm_medium=email&utm_campaign=order_confirmation';
  const orderUrl = baseOrderUrl.includes('?') ? `${baseOrderUrl}&${utm}` : `${baseOrderUrl}?${utm}`;
  const orderButtonHtml = `<a href="${orderUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 16px;background:#c24b3f;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Consulter la commande</a>`;

  let subject = '';
  let html = '';
  let text = '';

  const dateDisplay = formatForDisplay(commande.date_retrait || '', false);
  const datetimeDisplay = formatForDisplay((commande.date_retrait && commande.creneau) ? `${commande.date_retrait}T${commande.creneau}:00` : commande.date_retrait, true);

  if (type === 'creation') {
    subject = 'Confirmation de votre commande — Maison Pardailhé';
    try {
      const tpl = await fs.readFile(path.join(__dirname, '..', 'email_templates', 'creation.html'), 'utf8');
      let out = tpl;
      out = out.replace(/{{#if\s+itemsHtml}}([\s\S]*?){{\/if}}/g, itemsHtml || '');
      out = out.replace(/{{{\s*itemsHtml\s*}}}/g, itemsHtml || '');
      out = out.replace(/{{\s*itemsHtml\s*}}/g, itemsHtml || '');
      html = out.replace(/{{customerName}}/g, escapeHtml(commande.nom_complet || ''))
        .replace(/{{date_retrait}}/g, escapeHtml(dateDisplay || ''))
        .replace(/{{creneau}}/g, escapeHtml(commande.creneau || ''))
        .replace(/{{datetime_retrait_display}}/g, escapeHtml(datetimeDisplay || ''))
        .replace(/{{location}}/g, escapeHtml(commande.location || ''))
        .replace(/{{orderButton}}/g, orderButtonHtml)
        .replace(/{{orderUrl}}/g, orderUrl)
        .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl)
        .replace(/{{total}}/g, fmt(commande.total_cents || computedTotal) || '');
    } catch (e) {
      html = `<p>Bonjour ${escapeHtml(commande.nom_complet || '')},</p><p>Nous avons bien reçu votre commande pour le ${escapeHtml(datetimeDisplay || dateDisplay)} (${escapeHtml(commande.location || '')}).</p>`;
      if (itemsHtml) html += `<h4>Détails de la commande</h4>${itemsHtml}`;
      if (commande.total_cents || computedTotal) html += `<p><strong>Total:</strong> ${fmt(commande.total_cents || computedTotal)}</p>`;
      html += `<p>Vous pouvez consulter votre commande ici: ${orderButtonHtml}</p>`;
      html += `<p><small>Pour ne plus recevoir d'emails: <a href="${unsubscribeUrl}">se désabonner</a></small></p>`;
    }
    text = `Bonjour ${commande.nom_complet || ''}\nNous avons reçu votre commande pour le ${datetimeDisplay || dateDisplay} (${commande.location || ''}).\nConsulter: ${orderUrl}\nSe désabonner: ${unsubscribeUrl}`;
  } else if (type === 'acceptation') {
    subject = 'Votre commande Maison Pardailhé est en traitement';
    try {
      const tpl = await fs.readFile(path.join(__dirname, '..', 'email_templates', 'acceptation.html'), 'utf8');
      let out = tpl;
      out = out.replace(/{{#if\s+itemsHtml}}([\s\S]*?){{\/if}}/g, itemsHtml || '');
      out = out.replace(/{{{\s*itemsHtml\s*}}}/g, itemsHtml || '');
      out = out.replace(/{{\s*itemsHtml\s*}}/g, itemsHtml || '');
      html = out.replace(/{{customerName}}/g, escapeHtml(commande.nom_complet || ''))
        .replace(/{{date_retrait}}/g, escapeHtml(dateDisplay || ''))
        .replace(/{{creneau}}/g, escapeHtml(commande.creneau || ''))
        .replace(/{{datetime_retrait_display}}/g, escapeHtml(datetimeDisplay || ''))
        .replace(/{{orderButton}}/g, orderButtonHtml)
        .replace(/{{orderUrl}}/g, orderUrl)
        .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl)
        .replace(/{{total}}/g, fmt(commande.total_cents || computedTotal) || '');
    } catch (e) {
      html = `<p>Bonjour ${escapeHtml(commande.nom_complet || '')},</p><p>Bonne nouvelle — votre commande prévue le ${escapeHtml(datetimeDisplay || dateDisplay)} est maintenant en traitement.</p>`;
      if (itemsHtml) html += `<h4>Détails de la commande</h4>${itemsHtml}`;
      if (commande.total_cents || computedTotal) html += `<p><strong>Total:</strong> ${fmt(commande.total_cents || computedTotal)}</p>`;
      html += `<p>Suivre votre commande: ${orderButtonHtml}</p>`;
      html += `<p>Merci pour votre commande — à bientôt !</p><p><small>Pour ne plus recevoir d'emails: <a href="${unsubscribeUrl}">se désabonner</a></small></p>`;
    }
    text = `Bonjour ${commande.nom_complet || ''}\nVotre commande du ${datetimeDisplay || dateDisplay} est en traitement. Consulter: ${orderUrl}\nSe désabonner: ${unsubscribeUrl}`;
  } else if (type === 'refus') {
    subject = 'Votre commande Maison Pardailhé a été refusée';
    try {
      const tpl = await fs.readFile(path.join(__dirname, '..', 'email_templates', 'refus.html'), 'utf8');
      html = tpl.replace(/{{customerName}}/g, escapeHtml(commande.nom_complet || ''))
        .replace(/{{date_retrait}}/g, escapeHtml(datetimeDisplay || dateDisplay))
        .replace(/{{reason}}/g, escapeHtml(extra.raison || ''))
        .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);
    } catch (e) {
      html = `<p>Bonjour ${escapeHtml(commande.nom_complet || '')},</p><p>Malheureusement, votre commande prévue le ${escapeHtml(datetimeDisplay || dateDisplay)} a été refusée.</p><p>Raison : ${escapeHtml(extra.raison || '')}</p><p><small>Pour ne plus recevoir d'emails: <a href="${unsubscribeUrl}">se désabonner</a></small></p>`;
    }
    text = `Bonjour ${commande.nom_complet || ''}\nVotre commande du ${datetimeDisplay || dateDisplay} a été refusée.\nRaison: ${extra.raison || ''}\nSe désabonner: ${unsubscribeUrl}`;
  }

  return sendMail({ to, subject, html, text });
}

module.exports = { sendMail, sendCommandeEmail, signToken, verifyToken, addUnsubscribe, isUnsubscribed };
