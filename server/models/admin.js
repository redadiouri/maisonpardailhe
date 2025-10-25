const db = require('./db');

const Admin = {
  getByUsername: async (username) => {
    const [rows] = await db.execute(
      `SELECT * FROM admins WHERE username = ?`,
      [username]
    );
    return rows[0];
  }
};

module.exports = Admin;
