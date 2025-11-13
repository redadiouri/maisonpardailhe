const fetch = require('node-fetch');

const apiBase = 'http://localhost:3001/api';

async function testOrderWithTotal() {
  console.log('🧪 Test: Creating order with items to verify total_cents calculation...\n');

  try {
    const menusRes = await fetch(`${apiBase}/menus`);
    if (!menusRes.ok) {
      console.error('❌ Failed to fetch menus');
      return;
    }
    const menus = await menusRes.json();
    console.log(`📋 Available menus (showing first 3):`);
    menus.slice(0, 3).forEach((m) => {
      console.log(
        `  - ${m.name} (ID: ${m.id}): ${(m.price_cents / 100).toFixed(2)}€ (stock: ${m.stock})`
      );
    });

    const testOrder = {
      nom_complet: 'Test Client',
      telephone: '0600000000',
      email: 'test@example.com',
      date_retrait: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      creneau: '12:00',
      location: 'roquettes',
      items: [
        { menu_id: menus[0].id, qty: 2 },
        { menu_id: menus[1].id, qty: 1 }
      ]
    };

    const expectedTotal = menus[0].price_cents * 2 + menus[1].price_cents * 1;
    console.log(`\n📝 Creating test order:`);
    console.log(`  - ${menus[0].name} × 2 = ${((menus[0].price_cents * 2) / 100).toFixed(2)}€`);
    console.log(`  - ${menus[1].name} × 1 = ${(menus[1].price_cents / 100).toFixed(2)}€`);
    console.log(
      `  - Expected total: ${(expectedTotal / 100).toFixed(2)}€ (${expectedTotal} cents)`
    );

    const orderRes = await fetch(`${apiBase}/commandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOrder)
    });

    if (!orderRes.ok) {
      const error = await orderRes.text();
      console.error(`❌ Failed to create order: ${error}`);
      return;
    }

    const result = await orderRes.json();
    console.log(`\n✅ Order created successfully!`);
    console.log(`  - Order ID: ${result.id}`);
    console.log(
      `  - Calculated total: ${(result.total_cents / 100).toFixed(2)}€ (${
        result.total_cents
      } cents)`
    );

    if (result.total_cents === expectedTotal) {
      console.log(`\n🎉 SUCCESS: Total matches expected value!`);
    } else {
      console.log(`\n❌ ERROR: Total mismatch!`);
      console.log(`  Expected: ${expectedTotal} cents`);
      console.log(`  Got: ${result.total_cents} cents`);
    }
  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

testOrderWithTotal();
