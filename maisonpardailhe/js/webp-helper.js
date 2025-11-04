/**
 * WebP Helper - Utilitaire pour charger automatiquement les images WebP
 * avec fallback PNG/JPEG pour les navigateurs non compatibles
 * 
 * Usage:
 *   <picture>
 *     <source srcset="img/optimized/logo.webp" type="image/webp">
 *     <img src="img/logo.png" alt="Logo" loading="lazy">
 *   </picture>
 * 
 * OU utiliser le helper automatique qui convertit les <img> en <picture>
 */

(function() {
  'use strict';

  // Détection du support WebP
  function checkWebPSupport() {
    return new Promise((resolve) => {
      const webp = new Image();
      webp.onload = webp.onerror = () => resolve(webp.height === 2);
      webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  // Convertir automatiquement les images avec attribut data-webp
  async function convertImagesToWebP() {
    const supportsWebP = await checkWebPSupport();
    if (!supportsWebP) return;

    const images = document.querySelectorAll('img[data-webp]');
    images.forEach(img => {
      const webpPath = img.getAttribute('data-webp');
      if (!webpPath) return;

      const picture = document.createElement('picture');
      const source = document.createElement('source');
      source.setAttribute('srcset', webpPath);
      source.setAttribute('type', 'image/webp');

      const newImg = img.cloneNode(true);
      newImg.removeAttribute('data-webp');

      picture.appendChild(source);
      picture.appendChild(newImg);
      img.parentNode.replaceChild(picture, img);
    });
  }

  // Auto-exécution au chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', convertImagesToWebP);
  } else {
    convertImagesToWebP();
  }
})();
