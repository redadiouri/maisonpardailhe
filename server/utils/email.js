// Placeholder pour l’envoi d’email
const logger = require('../logger');

function sendEmail(to, type, commande, raison = '') {
  let subject, html;
  if (type === 'acceptation') {
    subject = 'Votre commande Maison Pardailhé est acceptée';
    html = `<p>Bonjour ${commande.nom_complet},<br>Votre commande du ${commande.date_retrait} (${commande.produit}) a été acceptée.<br>Merci et à bientôt !</p>`;
  } else if (type === 'refus') {
    subject = 'Votre commande Maison Pardailhé a été refusée';
    html = `<p>Bonjour ${commande.nom_complet},<br>Votre commande du ${commande.date_retrait} (${commande.produit}) a été refusée.<br>Raison : ${raison}</p>`;
  }
  // Ici, on utiliserait nodemailer plus tard
  // Log only non-sensitive metadata; avoid dumping the full HTML body at info level.
  logger.info({ to, subject, orderId: commande && commande.id }, '[EMAIL] queued');
  // HTML body can be logged at debug level for troubleshooting (not in production)
  logger.debug({ html }, '[EMAIL] body (debug)');
}

module.exports = { sendEmail };
