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
// Use a persistent MySQL-backed session store instead of the default memory store.
// express-mysql-session is lighter to run locally when Redis isn't available.
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const helmet = require('helmet');
const csurf = require('csurf');
const bodyParser = require('body-parser');
const app = express();

const path = require('path');

// Helper to partially mask secrets for logs
const mask = (v) => {
  if (!v) return '(empty)';
  if (v.length <= 6) return '******';
  return v.slice(0, 3) + '…' + v.slice(-3);
};

// Security headers
// Configure a strict Content Security Policy but allow the CDN used for
// admin dashboard assets (Chart.js). The public site remains restricted to
// self-hosted scripts by default.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
  // Allow loading styles from the CDN used for flatpickr. Keep 'unsafe-inline'
  // to support inline styles used by some components (kept from previous config).
  styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
  // Some browsers report violations against 'style-src-elem' when it is not
  // explicitly set; define it as well to include the CDN so <link> elements
  // can load external stylesheets like flatpickr.min.css.
  "styleSrcElem": ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
  // Allow connecting to the CDN used by the admin dashboard (Chart.js source maps)
  connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

// CORS: in production restrict origins via PROD_ALLOWED_ORIGINS env (comma-separated).
// In development allow common localhost origins for convenience.
const allowedOrigins = (process.env.NODE_ENV === 'production' && process.env.PROD_ALLOWED_ORIGINS)
  ? process.env.PROD_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (e.g., curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));

app.use(bodyParser.json());
// Ensure a session secret exists; use a development fallback if not set.
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-this';
if (!process.env.SESSION_SECRET) {
  logger.warn('Warning: SESSION_SECRET not set in .env — using fallback. Set SESSION_SECRET for production.');
}
// When running behind a proxy (Heroku / any reverse proxy) and using secure cookies,
// enable trust proxy so Express knows the connection is secure.
if (process.env.NODE_ENV === 'production') {
  // trust first proxy
  app.set('trust proxy', 1);
}

// Configure MySQL-backed session store (express-mysql-session)
const sessionStoreOptions = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Optional: automatically create sessions table if missing
  createDatabaseTable: true
};
// Create a mysql2 callback-style pool for the session store and assign the store
// inline so options are colocated with the session middleware.
const mysql2 = require('mysql2/promise');
const sessionConnection = mysql2.createPool({
  host: sessionStoreOptions.host,
  port: sessionStoreOptions.port,
  user: sessionStoreOptions.user,
  password: sessionStoreOptions.password,
  database: sessionStoreOptions.database,
  connectionLimit: 5
});

// express-mysql-session expects an object whose `query` method returns a Promise.
// The mysql2 promise pool exposes `query` that returns a Promise, but to be explicit
// create a small adapter exposing the required `query` function.
const sessionPoolForStore = {
  query: (...args) => sessionConnection.query(...args)
};

app.use(session({
  key: 'mp.sid',
  secret: SESSION_SECRET,
  store: new MySQLStore(sessionStoreOptions, sessionPoolForStore),
  resave: false,
  saveUninitialized: false,
  // Refresh session expiration on every response to keep active sessions alive
  // and mitigate risk from stolen cookies by limiting the window of validity.
  rolling: true,
  cookie: {
    secure: (process.env.NODE_ENV === 'production'), // only send cookie over HTTPS in prod
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// CSRF protection: use csurf with sessions (not cookie mode here).
// We mount CSRF protection on /api routes so state-changing requests require a valid token.
const csrfProtection = csurf();
// Mount csurf for the /api subtree so req.csrfToken() is available for GET and
// non-safe methods are automatically validated. This ensures the csrf-token
// endpoint can generate a token for client-side apps.
app.use('/api', csrfProtection);

// Expose an endpoint to fetch CSRF token for client-side apps that use fetch + credentials
app.get('/api/csrf-token', (req, res) => {
  try {
    res.json({ csrfToken: req.csrfToken() });
  } catch (e) {
    res.status(500).json({ message: 'CSRF token unavailable' });
  }
});


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

// Route handlers are required lazily when running the server to avoid heavy
// module initialization during tests (which may otherwise import DB-heavy code).

// Global error handler to avoid crashing on DB errors and to return 500
app.use((err, req, res, next) => {
  // Handle CSRF errors specifically
  if (err && err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed: %o', err && (err.message || err));
    if (!res.headersSent) return res.status(403).json({ message: 'Invalid CSRF token' });
  }
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

if (require.main === module) {
  // Only wire heavy routes and perform DB checks when running as the main process.
  const commandesRoutes = require('./routes/commandes');
  const adminRoutes = require('./routes/admin');
  const menusRoutes = require('./routes/menus');
  const adminMenusRoutes = require('./routes/admin_menus');
  const unsubscribeRoutes = require('./routes/unsubscribe');
  const schedulesRoutes = require('./routes/schedules');

  app.use('/api/commandes', commandesRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/menus', menusRoutes);
  app.use('/api/admin/menus', adminMenusRoutes);
  app.use('/unsubscribe', unsubscribeRoutes);
  app.use('/api/schedules', schedulesRoutes);

  logStartupInfo();
  checkDatabase().catch((e) => logger.error('DB check unexpected error: %o', e && (e.stack || e)));

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
} else {
  // when required as a module in tests or by other scripts, export the app without
  // initializing routes that may have heavy side-effects (DB connections, etc.).
  module.exports = app;
}
