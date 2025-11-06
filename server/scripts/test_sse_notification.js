const http = require('http');

const API_BASE = 'http://localhost:3001';

function getCsrfToken() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/csrf-token',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.csrfToken || null);
        } catch (error) {
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testSSE() {
  console.log('Testing SSE notifications for new orders...\n');

    const testOrder = {
    nom_complet: 'Test Client SSE',
    telephone: '0612345678',
    email: 'test@example.com',
    date_retrait: '2025-11-15',
    creneau: '12:30',
    location: 'roquettes',
    items: [
      { menu_id: 1, qty: 2 }
    ]
  };

  console.log('Sending test order:');
  console.log(JSON.stringify(testOrder, null, 2));
  console.log('\nMake sure:');
  console.log('1. The server is running (npm run dev)');
  console.log('2. Admin dashboard is open in browser');
  console.log('3. You are logged into the admin panel\n');

  try {
        console.log('Getting CSRF token...');
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      console.log('✓ CSRF token obtained\n');
    }

    const postData = JSON.stringify(testOrder);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/commandes',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

        if (csrfToken) {
      options.headers['X-CSRF-Token'] = csrfToken;
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 201) {
            console.log('✅ Order created successfully!');
            console.log('Order ID:', response.id);
            console.log('Total:', response.total_cents ? `${response.total_cents / 100}€` : 'N/A');
            console.log('\n🔔 Check the admin dashboard - you should see:');
            console.log('   - A notification popup in the top-right corner');
            console.log('   - Hear a two-tone beep sound');
            console.log('   - The order list automatically updated\n');
          } else {
            console.error('❌ Failed to create order:', response.message || `Status ${res.statusCode}`);
            console.error('Response:', response);
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error.message);
          console.error('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      console.error('\nMake sure the server is running on port 3001');
      console.error('Run: cd server && npm run dev');
    });

    req.write(postData);
    req.end();
  } catch (error) {
    console.error('❌ Error getting CSRF token:', error.message);
  }
}

testSSE();
