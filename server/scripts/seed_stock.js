#!/usr/bin/env node
// Seed script to insert menu items into stock table idempotently.
// Usage: node server/scripts/seed_stock.js

const Stock = require('../models/stock');
const db = require('../models/db');

const ITEMS = [
  { name: "Pâté en croûte Maison", reference: 'PATE-CROUTE', quantity: 20, image_url: '', available: true },
  { name: 'Jambon blanc médaillé', reference: 'JAMBON', quantity: 50, image_url: '', available: true },
  { name: 'Saucisse de Toulouse', reference: 'SAUCISSE', quantity: 40, image_url: '', available: true },
  { name: 'Terrine aux cèpes', reference: 'TERRINE', quantity: 30, image_url: '', available: true },
  { name: 'Rillettes de canard', reference: 'RILLETTES', quantity: 50, image_url: '', available: true },
  { name: 'Coppa affinée', reference: 'COPPA', quantity: 40, image_url: '', available: true },
  { name: 'Poulet fermier Label Rouge', reference: 'POULET', quantity: 20, image_url: '', available: true },
  { name: 'Travers caramélisés', reference: 'TRAVERS', quantity: 30, image_url: '', available: true },
  { name: 'Porcelet de fête', reference: 'PORCELET', quantity: 5, image_url: '', available: true },
  { name: 'Pickles de légumes', reference: 'PICKLES', quantity: 60, image_url: '', available: true },
  { name: "Gelée de piment d'Espelette", reference: 'GELEE-PIMENT', quantity: 60, image_url: '', available: true },
  { name: 'Moutarde noire maison', reference: 'MOUTARDE', quantity: 80, image_url: '', available: true },
];

async function upsertItem(item) {
  const existing = await Stock.getByReference(item.reference);
  if (existing) {
    // update quantity and availability, but don't overwrite name if it's present
    const update = {
      quantity: item.quantity,
      available: item.available,
    };
    // set name if existing name is empty
    if (!existing.name && item.name) update.name = item.name;
    await Stock.update(existing.id, update);
    return { action: 'updated', id: existing.id };
  } else {
    const id = await Stock.create(item);
    return { action: 'created', id };
  }
}

async function main() {
  try {
    console.log('Seeding stock items...');
    for (const it of ITEMS) {
      const r = await upsertItem(it);
      console.log(`${r.action}: ${it.reference} (id=${r.id})`);
    }
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding stock:', err);
    process.exit(1);
  }
}

main();
