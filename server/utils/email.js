const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../logger');
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
  if (type === 'acceptation') {
    subject = 'Votre commande Maison Pardailhé est acceptée';
    html = `<p>Bonjour ${commande.nom_complet},<br>Votre commande du ${commande.date_retrait} a été acceptée.<br>Merci !</p><p><small>Pour ne plus recevoir d'emails: <a href="${unsubscribeUrl}">se désabonner</a></small></p>`;
    text = `Bonjour ${commande.nom_complet},\nVotre commande du ${commande.date_retrait} a été acceptée.\nSe désabonner: ${unsubscribeUrl}`;
  } else if (type === 'refus') {
    subject = 'Votre commande Maison Pardailhé a été refusée';
    html = `<p>Bonjour ${commande.nom_complet},<br>Votre commande du ${commande.date_retrait} a été refusée.<br>Raison : ${extra.raison || ''}</p><p><small>Pour ne plus recevoir d'emails: <a href="${unsubscribeUrl}">se désabonner</a></small></p>`;
    text = `Bonjour ${commande.nom_complet},\nVotre commande du ${commande.date_retrait} a été refusée.\nRaison: ${extra.raison || ''}\nSe désabonner: ${unsubscribeUrl}`;
  }

  // Do not include the recipient email in logs except masked/hash
  return sendMail({ to, subject, html, text });
}

module.exports = { sendMail, sendCommandeEmail, signToken, verifyToken, addUnsubscribe, isUnsubscribed };
