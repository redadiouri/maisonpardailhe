const db = require('./db');
const logger = require('../logger');
const { sendCommandeEmail } = require('../utils/email');

const Commande = {
  create: async (data) => {
    const [result] = await db.execute(
      `INSERT INTO commandes (nom_complet, telephone, email, produit, date_retrait, creneau, location, precisions, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')`,
    [data.nom_complet, data.telephone, data.email || '', data.produit, data.date_retrait, data.creneau, data.location || 'roquettes', data.precisions]
    );
    return result.insertId;
  },
  getByStatut: async (statut) => {
    const [rows] = await db.execute(
      `SELECT * FROM commandes WHERE statut = ? ORDER BY date_creation DESC`,
      [statut]
    );
    return rows;
  },
  updateStatut: async (id, statut, raison_refus = null) => {
    const [result] = await db.execute(
      `UPDATE commandes SET statut = ?, raison_refus = ? WHERE id = ?`,
      [statut, raison_refus, id]
    );
    // If the update succeeded, attempt to notify the customer depending on status
    try {
      if (result.affectedRows > 0) {
        const commande = await (async () => {
          const [rows] = await db.execute(`SELECT * FROM commandes WHERE id = ?`, [id]);
          return rows && rows[0];
        })();
        if (commande) {
          if (statut === 'en_cours') {
            // Order is now in processing
            try { await sendCommandeEmail('acceptation', commande); } catch (e) { logger.error('Failed to send acceptation email for commande %s: %o', id, e && (e.stack || e)); }
          } else if (statut === 'refusée') {
            try { await sendCommandeEmail('refus', commande, { raison: raison_refus }); } catch (e) { logger.error('Failed to send refusal email for commande %s: %o', id, e && (e.stack || e)); }
          }
        }
      }
    } catch (e) {
      // Non-fatal: log and continue
      logger.error('Error while attempting to notify customer for commande %s: %o', id, e && (e.stack || e));
    }
    return result.affectedRows;
  },
  getById: async (id) => {
    const [rows] = await db.execute(
      `SELECT * FROM commandes WHERE id = ?`,
      [id]
    );
    return rows[0];
  }
};

module.exports = Commande;
