

(function() {
  'use strict';

  
  const SKELETON_TEMPLATES = {
    
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

    
    'product-list': (count = 5) => {
      let html = '<div class="skeleton-product-list">';
      for (let i = 0; i < count; i++) {
        html += SKELETON_TEMPLATES['product-item']();
      }
      html += '</div>';
      return html;
    },

    
    'text': (lines = 3) => {
      let html = '<div>';
      for (let i = 0; i < lines; i++) {
        const width = i === lines - 1 ? '70%' : '100%';
        html += `<div class="skeleton skeleton-text" style="width: ${width};"></div>`;
      }
      html += '</div>';
      return html;
    },

    
    'header': () => `
      <div style="margin-bottom: 24px;">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-subtitle"></div>
      </div>
    `,

    
    'grid': (count = 6) => {
      let html = '<div class="skeleton-grid">';
      for (let i = 0; i < count; i++) {
        html += SKELETON_TEMPLATES['menu-card']();
      }
      html += '</div>';
      return html;
    },

    
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

  
  function createSkeleton(type, countOrContainer, container) {
    const template = SKELETON_TEMPLATES[type];
    
    if (!template) {
      console.warn(`Unknown skeleton type: ${type}`);
      return '';
    }

        let html;
    if (type === 'grid' || type === 'product-list' || type === 'text') {
      const count = typeof countOrContainer === 'number' ? countOrContainer : 3;
      html = template(count);
    } else if (typeof countOrContainer === 'number') {
            html = '';
      for (let i = 0; i < countOrContainer; i++) {
        html += template();
      }
    } else {
      html = template();
    }

        const targetContainer = container || (countOrContainer instanceof HTMLElement ? countOrContainer : null);
    if (targetContainer) {
      targetContainer.innerHTML = html;
      return;
    }

    return html;
  }

  
  function showSkeleton(selector, type, count) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return;
    }
    
    createSkeleton(type, count, element);
  }

  
  function hideSkeleton(selector, content) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return;
    }
    
        element.style.opacity = '0.5';
    element.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
      element.innerHTML = content || '';
      element.style.opacity = '1';
    }, 300);
  }

  
  async function withSkeleton(selector, skeletonType, asyncFn, count = 1) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return;
    }

        showSkeleton(element, skeletonType, count);

    try {
            const result = await asyncFn();
      
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

    window.createSkeleton = createSkeleton;
  window.showSkeleton = showSkeleton;
  window.hideSkeleton = hideSkeleton;
  window.withSkeleton = withSkeleton;
  window.skeletonTemplates = SKELETON_TEMPLATES;

})();
