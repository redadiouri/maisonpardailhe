/**
 * Script pour créer un favicon.ico à la racine (requis pour Google Search)
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFaviconIco() {
  const logoPath = path.join(__dirname, '../../maisonpardailhe/img/logo.png');
  const faviconOutputPath = path.join(__dirname, '../../maisonpardailhe/favicon.ico');
  
  console.log('🎨 Création du favicon.ico pour Google Search...');
  
  try {
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo non trouvé:', logoPath);
      process.exit(1);
    }
    
    // Créer un favicon.ico en format PNG (32x32) - c'est le plus compatible
    // Note: Les vrais .ico multi-tailles nécessitent un package spécialisé
    await sharp(logoPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(faviconOutputPath);
    
    console.log('✅ Créé: favicon.ico (32x32 PNG)');
    console.log('');
    console.log('📌 IMPORTANT pour Google Search:');
    console.log('   1. Le fichier doit être à: https://maisonpardailhe.fr/favicon.ico');
    console.log('   2. Format: carré, min 48x48px (Google préfère 256x256px)');
    console.log('   3. Google met plusieurs jours/semaines à mettre à jour');
    console.log('   4. Tester avec: https://search.google.com/test/rich-results');
    console.log('');
    console.log('💡 Pour forcer la mise à jour Google:');
    console.log('   - Google Search Console → Demander une indexation');
    console.log('   - Attendre 2-4 semaines pour le cache Google');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createFaviconIco();
