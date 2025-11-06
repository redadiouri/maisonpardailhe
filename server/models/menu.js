const db = require('./db');

function slugify(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function generateUniqueSlug(name, excludeId) {
  const base = slugify(name) || 'item';
  let candidate = base;
  let suffix = 1;
  while (true) {
        const [rows] = await db.execute('SELECT id FROM menus WHERE slug = ? LIMIT 1', [candidate]);
    if (rows.length === 0) return candidate;
    const foundId = rows[0].id;
    if (excludeId && Number(foundId) === Number(excludeId)) return candidate;
        suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}


const Menu = {
  create: async (data) => {
        const slug = await generateUniqueSlug(data.name);
    const [res] = await db.execute(
      `INSERT INTO menus (name, slug, description, price_cents, is_quote, stock, reference, image_url, available, visible_on_menu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        slug,
        data.description || '',
        data.price_cents || 0,
        data.is_quote ? 1 : 0,
        data.stock || 0,
        data.reference || null,
        data.image_url || '',
        data.available ? 1 : 0,
        data.visible_on_menu === undefined ? 1 : (data.visible_on_menu ? 1 : 0)
      ]
    );
    return res.insertId;
  },
  update: async (id, data) => {
    const fields = [];
    const values = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
            if (data.name !== undefined) {
            const unique = await generateUniqueSlug(data.name, id);
      fields.push('slug = ?'); values.push(unique);
    }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.price_cents !== undefined) { fields.push('price_cents = ?'); values.push(data.price_cents); }
    if (data.is_quote !== undefined) { fields.push('is_quote = ?'); values.push(data.is_quote ? 1 : 0); }
  if (data.stock !== undefined) { fields.push('stock = ?'); values.push(data.stock); }
  if (data.reference !== undefined) { fields.push('reference = ?'); values.push(data.reference); }
  if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url); }
  if (data.available !== undefined) { fields.push('available = ?'); values.push(data.available ? 1 : 0); }
  if (data.visible_on_menu !== undefined) { fields.push('visible_on_menu = ?'); values.push(data.visible_on_menu ? 1 : 0); }
    if (fields.length === 0) return 0;
    values.push(id);
    const [res] = await db.execute(`UPDATE menus SET ${fields.join(', ')} WHERE id = ?`, values);
    return res.affectedRows;
  },
  delete: async (id) => {
    const [res] = await db.execute(`DELETE FROM menus WHERE id = ?`, [id]);
    return res.affectedRows;
  },
  getAll: async (visibleOnly = true) => {
    if (visibleOnly) {
      const [rows] = await db.execute(`SELECT * FROM menus WHERE visible_on_menu = 1 ORDER BY name ASC`);
      return rows;
    }
    const [rows] = await db.execute(`SELECT * FROM menus ORDER BY name ASC`);
    return rows;
  },
  getById: async (id) => {
    const [rows] = await db.execute(`SELECT * FROM menus WHERE id = ?`, [id]);
    return rows[0];
  },
    getByIds: async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return {};
        const uniq = Array.from(new Set(ids.map(i => Number(i)).filter(n => !Number.isNaN(n) && n > 0)));
    if (uniq.length === 0) return {};
    const placeholders = uniq.map(() => '?').join(',');
    const [rows] = await db.execute(`SELECT id, name, price_cents FROM menus WHERE id IN (${placeholders})`, uniq);
    const map = {};
    for (const r of rows) map[Number(r.id)] = r;
    return map;
  },
  getByReference: async (ref) => {
    if (!ref) return null;
    const [rows] = await db.execute(`SELECT * FROM menus WHERE reference = ? LIMIT 1`, [ref]);
    return rows[0] || null;
  },
  getByIdsForUpdate: async (conn, id) => {
    const [rows] = await conn.execute(`SELECT * FROM menus WHERE id = ? FOR UPDATE`, [id]);
    return rows[0];
  }
};

module.exports = Menu;
