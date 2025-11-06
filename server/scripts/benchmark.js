#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.BENCHMARK_URL || 'https://serv-test.smp4.xyz';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '10', 10);
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER || '20', 10);
const WARMUP_REQUESTS = parseInt(process.env.WARMUP_REQUESTS || '5', 10);

const stats = {
  requests: 0,
  success: 0,
  errors: 0,
  totalTime: 0,
  times: [],
  statusCodes: {},
  errors: []
};

function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'User-Agent': 'Benchmark/1.0',
        ...headers
      },
      rejectUnauthorized: false
    };

    if (data) {
      const body = typeof data === 'string' ? data : JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const startTime = performance.now();
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          duration: duration,
          headers: res.headers,
          body: responseData
        });
      });
    });

    req.on('error', (err) => {
      const endTime = performance.now();
      reject({
        error: err.message,
        duration: endTime - startTime
      });
    });

    if (data) {
      const body = typeof data === 'string' ? data : JSON.stringify(data);
      req.write(body);
    }

    req.end();
  });
}

async function testEndpoint(name, url, method = 'GET', data = null) {
  try {
    const result = await makeRequest(url, method, data);
    
    stats.requests++;
    stats.times.push(result.duration);
    stats.totalTime += result.duration;
    
    if (result.statusCode >= 200 && result.statusCode < 400) {
      stats.success++;
    } else {
      stats.errors++;
    }
    
    stats.statusCodes[result.statusCode] = (stats.statusCodes[result.statusCode] || 0) + 1;
    
    return result;
  } catch (err) {
    stats.requests++;
    stats.errors++;
    stats.errors.push(err.error || err.message);
    return { error: err.error || err.message, duration: err.duration || 0 };
  }
}

async function runUserSession() {
  const endpoints = [
    { name: 'Home Page', url: `${BASE_URL}/`, method: 'GET' },
    { name: 'Menu Page', url: `${BASE_URL}/menu.html`, method: 'GET' },
    { name: 'Command Page', url: `${BASE_URL}/commande.html`, method: 'GET' },
    { name: 'API Menus', url: `${BASE_URL}/api/menus`, method: 'GET' },
    { name: 'API Schedules', url: `${BASE_URL}/api/schedules`, method: 'GET' },
    { name: 'Static CSS', url: `${BASE_URL}/css/style.min.css`, method: 'GET' },
    { name: 'Static JS', url: `${BASE_URL}/js/app.js`, method: 'GET' }
  ];

  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    await testEndpoint(endpoint.name, endpoint.url, endpoint.method);
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }
}

async function warmup() {
  console.log(`\n🔥 Warmup: ${WARMUP_REQUESTS} requests...`);
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    await testEndpoint('Warmup', `${BASE_URL}/`, 'GET');
  }
  stats.requests = 0;
  stats.success = 0;
  stats.errors = 0;
  stats.times = [];
  stats.statusCodes = {};
  stats.totalTime = 0;
  console.log('✅ Warmup complete\n');
}

async function runBenchmark() {
  console.log('═'.repeat(60));
  console.log('  BENCHMARK - Maison Pardailhe');
  console.log('═'.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`Requests per User: ${REQUESTS_PER_USER}`);
  console.log(`Total Requests: ${CONCURRENT_USERS * REQUESTS_PER_USER}`);
  console.log('═'.repeat(60));

  await warmup();

  const startTime = performance.now();
  
  const users = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    users.push(runUserSession());
  }
  
  await Promise.all(users);
  
  const endTime = performance.now();
  const totalDuration = (endTime - startTime) / 1000;

  console.log('\n' + '═'.repeat(60));
  console.log('  RESULTS');
  console.log('═'.repeat(60));
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total Requests: ${stats.requests}`);
  console.log(`  Successful: ${stats.success} (${((stats.success / stats.requests) * 100).toFixed(2)}%)`);
  console.log(`  Errors: ${stats.errors} (${((stats.errors / stats.requests) * 100).toFixed(2)}%)`);
  console.log(`  Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`  Requests/sec: ${(stats.requests / totalDuration).toFixed(2)}`);
  
  if (stats.times.length > 0) {
    stats.times.sort((a, b) => a - b);
    const avg = stats.times.reduce((a, b) => a + b, 0) / stats.times.length;
    const median = stats.times[Math.floor(stats.times.length / 2)];
    const p95 = stats.times[Math.floor(stats.times.length * 0.95)];
    const p99 = stats.times[Math.floor(stats.times.length * 0.99)];
    const min = stats.times[0];
    const max = stats.times[stats.times.length - 1];
    
    console.log(`\n⏱️  Response Times (ms):`);
    console.log(`  Average: ${avg.toFixed(2)}ms`);
    console.log(`  Median: ${median.toFixed(2)}ms`);
    console.log(`  Min: ${min.toFixed(2)}ms`);
    console.log(`  Max: ${max.toFixed(2)}ms`);
    console.log(`  P95: ${p95.toFixed(2)}ms`);
    console.log(`  P99: ${p99.toFixed(2)}ms`);
  }
  
  console.log(`\n📈 Status Codes:`);
  Object.keys(stats.statusCodes)
    .sort()
    .forEach(code => {
      console.log(`  ${code}: ${stats.statusCodes[code]} requests`);
    });
  
  if (stats.errors.length > 0 && stats.errors.length <= 10) {
    console.log(`\n❌ Errors:`);
    stats.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  } else if (stats.errors.length > 10) {
    console.log(`\n❌ Too many errors to display (${stats.errors.length} total)`);
  }
  
  console.log('\n' + '═'.repeat(60));
  
  const avgResponseTime = stats.times.length > 0 
    ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length 
    : 0;
  
  if (avgResponseTime < 100) {
    console.log('✅ Excellent performance! (<100ms avg)');
  } else if (avgResponseTime < 300) {
    console.log('✅ Good performance! (<300ms avg)');
  } else if (avgResponseTime < 1000) {
    console.log('⚠️  Acceptable performance (<1s avg)');
  } else {
    console.log('❌ Poor performance (>1s avg) - optimization needed');
  }
  
  console.log('═'.repeat(60) + '\n');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
