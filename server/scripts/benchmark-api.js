#!/usr/bin/env node

const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.BENCHMARK_URL || 'https://serv-test.smp4.xyz';
const ITERATIONS = parseInt(process.env.ITERATIONS || '100', 10);

function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'User-Agent': 'API-Benchmark/1.0',
        'Accept': 'application/json',
        ...headers
      },
      rejectUnauthorized: false
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const startTime = performance.now();
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        const duration = performance.now() - startTime;
        try {
          const json = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, duration, data: json });
        } catch (e) {
          resolve({ statusCode: res.statusCode, duration, data: responseData });
        }
      });
    });

    req.on('error', (err) => {
      reject({ error: err.message, duration: performance.now() - startTime });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject({ error: 'Timeout', duration: 5000 });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function benchmarkEndpoint(name, url, method = 'GET', data = null) {
  console.log(`\n📍 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  const times = [];
  const statusCodes = {};
  let errors = 0;
  
  for (let i = 0; i < ITERATIONS; i++) {
    try {
      const result = await makeRequest(url, method, data);
      times.push(result.duration);
      statusCodes[result.statusCode] = (statusCodes[result.statusCode] || 0) + 1;
    } catch (err) {
      errors++;
    }
    
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\r   Progress: ${i + 1}/${ITERATIONS}`);
    }
  }
  
  process.stdout.write(`\r   Progress: ${ITERATIONS}/${ITERATIONS}\n`);
  
  if (times.length === 0) {
    console.log('   ❌ All requests failed\n');
    return;
  }
  
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const median = times[Math.floor(times.length / 2)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const min = times[0];
  const max = times[times.length - 1];
  
  console.log(`   Results:`);
  console.log(`     Average: ${avg.toFixed(2)}ms`);
  console.log(`     Median: ${median.toFixed(2)}ms`);
  console.log(`     Min: ${min.toFixed(2)}ms`);
  console.log(`     Max: ${max.toFixed(2)}ms`);
  console.log(`     P95: ${p95.toFixed(2)}ms`);
  console.log(`     Success: ${times.length}/${ITERATIONS} (${((times.length/ITERATIONS)*100).toFixed(2)}%)`);
  
  if (Object.keys(statusCodes).length > 0) {
    console.log(`     Status Codes: ${Object.keys(statusCodes).map(c => `${c}:${statusCodes[c]}`).join(', ')}`);
  }
  
  if (errors > 0) {
    console.log(`     ❌ Errors: ${errors}`);
  }
}

async function runAPIBenchmark() {
  console.log('═'.repeat(60));
  console.log('  API BENCHMARK - Maison Pardailhe');
  console.log('═'.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Iterations per endpoint: ${ITERATIONS}`);
  console.log('═'.repeat(60));

  await benchmarkEndpoint('Get Menus', `${BASE_URL}/api/menus`, 'GET');
  await benchmarkEndpoint('Get Schedules', `${BASE_URL}/api/schedules`, 'GET');
  await benchmarkEndpoint('Get Notifications', `${BASE_URL}/api/notifications`, 'GET');
  await benchmarkEndpoint('CSRF Token', `${BASE_URL}/api/csrf-token`, 'GET');

  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ API Benchmark Complete');
  console.log('═'.repeat(60) + '\n');
}

runAPIBenchmark().catch(err => {
  console.error('API benchmark failed:', err);
  process.exit(1);
});
