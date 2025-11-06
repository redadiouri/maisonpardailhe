#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { spawn } = require('child_process');

let mysqldumpPkg = null;
try {
  mysqldumpPkg = require('mysqldump');
} catch (e) {
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
