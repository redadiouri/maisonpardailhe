/**
 * Skeleton Loader Helper
 * Utilitaire pour créer facilement des skeleton loaders
 * Usage:
 *   createSkeleton('menu-card', 3)
 *   createSkeleton('order-recap')
 *   createSkeleton('product-list', 5)
 */

(function() {
  'use strict';

  /**
   * Templates de skeleton pré-définis
   */
  const SKELETON_TEMPLATES = {
    /**
     * Skeleton pour une carte menu
     */
    'menu-card': () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-card-image"></div>
        <div class="skeleton skeleton-card-title"></div>
        <div class="skeleton skeleton-card-text"></div>
        <div class="skeleton skeleton-card-text" style="width: 80%;"></div>
        <div class="skeleton skeleton-card-text" style="width: 40%;"></div>
        <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div class="skeleton skeleton-button" style="width: 100px;"></div>
          <div class="skeleton" style="width: 80px; height: 32px; border-radius: 6px;"></div>
        </div>
      </div>
    `,

    /**
     * Skeleton pour le récapitulatif de commande
     */
    'order-recap': () => `
      <div class="skeleton-order-card">
        <div class="skeleton-order-header">
          <div class="skeleton skeleton-circle"></div>
          <div style="flex: 1;">
            <div class="skeleton" style="height: 28px; width: 40%; margin-bottom: 8px; border-radius: 6px;"></div>
            <div class="skeleton" style="height: 18px; width: 60%; border-radius: 4px;"></div>
          </div>
        </div>
        
        <div class="skeleton-order-info">
          <div class="skeleton skeleton-order-icon"></div>
          <div class="skeleton-order-content">
            <div class="skeleton skeleton-order-label"></div>
            <div class="skeleton skeleton-order-value"></div>
          </div>
        </div>
        
        <div class="skeleton-order-info">
          <div class="skeleton skeleton-order-icon"></div>
          <div class="skeleton-order-content">
            <div class="skeleton skeleton-order-label"></div>
            <div class="skeleton skeleton-order-value"></div>
          </div>
        </div>
        
        <div class="skeleton-order-info">
          <div class="skeleton skeleton-order-icon"></div>
          <div class="skeleton-order-content">
            <div class="skeleton skeleton-order-label"></div>
            <div class="skeleton skeleton-order-value"></div>
          </div>
        </div>
        
        <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
          <div class="skeleton" style="height: 22px; width: 150px; margin-bottom: 12px; border-radius: 5px;"></div>
          ${SKELETON_TEMPLATES['product-item']()}
          ${SKELETON_TEMPLATES['product-item']()}
          ${SKELETON_TEMPLATES['product-item']()}
        </div>
        
        <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
          <div class="skeleton" style="height: 24px; width: 100px; border-radius: 6px;"></div>
          <div class="skeleton" style="height: 32px; width: 120px; border-radius: 8px;"></div>
        </div>
      </div>
    `,

    /**
     * Skeleton pour un item de produit
     */
    'product-item': () => `
      <div class="skeleton-product-item">
        <div class="skeleton skeleton-product-image"></div>
        <div class="skeleton-product-details">
          <div class="skeleton skeleton-product-name"></div>
          <div class="skeleton skeleton-product-price"></div>
        </div>
        <div class="skeleton" style="width: 60px; height: 24px; border-radius: 6px;"></div>
      </div>
    `,

    /**
     * Skeleton pour liste de produits
     */
    'product-list': (count = 5) => {
      let html = '<div class="skeleton-product-list">';
      for (let i = 0; i < count; i++) {
        html += SKELETON_TEMPLATES['product-item']();
      }
      html += '</div>';
      return html;
    },

    /**
     * Skeleton pour texte simple
     */
    'text': (lines = 3) => {
      let html = '<div>';
      for (let i = 0; i < lines; i++) {
        const width = i === lines - 1 ? '70%' : '100%';
        html += `<div class="skeleton skeleton-text" style="width: ${width};"></div>`;
      }
      html += '</div>';
      return html;
    },

    /**
     * Skeleton pour titre + sous-titre
     */
    'header': () => `
      <div style="margin-bottom: 24px;">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-subtitle"></div>
      </div>
    `,

    /**
     * Skeleton pour une grille de cartes
     */
    'grid': (count = 6) => {
      let html = '<div class="skeleton-grid">';
      for (let i = 0; i < count; i++) {
        html += SKELETON_TEMPLATES['menu-card']();
      }
      html += '</div>';
      return html;
    },

    /**
     * Skeleton pour formulaire
     */
    'form': () => `
      <div style="max-width: 600px; margin: 0 auto;">
        <div class="skeleton skeleton-title" style="width: 50%; margin-bottom: 32px;"></div>
        
        <div style="margin-bottom: 20px;">
          <div class="skeleton" style="height: 14px; width: 100px; margin-bottom: 8px; border-radius: 3px;"></div>
          <div class="skeleton" style="height: 44px; width: 100%; border-radius: 8px;"></div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div class="skeleton" style="height: 14px; width: 120px; margin-bottom: 8px; border-radius: 3px;"></div>
          <div class="skeleton" style="height: 44px; width: 100%; border-radius: 8px;"></div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div class="skeleton" style="height: 14px; width: 80px; margin-bottom: 8px; border-radius: 3px;"></div>
          <div class="skeleton" style="height: 44px; width: 100%; border-radius: 8px;"></div>
        </div>
        
        <div style="margin-top: 32px;">
          <div class="skeleton skeleton-button" style="width: 160px; height: 48px;"></div>
        </div>
      </div>
    `
  };

  /**
   * Crée un skeleton loader
   * @param {string} type - Type de skeleton (menu-card, order-recap, etc.)
   * @param {number|HTMLElement} countOrContainer - Nombre de répétitions ou container DOM
   * @param {HTMLElement} container - Container DOM (si countOrContainer est un nombre)
   * @returns {string|void} HTML string ou void si inséré dans le DOM
   */
  function createSkeleton(type, countOrContainer, container) {
    const template = SKELETON_TEMPLATES[type];
    
    if (!template) {
      console.warn(`Unknown skeleton type: ${type}`);
      return '';
    }

    // Si le type supporte un count (grid, product-list)
    let html;
    if (type === 'grid' || type === 'product-list' || type === 'text') {
      const count = typeof countOrContainer === 'number' ? countOrContainer : 3;
      html = template(count);
    } else if (typeof countOrContainer === 'number') {
      // Répéter le template N fois
      html = '';
      for (let i = 0; i < countOrContainer; i++) {
        html += template();
      }
    } else {
      html = template();
    }

    // Si un container DOM est fourni, insérer directement
    const targetContainer = container || (countOrContainer instanceof HTMLElement ? countOrContainer : null);
    if (targetContainer) {
      targetContainer.innerHTML = html;
      return;
    }

    return html;
  }

  /**
   * Affiche un skeleton dans un élément
   * @param {string|HTMLElement} selector - Sélecteur CSS ou élément DOM
   * @param {string} type - Type de skeleton
   * @param {number} count - Nombre de répétitions
   */
  function showSkeleton(selector, type, count) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return;
    }
    
    createSkeleton(type, count, element);
  }

  /**
   * Cache un skeleton et affiche le contenu
   * @param {string|HTMLElement} selector - Sélecteur CSS ou élément DOM
   * @param {string} content - Contenu HTML à afficher
   */
  function hideSkeleton(selector, content) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return;
    }
    
    // Fade out skeleton, fade in content
    element.style.opacity = '0.5';
    element.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
      element.innerHTML = content || '';
      element.style.opacity = '1';
    }, 300);
  }

  /**
   * Enveloppe async avec skeleton loader
   * @param {string|HTMLElement} selector - Sélecteur CSS ou élément DOM
   * @param {string} skeletonType - Type de skeleton
   * @param {Function} asyncFn - Fonction asynchrone
   * @param {number} count - Nombre de répétitions du skeleton
   */
  async function withSkeleton(selector, skeletonType, asyncFn, count = 1) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return;
    }

    // Afficher skeleton
    showSkeleton(element, skeletonType, count);

    try {
      // Exécuter la fonction async
      const result = await asyncFn();
      
      // Le contenu sera probablement mis à jour par asyncFn
      // mais on peut retourner le résultat
      return result;
    } catch (error) {
      console.error('Error in withSkeleton:', error);
      element.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p>Une erreur est survenue lors du chargement.</p>
          <button onclick="location.reload()" class="btn" style="margin-top: 16px;">Réessayer</button>
        </div>
      `;
      throw error;
    }
  }

  // Exposer les fonctions globalement
  window.createSkeleton = createSkeleton;
  window.showSkeleton = showSkeleton;
  window.hideSkeleton = hideSkeleton;
  window.withSkeleton = withSkeleton;
  window.skeletonTemplates = SKELETON_TEMPLATES;

})();
