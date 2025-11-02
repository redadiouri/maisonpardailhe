#!/usr/bin/env node
/*
  Simple DB backup script using the `mysqldump` npm package.
  Usage: set env vars (DB_*) and optionally BACKUP_DIR then run:
    node scripts/db_backup.js
  The script writes a timestamped SQL dump to BACKUP_DIR (default: ./backups)
*/
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { spawn } = require('child_process');

// Try to load the optional mysqldump npm package. If it's not installed,
// we'll fallback to calling the system `mysqldump` binary (must be available in PATH).
let mysqldumpPkg = null;
try {
  mysqldumpPkg = require('mysqldump');
} catch (e) {
  // package not installed — will use CLI fallback
}

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'maisonpardailhe';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

async function run() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const now = new Date().toISOString().replace(/[:]/g, '-');
    const filename = path.join(BACKUP_DIR, `backup-${DB_NAME}-${now}.sql`);

    console.log(`Writing backup to ${filename}`);

    if (mysqldumpPkg) {
      // Use the npm package if available
      await mysqldumpPkg({
        connection: {
          host: DB_HOST,
          user: DB_USER,
          password: DB_PASSWORD,
          database: DB_NAME
        },
        dumpToFile: filename
      });
      console.log('Backup complete (via mysqldump npm package)');
    } else {
      // Fallback: call the system mysqldump CLI
      await new Promise((resolve, reject) => {
        const args = [
          `-h${DB_HOST}`,
          `-u${DB_USER}`,
          `-p${DB_PASSWORD}`,
          DB_NAME
        ];
        const dump = spawn('mysqldump', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const writeStream = fs.createWriteStream(filename);
        dump.stdout.pipe(writeStream);
        let stderr = '';
        dump.stderr.on('data', (d) => { stderr += d.toString(); });
        dump.on('close', (code) => {
          writeStream.end();
          if (code === 0) return resolve();
          return reject(new Error(`mysqldump exited with code ${code}: ${stderr}`));
        });
        dump.on('error', (err) => reject(err));
      });
      console.log('Backup complete (via mysqldump CLI)');
    }
  } catch (err) {
    console.error('Backup failed:', err);
    process.exitCode = 2;
  }
}

if (require.main === module) run();
