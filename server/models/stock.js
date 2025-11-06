const Menu = require('./menu');

const Stock = {
  create: async (data) => {
        const menuData = {
      name: data.name,
      description: data.description || '',
      price_cents: data.price_cents || 0,
      is_quote: data.is_quote || false,
      stock: data.quantity || 0,
      reference: data.reference || null,
      image_url: data.image_url || '',
      available: data.available === undefined ? 1 : (data.available ? 1 : 0),
      visible_on_menu: data.visible_on_menu === undefined ? 1 : (data.visible_on_menu ? 1 : 0)
    };
    return await Menu.create(menuData);
  },
  update: async (id, data) => {
    const menuData = {};
    if (data.name !== undefined) menuData.name = data.name;
    if (data.reference !== undefined) menuData.reference = data.reference;
    if (data.quantity !== undefined) menuData.stock = data.quantity;
    if (data.image_url !== undefined) menuData.image_url = data.image_url;
    if (data.available !== undefined) menuData.available = data.available ? 1 : 0;
    if (data.description !== undefined) menuData.description = data.description;
    if (data.price_cents !== undefined) menuData.price_cents = data.price_cents;
    if (data.is_quote !== undefined) menuData.is_quote = data.is_quote;
    if (data.visible_on_menu !== undefined) menuData.visible_on_menu = data.visible_on_menu;
    return await Menu.update(id, menuData);
  },
  delete: async (id) => {
    return await Menu.delete(id);
  },
  getAll: async () => {
        return await Menu.getAll(false);
  },
  getByReference: async (ref) => {
    return await Menu.getByReference(ref);
  },
  getById: async (id) => {
    return await Menu.getById(id);
  }
};

module.exports = Stock;
