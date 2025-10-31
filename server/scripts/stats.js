#!/usr/bin/env node
/*
  server/scripts/stats.js
  Small helper to compute basic statistics from the commandes table.
  - counts total orders and orders by status
  - aggregates items sold when `produit` is stored as JSON [{menu_id, qty}]
  - estimates revenue using menus.price_cents when possible

  Usage: from repo root -> cd server && node scripts/stats.js
  Requires server/.env with DB_* values or environment already set.
*/

const db = require('../models/db');

async function loadMenus() {
  const [rows] = await db.query('SELECT id, name, price_cents FROM menus');
  const map = new Map();
  for (const r of rows) map.set(r.id, { name: r.name, price_cents: Number(r.price_cents || 0) });
  return map;
}

function tryParseProduit(p) {
  if (!p) return null;
  // If it looks like JSON array
  try {
    const parsed = JSON.parse(p);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // not JSON
  }
  return null;
}

async function main() {
  const menus = await loadMenus();

  const [all] = await db.query('SELECT id, produit, statut, date_creation FROM commandes ORDER BY date_creation DESC');

  const totalOrders = all.length;
  const byStatus = {};
  let last30 = 0;
  const now = new Date();
  const itemsSold = new Map();
  let revenueCents = 0;

  for (const c of all) {
    byStatus[c.statut] = (byStatus[c.statut] || 0) + 1;
    const created = new Date(c.date_creation);
    if ((now - created) / (1000 * 60 * 60 * 24) <= 30) last30++;

    const parsed = tryParseProduit(c.produit);
    if (parsed) {
      for (const it of parsed) {
        const id = Number(it.menu_id);
        const qty = Math.max(0, Math.floor(Number(it.qty) || 0));
        if (!id || qty <= 0) continue;
        const prev = itemsSold.get(id) || 0;
        itemsSold.set(id, prev + qty);
        const menu = menus.get(id);
        if (menu) revenueCents += menu.price_cents * qty;
      }
    }
  }

  console.log('--- Statistiques commandes ---');
  console.log('Total commandes:', totalOrders);
  console.log('Commandes (30 derniers jours):', last30);
  console.log('Par statut:');
  for (const k of Object.keys(byStatus)) console.log(`  ${k}: ${byStatus[k]}`);

  console.log('\n--- Articles vendus (depuis commandes analysables) ---');
  if (itemsSold.size === 0) console.log('Aucun item JSON détecté dans les commandes (produit stocké en format legacy)');
  for (const [id, qty] of itemsSold.entries()) {
    const menu = menus.get(id);
    console.log(`  ${id} - ${menu ? menu.name : 'menu#' + id}: ${qty} pcs`);
  }

  console.log('\nCA estimé (prix disponibles dans menus.price_cents):', (revenueCents / 100).toFixed(2), '€ (approx)');
  process.exit(0);
}

main().catch((e) => {
  console.error('Erreur lors du calcul des stats:', e && (e.stack || e));
  process.exit(2);
});
