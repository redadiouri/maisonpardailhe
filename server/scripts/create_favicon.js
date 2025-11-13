/**
 * Script pour créer un favicon.ico à partir du logo.png
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createFavicon() {
  const logoPath = path.join(__dirname, '../../maisonpardailhe/img/logo.png');
  const faviconPath = path.join(__dirname, '../../maisonpardailhe/favicon.ico');

  console.log('🎨 Création du favicon à partir du logo...');

  try {
    // Vérifier si le logo existe
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo non trouvé:', logoPath);
      process.exit(1);
    }

    // Créer plusieurs tailles pour le favicon (16x16, 32x32, 48x48)
    const sizes = [16, 32, 48];

    for (const size of sizes) {
      const outputPath = path.join(__dirname, `../../maisonpardailhe/favicon-${size}x${size}.png`);
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Créé: favicon-${size}x${size}.png`);
    }

    console.log('✨ Favicons créés avec succès!');
    console.log('💡 Pour un vrai .ico, utilisez un outil en ligne comme:');
    console.log('   https://www.favicon-generator.org/');
    console.log('   https://realfavicongenerator.net/');
  } catch (error) {
    console.error('❌ Erreur lors de la création du favicon:', error.message);
    process.exit(1);
  }
}

createFavicon();
