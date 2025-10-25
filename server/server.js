require('dotenv').config();
const logger = require('./logger');

// --- Startup env verification -------------------------------------------------
// Provide a helpful message at startup listing any missing environment variables
const verifyEnv = () => {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'SESSION_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length === 0) {
    logger.info('Environment check: all required variables are set.');
    return;
  }
  logger.warn('Environment check: missing variables -> %s', missing.join(', '));
  logger.warn('Please copy `server/.env.example` to `server/.env` and fill the values.');
  logger.warn('The server will continue to run, but some functionality (DB, sessions) may fail.');
};
verifyEnv();
// -----------------------------------------------------------------------------
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

const path = require('path');

// Helper to partially mask secrets for logs
const mask = (v) => {
  if (!v) return '(empty)';
  if (v.length <= 6) return '******';
  return v.slice(0, 3) + '…' + v.slice(-3);
};

app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));
app.use(bodyParser.json());
// Ensure a session secret exists; use a development fallback if not set.
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-this';
if (!process.env.SESSION_SECRET) {
  logger.warn('Warning: SESSION_SECRET not set in .env — using fallback. Set SESSION_SECRET for production.');
}
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));


// Sert le site principal en statique sur la racine
// Redirige les requêtes vers /admin vers la page de login (utile si quelqu'un tape /admin)
// Catch-all for any /admin... route (including /admin and anything under /admin/)
// Only redirect when the user requests exactly /admin or /admin/ to avoid looping
app.get(['/admin', '/admin/'], (req, res) => {
  // If admin session exists, go directly to dashboard, otherwise to login
  if (req.session && req.session.admin) {
    return res.redirect(302, '/admin/dashboard.html');
  }
  return res.redirect(302, '/admin/login.html');
});
// Sert le site principal en statique sur la racine
app.use(express.static(path.join(__dirname, '../maisonpardailhe')));
// Sert le dossier admin en statique
app.use('/admin', express.static(path.join(__dirname, '../maisonpardailhe/admin')));

const commandesRoutes = require('./routes/commandes');
const adminRoutes = require('./routes/admin');

app.use('/api/commandes', commandesRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler to avoid crashing on DB errors and to return 500
app.use((err, req, res, next) => {
  logger.error('Unhandled error: %o', err && (err.stack || err));
  if (!res.headersSent) res.status(500).json({ message: 'Internal server error' });
});

// Prevent the process from exiting on unhandled promise rejections during dev
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at: %o reason: %o', promise, reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception: %o', err && (err.stack || err));
});

const PORT = process.env.PORT || 3001;

// Improved startup logging and quick DB health check (non-blocking)
const logStartupInfo = () => {
  logger.info('='.repeat(60));
  logger.info('MaisonPardailhe - server startup');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Port: ${PORT}`);
  logger.info(`Static site root: ${path.join(__dirname, '../maisonpardailhe')}`);
  logger.info(`Admin static root: ${path.join(__dirname, '../maisonpardailhe/admin')}`);
  logger.info(`Admin URL: http://localhost:${PORT}/admin/`);
  logger.info('--- Env variables ---');
  logger.info(`DB_HOST=${process.env.DB_HOST || '(not set)'}`);
  logger.info(`DB_USER=${process.env.DB_USER || '(not set)'}`);
  logger.info(`DB_PASSWORD=${process.env.DB_PASSWORD ? mask(process.env.DB_PASSWORD) : '(empty)'}`);
  logger.info(`DB_NAME=${process.env.DB_NAME || '(not set)'}`);
  logger.info(`SESSION_SECRET=${process.env.SESSION_SECRET ? '[set]' : '[fallback-used]'}`);
  logger.info('='.repeat(60));
};

const checkDatabase = async () => {
  try {
    // require here to avoid importing DB pool before dotenv runs in other contexts
    const pool = require('./models/db');
    await pool.query('SELECT 1');
    logger.info('Database check: OK');
  } catch (err) {
    logger.warn('Database check: FAILED');
    if (err && err.code) logger.warn('DB error code: %s', err.code);
    if (err && err.message) logger.warn('DB message: %s', err.message.split('\n')[0]);
    logger.warn('Tip: verify DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in server/.env (or server/.env.example)');
  }
};

logStartupInfo();
checkDatabase().catch((e) => logger.error('DB check unexpected error: %o', e && (e.stack || e)));

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
