require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

const path = require('path');

app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));
app.use(bodyParser.json());
// Ensure a session secret exists; use a development fallback if not set.
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-this';
if (!process.env.SESSION_SECRET) {
  console.warn('Warning: SESSION_SECRET not set in .env — using fallback. Set SESSION_SECRET for production.');
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
  console.error('Unhandled error:', err && (err.stack || err));
  if (!res.headersSent) res.status(500).json({ message: 'Internal server error' });
});

// Prevent the process from exiting on unhandled promise rejections during dev
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && (err.stack || err));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
