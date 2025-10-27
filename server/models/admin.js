const db = require('./db');

const Admin = {
  getByUsername: async (username) => {
    const [rows] = await db.execute(
      `SELECT * FROM admins WHERE username = ?`,
      [username]
    );
    return rows[0];
  },
  getById: async (id) => {
    const [rows] = await db.execute(
      `SELECT * FROM admins WHERE id = ?`,
      [id]
    );
    return rows[0];
  },
  updatePassword: async (id, password_hash) => {
    const [result] = await db.execute(
      `UPDATE admins SET password_hash = ? WHERE id = ?`,
      [password_hash, id]
    );
    return result.affectedRows;
  }
};

module.exports = Admin;
