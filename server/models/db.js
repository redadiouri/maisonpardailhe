const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

// Ensure the pool is closed on process exit to avoid open handles in test runners
try {
  process.on('beforeExit', async () => {
    try {
      if (pool && typeof pool.end === 'function') {
        await pool.end();
      }
    } catch (e) {
      // ignore
    }
  });
} catch (e) {
  // no-op in restricted environments
}
