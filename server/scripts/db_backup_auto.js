#!/usr/bin/env node

/**
 * Backup automatique de la base de données avec rotation
 * - Crée un dump SQL horodaté
 * - Garde les N derniers backups (défini par MAX_BACKUPS)
 * - Supprime automatiquement les anciens backups
 *
 * Usage: node scripts/db_backup_auto.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

// Configuration
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'maisonpardailhe';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '30', 10); // Garder 30 derniers backups par défaut

/**
 * Crée un backup de la base de données
 */
async function createBackup() {
  // Créer le répertoire de backup s'il n'existe pas
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✓ Répertoire de backup créé: ${BACKUP_DIR}`);
  }

  // Nom du fichier avec horodatage
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
  const filename = `backup-${DB_NAME}-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  console.log(`📦 Création du backup: ${filename}`);
  console.log(`   Base: ${DB_NAME}`);
  console.log(`   Host: ${DB_HOST}:${DB_PORT}`);

  return new Promise((resolve, reject) => {
    const args = [
      `-h${DB_HOST}`,
      `-P${DB_PORT}`,
      `-u${DB_USER}`,
      `--password=${DB_PASSWORD}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--events',
      '--complete-insert',
      '--hex-blob',
      '--default-character-set=utf8mb4',
      DB_NAME
    ];

    const dump = spawn('mysqldump', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const writeStream = fs.createWriteStream(filepath);
    dump.stdout.pipe(writeStream);

    let stderr = '';
    dump.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    dump.on('close', (code) => {
      if (code === 0) {
        const stats = fs.statSync(filepath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`✓ Backup créé avec succès (${sizeMB} MB)`);
        resolve(filepath);
      } else {
        fs.unlinkSync(filepath); // Supprimer le fichier incomplet
        reject(new Error(`mysqldump a échoué (code ${code}): ${stderr}`));
      }
    });

    dump.on('error', (err) => {
      reject(new Error(`Erreur lors de l'exécution de mysqldump: ${err.message}`));
    });
  });
}

/**
 * Liste tous les fichiers de backup triés par date (plus récent en premier)
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.sql'))
    .map((f) => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Plus récent en premier

  return files;
}

/**
 * Supprime les anciens backups en gardant seulement les MAX_BACKUPS plus récents
 */
function rotateBackups() {
  const backups = listBackups();

  if (backups.length <= MAX_BACKUPS) {
    console.log(`📂 ${backups.length} backup(s) au total (max: ${MAX_BACKUPS})`);
    return;
  }

  const toDelete = backups.slice(MAX_BACKUPS);
  console.log(`🗑️  Suppression de ${toDelete.length} ancien(s) backup(s)...`);

  toDelete.forEach((backup) => {
    try {
      fs.unlinkSync(backup.path);
      console.log(`   ✓ Supprimé: ${backup.name}`);
    } catch (err) {
      console.error(`   ✗ Erreur lors de la suppression de ${backup.name}:`, err.message);
    }
  });

  console.log(`✓ Rotation terminée. ${MAX_BACKUPS} backup(s) conservé(s)`);
}

/**
 * Affiche un résumé des backups disponibles
 */
function showBackupSummary() {
  const backups = listBackups();

  if (backups.length === 0) {
    console.log('ℹ️  Aucun backup trouvé');
    return;
  }

  console.log('\n📊 Backups disponibles:');
  console.log('─'.repeat(60));

  backups.slice(0, 5).forEach((backup, idx) => {
    const date = new Date(backup.time);
    const size = (fs.statSync(backup.path).size / (1024 * 1024)).toFixed(2);
    const dateStr = date.toLocaleString('fr-FR');
    console.log(`${idx + 1}. ${backup.name}`);
    console.log(`   📅 ${dateStr} | 💾 ${size} MB`);
  });

  if (backups.length > 5) {
    console.log(`   ... et ${backups.length - 5} autre(s) backup(s)`);
  }
  console.log('─'.repeat(60));
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔄 Backup automatique de la base de données');
  console.log('═'.repeat(60));

  try {
    // Créer le backup
    await createBackup();

    // Rotation des backups
    rotateBackups();

    // Afficher le résumé
    showBackupSummary();

    console.log('\n✅ Backup terminé avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors du backup:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { createBackup, rotateBackups, listBackups };
