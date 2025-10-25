// Placeholder pour l’envoi d’email
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
  console.log(`[EMAIL] To: ${to} | Subject: ${subject} | HTML: ${html}`);
}

module.exports = { sendEmail };
