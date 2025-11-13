#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const Menu = require('../models/menu');

async function main() {
  const htmlPath = path.join(__dirname, '..', '..', 'maisonpardailhe', 'menu.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('menu.html not found at', htmlPath);
    process.exit(1);
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const $ = cheerio.load(html);
  const cards = $('.menu-card');
  console.log('Found', cards.length, 'menu cards');
  let inserted = 0;
  for (let i = 0; i < cards.length; i++) {
    const el = cards[i];
    const name = $(el).find('h3').first().text().trim();
    const desc = $(el).find('p').first().text().trim();
    const priceText = $(el).find('.menu-price strong').first().text().trim();
    let is_quote = false;
    let price_cents = 0;
    if (!priceText || /devis|nous contacter|nous contacter|sur devis|sur devis/i.test(priceText)) {
      is_quote = true;
      price_cents = 0;
    } else {
      const num = priceText.replace(/[^0-9.,]/g, '').replace(',', '.');
      const parsed = parseFloat(num);
      price_cents = Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
    }
    const ds = $(el).attr('data-stock');
    const stock = ds !== undefined ? Math.max(0, parseInt(ds, 10) || 0) : 0;

    try {
      await Menu.create({
        name,
        description: desc,
        price_cents,
        is_quote,
        stock,
        visible_on_menu: 1
      });
      inserted++;
      console.log('Inserted:', name);
    } catch (err) {
      console.error('Failed to insert', name, err && err.message);
    }
  }
  console.log(`Done. Inserted ${inserted}/${cards.length}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
