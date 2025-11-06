(function() {
  'use strict';

  function checkWebPSupport() {
    return new Promise((resolve) => {
      const webp = new Image();
      webp.onload = webp.onerror = () => resolve(webp.height === 2);
      webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  async function convertImagesToWebP() {
    const supportsWebP = await checkWebPSupport();
    
    document.documentElement.classList.add(supportsWebP ? 'webp' : 'no-webp');
    
    if (!supportsWebP) {
      console.log('WebP not supported, using fallback images');
      return;
    }

    const images = document.querySelectorAll('img[data-webp]');
    
    if (images.length === 0) {
      return;
    }

    console.log(`Converting ${images.length} images to WebP format`);
    
    images.forEach(img => {
      const webpPath = img.getAttribute('data-webp');
      if (!webpPath) return;

      const picture = document.createElement('picture');
      
      const source = document.createElement('source');
      source.setAttribute('srcset', webpPath);
      source.setAttribute('type', 'image/webp');

      const newImg = img.cloneNode(true);
      newImg.removeAttribute('data-webp');
      
      if (img.className) {
        picture.className = img.className;
      }

      picture.appendChild(source);
      picture.appendChild(newImg);
      
      img.parentNode.replaceChild(picture, img);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', convertImagesToWebP);
  } else {
    convertImagesToWebP();
  }
})();
