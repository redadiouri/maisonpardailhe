#!/usr/bin/env node

/**
 * Backup de base de données via Node.js pur (sans mysqldump)
 * Utilise mysql2 pour extraire les données et générer un fichier SQL
 *
 * Usage: node scripts/db_backup_node.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const db = require('../models/db');

// Configuration
const DB_NAME = process.env.DB_NAME || 'maisonpardailhe';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '30', 10);

/**
 * Échappe les valeurs pour SQL
 */
function escapeValue(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (Buffer.isBuffer(value)) {
    return `X'${value.toString('hex')}'`;
  }
  // Échapper les chaînes
  return "'" + String(value).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

/**
 * Génère un INSERT statement pour une table
 */
function generateInsert(tableName, rows) {
  if (rows.length === 0) return '';

  const columns = Object.keys(rows[0]);
  const columnsList = columns.map((c) => `\`${c}\``).join(', ');

  let sql = `-- Données pour la table \`${tableName}\`\n`;
  sql += `INSERT INTO \`${tableName}\` (${columnsList}) VALUES\n`;

  const values = rows.map((row) => {
    const vals = columns.map((col) => escapeValue(row[col]));
    return `(${vals.join(', ')})`;
  });

  sql += values.join(',\n');
  sql += ';\n\n';

  return sql;
}

/**
 * Obtient la structure CREATE TABLE
 */
async function getTableStructure(connection, tableName) {
  const [rows] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
  return rows[0]['Create Table'] + ';\n\n';
}

/**
 * Liste toutes les tables
 */
async function getTables(connection) {
  const [rows] = await connection.query('SHOW TABLES');
  return rows.map((r) => Object.values(r)[0]);
}

/**
 * Crée un backup complet
 */
async function createBackup() {
  let connection;
  try {
    // Créer le répertoire de backup
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`✓ Répertoire de backup créé: ${BACKUP_DIR}`);
    }

    // Nom du fichier
    const timestamp = new Date()
      .toISOString()
      .replace(/T/, '_')
      .replace(/\..+/, '')
      .replace(/:/g, '-');
    const filename = `backup-${DB_NAME}-${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    console.log(`📦 Création du backup: ${filename}`);
    console.log(`   Base: ${DB_NAME}`);

    // Obtenir une connexion du pool
    connection = await db.getConnection();

    // En-tête du fichier SQL
    let sqlContent = `-- Backup de la base de données ${DB_NAME}\n`;
    sqlContent += `-- Date: ${new Date().toISOString()}\n`;
    sqlContent += `-- Généré par: db_backup_node.js\n\n`;
    sqlContent += `SET NAMES utf8mb4;\n`;
    sqlContent += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // Obtenir toutes les tables
    const [tableRows] = await connection.query('SHOW TABLES');
    const tables = tableRows.map((r) => Object.values(r)[0]);
    console.log(`   Tables: ${tables.length}`);

    // Pour chaque table
    for (const table of tables) {
      console.log(`   → ${table}`);

      // Structure de la table
      sqlContent += `-- Structure de la table \`${table}\`\n`;
      sqlContent += `DROP TABLE IF EXISTS \`${table}\`;\n`;

      const [createRows] = await connection.query(`SHOW CREATE TABLE \`${table}\``);
      sqlContent += createRows[0]['Create Table'] + ';\n\n';

      // Données de la table
      const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        sqlContent += generateInsert(table, rows);
      }
    }

    // Pied de fichier
    sqlContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    // Écrire le fichier
    fs.writeFileSync(filepath, sqlContent, 'utf8');

    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✓ Backup créé avec succès (${sizeMB} MB)`);

    return filepath;
  } catch (error) {
    console.error("Détails de l'erreur:", error);
    throw new Error(`Erreur lors du backup: ${error.message}`);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Liste tous les backups
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
    .sort((a, b) => b.time - a.time);

  return files;
}

/**
 * Rotation des backups
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
      console.error(`   ✗ Erreur: ${backup.name}`, err.message);
    }
  });

  console.log(`✓ Rotation terminée. ${MAX_BACKUPS} backup(s) conservé(s)`);
}

/**
 * Résumé des backups
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
  console.log('🔄 Backup automatique de la base de données (Node.js)');
  console.log('═'.repeat(60));

  try {
    await createBackup();
    rotateBackups();
    showBackupSummary();

    console.log('\n✅ Backup terminé avec succès!');
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Fermer le pool
    await db.end();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createBackup, rotateBackups, listBackups };
