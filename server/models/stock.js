const db = require('./db');

const Stock = {
  create: async (data) => {
    const [result] = await db.execute(
      `INSERT INTO stock (name, reference, quantity, image_url, available) VALUES (?, ?, ?, ?, ?)`,
      [data.name, data.reference || '', data.quantity || 0, data.image_url || '', data.available ? 1 : 0]
    );
    return result.insertId;
  },
  update: async (id, data) => {
    const fields = [];
    const values = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.reference !== undefined) { fields.push('reference = ?'); values.push(data.reference); }
    if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity); }
    if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url); }
    if (data.available !== undefined) { fields.push('available = ?'); values.push(data.available ? 1 : 0); }
    if (fields.length === 0) return 0;
    values.push(id);
    const [res] = await db.execute(`UPDATE stock SET ${fields.join(', ')} WHERE id = ?`, values);
    return res.affectedRows;
  },
  delete: async (id) => {
    const [res] = await db.execute(`DELETE FROM stock WHERE id = ?`, [id]);
    return res.affectedRows;
  },
  getAll: async () => {
    const [rows] = await db.execute(`SELECT * FROM stock ORDER BY name ASC`);
    return rows;
  },
  getByReference: async (ref) => {
    if (!ref) return null;
    const [rows] = await db.execute(`SELECT * FROM stock WHERE reference = ? LIMIT 1`, [ref]);
    return rows[0] || null;
  },
  getById: async (id) => {
    const [rows] = await db.execute(`SELECT * FROM stock WHERE id = ?`, [id]);
    return rows[0];
  }
};

module.exports = Stock;
