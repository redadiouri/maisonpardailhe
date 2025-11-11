require('dotenv').config();
const { sendCommandeEmail } = require('../utils/email');

async function run() {
  try {
    // L'adresse email unique fournie par mail-tester.com
    const mailTesterAddress = process.argv[2] || 'test-rttifexpw@srv1.mail-tester.com';
    
    console.log('🧪 Envoi d\'un email de test à mail-tester.com:', mailTesterAddress);
    
    // Commande de test réaliste
    const testCommande = {
      id: 12345,
      nom_complet: 'Jean Dupont',
      email: mailTesterAddress,
      telephone: '0612345678',
      date_retrait: '2025-11-15',
      creneau: '12:30',
      location: 'roquettes',
      total_cents: 2850,
      produit: JSON.stringify([
        { menu_id: 1, name: 'Pâté en croûte', qty: 2, price_cents: 950 },
        { menu_id: 2, name: 'Jambon persillé', qty: 1, price_cents: 950 }
      ]),
      statut: 'pending'
    };
    
    console.log('📧 Type d\'email: creation (confirmation de commande)');
    const res = await sendCommandeEmail('creation', testCommande);
    
    console.log('✅ Email envoyé avec succès!');
    console.log('Résultat:', res);
    console.log('\n🔗 Allez sur https://www.mail-tester.com/ et cliquez sur "Then check your score"');
    console.log('🎯 Objectif: score 10/10');
    
  } catch (e) {
    console.error('❌ Erreur lors de l\'envoi:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

run().then(() => process.exit(0));
