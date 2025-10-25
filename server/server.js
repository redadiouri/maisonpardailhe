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
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));


// Sert le site principal en statique sur la racine
app.use(express.static(path.join(__dirname, '../maisonpardailhe')));
// Sert le dossier admin en statique
app.use('/admin', express.static(path.join(__dirname, '../maisonpardailhe/admin')));

const commandesRoutes = require('./routes/commandes');
const adminRoutes = require('./routes/admin');

app.use('/api/commandes', commandesRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
