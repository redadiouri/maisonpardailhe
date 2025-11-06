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

Admin.deleteById = async (id) => {
  const [result] = await db.execute(`DELETE FROM admins WHERE id = ?`, [id]);
  return result.affectedRows;
};

Admin.updatePermissions = async (id, perms) => {
    const fields = [];
  const values = [];
  if (perms.can_edit_menus !== undefined) {
    fields.push('can_edit_menus = ?');
    values.push(perms.can_edit_menus ? 1 : 0);
  }
  if (fields.length === 0) return 0;
  values.push(id);
  const [result] = await db.execute(`UPDATE admins SET ${fields.join(', ')} WHERE id = ?`, values);
  return result.affectedRows;
};

Admin.count = async () => {
  const [rows] = await db.execute(`SELECT COUNT(*) as c FROM admins`);
  return Number(rows[0].c || 0);
};

module.exports = Admin;
