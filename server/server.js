require('dotenv').config();
const logger = require('./logger');

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
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const helmet = require('helmet');
const csurf = require('csurf');
const bodyParser = require('body-parser');
const compression = require('compression');
const app = express();

const path = require('path');

const mask = (v) => {
  if (!v) return '(empty)';
  if (v.length <= 6) return '******';
  return v.slice(0, 3) + '…' + v.slice(-3);
};

const crypto = require('crypto');
const { globalLimiter } = require('./middleware/rateLimits');

const generateNonce = () => crypto.randomBytes(16).toString('base64');

app.use((req, res, next) => {
  res.locals.nonce = generateNonce();
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://maps.googleapis.com',
        'https://maps.gstatic.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        (req, res) => `'nonce-${res.locals.nonce}'`
      ],
      styleSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://fonts.googleapis.com',
        'https://cdn.1gsldjv.net',
        'https://*.1gsldjv.net',
        'https://*.jsdelivr.net',
        "'unsafe-inline'"
      ],
      styleSrcElem: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://fonts.googleapis.com',
        'https://cdn.1gsldjv.net',
        'https://*.1gsldjv.net',
        'https://*.jsdelivr.net',
        "'unsafe-inline'"
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https://images.unsplash.com',
        'https://*.googleapis.com',
        'https://maps.googleapis.com',
        'https://maps.gstatic.com',
        'https://*.gstatic.com',
        'https://maps.goopleapis.com',
        'https://r.static.com'
      ],
      connectSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://images.unsplash.com',
        'https://*.googleapis.com',
        'https://maps.googleapis.com',
        'https://www.google-analytics.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://cdn.1gsldjv.net',
        'https://*.gstatic.com',
        'https://xn--maisonpardailh-okb.fr',
        'https://sse.xn--maisonpardailh-okb.fr'
      ],
      frameSrc: [
        "'self'",
        'https://www.google.com',
        'https://maps.google.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.1gsldjv.net',
        'https://*.1gsldjv.net',
        'https://cdn.jsdelivr.net',
        'https://*.jsdelivr.net',
        'data:'
      ],
      manifestSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
}));

let allowedOrigins;
if (process.env.NODE_ENV === 'production') {
  if (process.env.PROD_ALLOWED_ORIGINS) {
    allowedOrigins = process.env.PROD_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  } else if (process.env.APP_URL) {
        allowedOrigins = [process.env.APP_URL];
  } else {
                logger.warn('PROD_ALLOWED_ORIGINS not set in production — allowing all origins. Set PROD_ALLOWED_ORIGINS to restrict CORS.');
    allowedOrigins = null;   }
} else {
  allowedOrigins = ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5500', 'http://127.0.0.1:5500'];
}

// Fichiers publics servis AVANT tout middleware
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Servir les fichiers statiques publics en premier (y compris manifest.json)
app.use(express.static(path.join(__dirname, '../maisonpardailhe'), { 
  maxAge: 0, // Pas de cache pour debug
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }
}));

app.use(cors({
  origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (!allowedOrigins) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));

app.use(compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(globalLimiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-this';
if (!process.env.SESSION_SECRET) {
  logger.warn('Warning: SESSION_SECRET not set in .env — using fallback. Set SESSION_SECRET for production.');
}
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

const sessionStoreOptions = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
    createDatabaseTable: true
};
const mysql2 = require('mysql2/promise');
const sessionConnection = mysql2.createPool({
  host: sessionStoreOptions.host,
  port: sessionStoreOptions.port,
  user: sessionStoreOptions.user,
  password: sessionStoreOptions.password,
  database: sessionStoreOptions.database,
  connectionLimit: 5
});

try {
  process.on('beforeExit', async () => {
    try {
      if (sessionConnection && typeof sessionConnection.end === 'function') {
        await sessionConnection.end();
      }
    } catch (e) {
          }
  });
} catch (e) {
  }

const sessionPoolForStore = {
  query: (...args) => sessionConnection.query(...args)
};

app.use(session({
  key: 'mp.sid',
  secret: SESSION_SECRET,
  store: new MySQLStore(sessionStoreOptions, sessionPoolForStore),
  resave: false,
  saveUninitialized: false,
      rolling: true,
  cookie: {
    secure: (process.env.NODE_ENV === 'production'),     httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60   }
}));

const csrfProtection = csurf();

const csrfMiddleware = (req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/admin/email-templates')) {
    return next();
  }
  return csrfProtection(req, res, next);
};

app.use('/api', csrfMiddleware);

app.get('/api/csrf-token', (req, res) => {
  try {
    res.json({ csrfToken: req.csrfToken() });
  } catch (e) {
    res.status(500).json({ message: 'CSRF token unavailable' });
  }
});

    app.get('/api/config', (req, res) => {
    res.json({
      timezone: process.env.TIMEZONE || 'Europe/Paris',
      appUrl: process.env.APP_URL || `http://localhost:${PORT}`
    });
  });


app.get(['/admin', '/admin/'], (req, res) => {
    if (req.session && req.session.admin) {
    return res.redirect(302, '/admin/dashboard');
  }
  return res.redirect(302, '/admin/login');
});
const oneHour = 1000 * 60 * 60;
const sevenDays = 1000 * 60 * 60 * 24 * 7;
const oneYear = 1000 * 60 * 60 * 24 * 365;
const staticMaxAge = (process.env.NODE_ENV === 'production') ? sevenDays : oneHour;

function setStaticHeaders(res, filePath) {
  if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
  } else if (filePath.endsWith('.json')) {
    res.setHeader('Cache-Control', 'no-cache');
  } else if (filePath.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i)) {
        const imageMaxAge = (process.env.NODE_ENV === 'production') ? oneYear : sevenDays;
    res.setHeader('Cache-Control', `public, max-age=${Math.floor(imageMaxAge/1000)}, immutable`);
  } else {
        res.setHeader('Cache-Control', `public, max-age=${Math.floor(staticMaxAge/1000)}`);
  }
}

app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const cleanPath = req.path.replace(/\.html$/, '');
    return res.redirect(301, cleanPath + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''));
  }
  next();
});

app.use((req, res, next) => {
  try {
    const p = req.path || '';
    if (!p.startsWith('/admin') && p.match(/(^|\/)index\.html$/i)) {
            const target = p.replace(/index\.html$/i, '') || '/';
      return res.redirect(301, target);
    }
  } catch (e) {
      }
  return next();
});

const routeToFile = {
  '/': 'index.html',
  '/accueil': 'index.html',
  '/menu': 'menu.html',
  '/contact': 'contact.html',
  '/commande': 'commande.html',
  '/services': 'services.html',
  '/identite': 'identite.html',
  '/admin/login': 'admin/login.html',
  '/admin/dashboard': 'admin/dashboard.html'
};

const fs = require('fs');

// Middleware pour injecter le nonce dans les pages admin
const injectNonce = (filePath) => {
  return (req, res) => {
    const fullPath = path.join(__dirname, `../maisonpardailhe/${filePath}`);
    fs.readFile(fullPath, 'utf8', (err, html) => {
      if (err) {
        logger.error('Error reading file %s: %o', filePath, err);
        return res.status(500).send('Internal Server Error');
      }
      
      // Injecter le nonce dans toutes les balises <script> qui n'ont pas déjà un attribut nonce
      const nonce = res.locals.nonce;
      const htmlWithNonce = html.replace(/<script(?!\s+[^>]*nonce=)/g, `<script nonce="${nonce}"`);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlWithNonce);
    });
  };
};

Object.keys(routeToFile).forEach(route => {
  app.get(route, (req, res) => {
    const file = routeToFile[route];
    // Injecter le nonce pour les pages admin
    if (file.startsWith('admin/')) {
      return injectNonce(file)(req, res);
    }
    return res.sendFile(path.join(__dirname, `../maisonpardailhe/${file}`));
  });
});

// express.static déjà défini en haut du fichier (ligne ~154)
// app.use(express.static(...)) commenté pour éviter doublon
app.use('/admin', express.static(path.join(__dirname, '../maisonpardailhe/admin'), { maxAge: staticMaxAge, setHeaders: (res, filePath) => setStaticHeaders(res, filePath) }));


process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at: %o reason: %o', promise, reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception: %o', err && (err.stack || err));
});

const PORT = process.env.PORT || 3001;

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

const commandesRoutes = require('./routes/commandes');
const adminRoutes = require('./routes/admin');
const menusRoutes = require('./routes/menus');
const adminMenusRoutes = require('./routes/admin_menus');
const unsubscribeRoutes = require('./routes/unsubscribe');
const schedulesRoutes = require('./routes/schedules');
const notificationsRoutes = require('./routes/notifications');
const adminNotificationsRoutes = require('./routes/admin_notifications');
const emailTemplatesRoutes = require('./routes/email_templates');
const requireAuth = require('./middleware/auth');

function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

app.use('/api/commandes', commandesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin/notifications', adminNotificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/menus', menusRoutes);
app.use('/api/admin/menus', adminMenusRoutes);
app.use('/api/admin/email-templates', requireAuth, emailTemplatesRoutes);
app.use('/unsubscribe', unsubscribeRoutes);
app.use('/api/schedules', schedulesRoutes);

app.get('/commande/:id', (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).send('ID invalide');
  return res.redirect(302, `/commande?id=${encodeURIComponent(id)}`);
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.status(404).sendFile(path.join(__dirname, '../maisonpardailhe/404.html'));
  }
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  next();
});

app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed: %o', err && (err.message || err));
    if (!res.headersSent) return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  logger.error('Unhandled error: %o', err && (err.stack || err));
  if (!res.headersSent) res.status(500).json({ message: 'Internal server error' });
});

if (require.main === module) {
  logStartupInfo();
  checkDatabase().catch((e) => logger.error('DB check unexpected error: %o', e && (e.stack || e)));

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
} else {
  module.exports = app;
  module.exports.shutdown = async () => {
    try {
      if (sessionConnection && typeof sessionConnection.end === 'function') {
        await sessionConnection.end();
        logger.info('Session connection pool closed.');
      }
    } catch (e) {
      logger.warn('Error closing session connection pool: %o', e && e.message);
    }

    
    try {
      const pool = require('./models/db');
      if (pool && typeof pool.end === 'function') {
        await pool.end();
        logger.info('Main DB pool closed.');
      }
    } catch (e) {
      logger.warn('Error closing main DB pool: %o', e && e.message);
    }
  };
}
