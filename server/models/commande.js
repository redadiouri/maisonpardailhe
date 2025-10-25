const db = require('./db');

const Commande = {
  create: async (data) => {
    const [result] = await db.execute(
      `INSERT INTO commandes (nom_complet, telephone, produit, date_retrait, creneau, precisions, statut) VALUES (?, ?, ?, ?, ?, ?, 'en_attente')`,
      [data.nom_complet, data.telephone, data.produit, data.date_retrait, data.creneau, data.precisions]
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
