#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.BENCHMARK_URL || 'https://serv-test.smp4.xyz';
const DURATION_SECONDS = parseInt(process.env.DURATION || '60', 10);
const RAMP_UP_SECONDS = parseInt(process.env.RAMP_UP || '10', 10);
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '50', 10);

const stats = {
  requests: 0,
  success: 0,
  errors: 0,
  times: [],
  statusCodes: {},
  errorTypes: {}
};

let running = true;
let currentConcurrent = 0;

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'LoadTest/1.0'
      },
      rejectUnauthorized: false
    };

    const startTime = performance.now();
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const duration = performance.now() - startTime;
        resolve({ statusCode: res.statusCode, duration });
      });
    });

    req.on('error', (err) => {
      reject({ error: err.message, duration: performance.now() - startTime });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({ error: 'Timeout', duration: 10000 });
    });

    req.end();
  });
}

async function worker() {
  const endpoints = [
    `${BASE_URL}/`,
    `${BASE_URL}/menu.html`,
    `${BASE_URL}/commande.html`,
    `${BASE_URL}/api/menus`,
    `${BASE_URL}/api/schedules`
  ];

  while (running) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    try {
      const result = await makeRequest(endpoint);
      stats.requests++;
      stats.times.push(result.duration);

      if (result.statusCode >= 200 && result.statusCode < 400) {
        stats.success++;
      } else {
        stats.errors++;
      }

      stats.statusCodes[result.statusCode] = (stats.statusCodes[result.statusCode] || 0) + 1;
    } catch (err) {
      stats.requests++;
      stats.errors++;
      stats.errorTypes[err.error] = (stats.errorTypes[err.error] || 0) + 1;
    }

    await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
  }
}

function printProgress(elapsed) {
  const rps = stats.requests / elapsed;
  const errorRate = stats.requests > 0 ? ((stats.errors / stats.requests) * 100).toFixed(2) : 0;
  const avgTime =
    stats.times.length > 0
      ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(2)
      : 0;

  process.stdout.write(
    `\r⏱️  ${elapsed.toFixed(0)}s | Users: ${currentConcurrent} | Requests: ${
      stats.requests
    } | RPS: ${rps.toFixed(2)} | Avg: ${avgTime}ms | Errors: ${errorRate}%   `
  );
}

async function runLoadTest() {
  console.log('═'.repeat(60));
  console.log('  LOAD TEST - Maison Pardailhe');
  console.log('═'.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Duration: ${DURATION_SECONDS}s`);
  console.log(`Ramp-up: ${RAMP_UP_SECONDS}s`);
  console.log(`Max Concurrent: ${MAX_CONCURRENT}`);
  console.log('═'.repeat(60) + '\n');

  const startTime = performance.now();
  const workers = [];

  const progressInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    printProgress(elapsed);
  }, 1000);

  const rampUpInterval = setInterval(() => {
    if (currentConcurrent < MAX_CONCURRENT) {
      currentConcurrent++;
      workers.push(worker());
    }
  }, (RAMP_UP_SECONDS * 1000) / MAX_CONCURRENT);

  setTimeout(() => {
    clearInterval(rampUpInterval);
  }, RAMP_UP_SECONDS * 1000);

  setTimeout(() => {
    running = false;
    clearInterval(progressInterval);
    clearInterval(rampUpInterval);
  }, DURATION_SECONDS * 1000);

  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (!running && workers.length === 0) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });

  const totalDuration = (performance.now() - startTime) / 1000;

  console.log('\n\n' + '═'.repeat(60));
  console.log('  RESULTS');
  console.log('═'.repeat(60));

  console.log(`\n📊 Summary:`);
  console.log(`  Total Requests: ${stats.requests}`);
  console.log(
    `  Successful: ${stats.success} (${((stats.success / stats.requests) * 100).toFixed(2)}%)`
  );
  console.log(`  Errors: ${stats.errors} (${((stats.errors / stats.requests) * 100).toFixed(2)}%)`);
  console.log(`  Duration: ${totalDuration.toFixed(2)}s`);
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
    .forEach((code) => {
      console.log(`  ${code}: ${stats.statusCodes[code]}`);
    });

  if (Object.keys(stats.errorTypes).length > 0) {
    console.log(`\n❌ Error Types:`);
    Object.keys(stats.errorTypes).forEach((type) => {
      console.log(`  ${type}: ${stats.errorTypes[type]}`);
    });
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

runLoadTest().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
