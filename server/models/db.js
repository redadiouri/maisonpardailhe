const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  // Optimize connection pool for small-medium traffic sites
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10),
  queueLimit: 0,
  // Enable connection pooling optimizations
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Timeout settings for better resource management
  connectTimeout: 10000, // 10 seconds
  // Use charset utf8mb4 for full Unicode support (emojis, etc.)
  charset: 'utf8mb4',
  // Timezone setting for consistency
  timezone: '+00:00'
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
