#!/usr/bin/env node

/**
 * Restauration d'un backup de base de données
 * 
 * Usage:
 *   node scripts/db_restore.js                    # Liste les backups disponibles
 *   node scripts/db_restore.js <fichier.sql>      # Restaure un backup spécifique
 *   node scripts/db_restore.js latest             # Restaure le backup le plus récent
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
require('dotenv').config();

// Configuration
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'maisonpardailhe';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

/**
 * Liste tous les backups disponibles
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
      size: fs.statSync(path.join(BACKUP_DIR, f)).size
    }))
    .sort((a, b) => b.time - a.time);

  return files;
}

/**
 * Affiche la liste des backups disponibles
 */
function displayBackups() {
  const backups = listBackups();

  if (backups.length === 0) {
    console.log('❌ Aucun backup trouvé dans:', BACKUP_DIR);
    return false;
  }

  console.log('\n📦 Backups disponibles:');
  console.log('═'.repeat(70));

  backups.forEach((backup, idx) => {
    const date = new Date(backup.time);
    const size = (backup.size / (1024 * 1024)).toFixed(2);
    const dateStr = date.toLocaleString('fr-FR');
    const tag = idx === 0 ? ' [DERNIER]' : '';
    
    console.log(`${idx + 1}. ${backup.name}${tag}`);
    console.log(`   📅 ${dateStr} | 💾 ${size} MB`);
  });

  console.log('═'.repeat(70));
  return true;
}

/**
 * Demande confirmation à l'utilisateur
 */
async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'o');
    });
  });
}

/**
 * Restaure un fichier de backup
 */
async function restoreBackup(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Fichier introuvable: ${filepath}`);
  }

  const stats = fs.statSync(filepath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n⚠️  ATTENTION: Cette opération va ÉCRASER la base de données actuelle!');
  console.log(`   Base: ${DB_NAME}`);
  console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
  console.log(`   Fichier: ${path.basename(filepath)}`);
  console.log(`   Taille: ${sizeMB} MB`);

  const confirmed = await confirm('\n❓ Voulez-vous continuer? (oui/non): ');

  if (!confirmed) {
    console.log('❌ Restauration annulée');
    return false;
  }

  console.log('\n🔄 Restauration en cours...');

  return new Promise((resolve, reject) => {
    const args = [
      `-h${DB_HOST}`,
      `-P${DB_PORT}`,
      `-u${DB_USER}`,
      `--password=${DB_PASSWORD}`,
      '--default-character-set=utf8mb4',
      DB_NAME
    ];

    const mysql = spawn('mysql', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const readStream = fs.createReadStream(filepath);
    readStream.pipe(mysql.stdin);

    let stderr = '';
    mysql.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mysql.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Restauration terminée avec succès!');
        resolve(true);
      } else {
        reject(new Error(`mysql a échoué (code ${code}): ${stderr}`));
      }
    });

    mysql.on('error', (err) => {
      reject(new Error(`Erreur lors de l'exécution de mysql: ${err.message}`));
    });
  });
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔄 Restauration de backup MySQL');
  console.log('═'.repeat(70));

  const arg = process.argv[2];

  // Si aucun argument, afficher la liste
  if (!arg) {
    const hasBackups = displayBackups();
    if (hasBackups) {
      console.log('\nUsage:');
      console.log('  node scripts/db_restore.js <fichier.sql>  # Restaurer un backup');
      console.log('  node scripts/db_restore.js latest         # Restaurer le plus récent');
    }
    process.exit(hasBackups ? 0 : 1);
  }

  let filepath;

  // Si "latest", prendre le plus récent
  if (arg === 'latest') {
    const backups = listBackups();
    if (backups.length === 0) {
      console.error('❌ Aucun backup disponible');
      process.exit(1);
    }
    filepath = backups[0].path;
    console.log(`📂 Sélection du backup le plus récent: ${backups[0].name}`);
  } else {
    // Sinon, utiliser le fichier spécifié
    filepath = path.isAbsolute(arg) ? arg : path.join(BACKUP_DIR, arg);
  }

  try {
    await restoreBackup(filepath);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la restauration:', error.message);
    console.error('\nVérifiez que:');
    console.error('  1. MySQL est installé et dans le PATH');
    console.error('  2. Les identifiants dans .env sont corrects');
    console.error('  3. La base de données existe');
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { restoreBackup, listBackups };
