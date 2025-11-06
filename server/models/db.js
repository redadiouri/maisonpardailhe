const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10),
  queueLimit: 0,
    enableKeepAlive: true,
  keepAliveInitialDelay: 0,
    connectTimeout: 10000,     charset: 'utf8mb4',
    timezone: '+00:00'
});

module.exports = pool;

try {
  process.on('beforeExit', async () => {
    try {
      if (pool && typeof pool.end === 'function') {
        await pool.end();
      }
    } catch (e) {
          }
  });
} catch (e) {
  }
