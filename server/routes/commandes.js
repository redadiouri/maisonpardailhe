const express = require('express');
const router = express.Router();
const Commande = require('../models/commande');

// Validation simple
function validateCommande(data) {
  return data.nom_complet && data.telephone && data.produit && data.date_retrait && data.creneau;
}

router.post('/', async (req, res) => {
  const data = req.body;
  if (!validateCommande(data)) {
    return res.status(400).json({ message: 'Champs obligatoires manquants.' });
  }
  try {
    const id = await Commande.create(data);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
