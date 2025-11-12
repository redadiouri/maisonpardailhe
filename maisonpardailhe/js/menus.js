(function(){
  let allMenus = []; // Stocker tous les menus
  let menuPagination = null; // Instance de pagination

  async function fetchMenus() {
    try {
      const res = await fetch('/api/menus');
      if (!res.ok) throw new Error('Failed to load menus');
      return await res.json();
    } catch (e) {
      console.error('menus.js: could not fetch menus', e);
      return [];
    }
  }

  function formatPrice(cents) {
    if (!Number.isFinite(Number(cents))) return '';
    return (Number(cents)/100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
  }

  function renderMenuCard(m) {
    const article = document.createElement('article');
    article.className = 'menu-card';
    
    // Image du menu
    if (m.image_url) {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'menu-card__image';
      const img = document.createElement('img');
      img.src = m.image_url;
      img.alt = m.name;
      img.loading = 'lazy';
      imgContainer.appendChild(img);
      article.appendChild(imgContainer);
    }
    
    // Wrapper pour le contenu
    const content = document.createElement('div');
    content.className = 'menu-card__content';
    
    const badge = document.createElement('span');
    badge.className = 'menu-badge';
    badge.textContent = m.is_quote ? 'Sur devis' : (m.price_cents && m.price_cents>0 ? '' : '');
    if (!m.is_quote) {
      badge.style.display = 'none';
    }
    const h3 = document.createElement('h3'); h3.textContent = m.name;
    const p = document.createElement('p'); p.textContent = m.description || '';
    const priceDiv = document.createElement('div'); priceDiv.className = 'menu-price';
    const span = document.createElement('span');
    span.textContent = m.is_quote ? 'Sur devis' : 'Prix';
    const strong = document.createElement('strong');
    strong.textContent = m.is_quote ? 'Nous contacter' : formatPrice(m.price_cents);
    priceDiv.appendChild(span); priceDiv.appendChild(strong);

    content.appendChild(badge);
    content.appendChild(h3);
    content.appendChild(p);
    content.appendChild(priceDiv);
    
    article.appendChild(content);
    return article;
  }

  function renderSelectionItem(m) {
    const div = document.createElement('div');
  div.className = 'selection-item';
  div.dataset.menuId = String(m.id);
    div.dataset.priceCents = String(Number(m.price_cents || 0));
    
    const info = document.createElement('div'); 
    info.className = 'selection-item__info';
    
    // Image du menu (petite vignette)
    if (m.image_url) {
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'selection-item__image';
      const img = document.createElement('img');
      img.src = m.image_url;
      img.alt = m.name;
      img.loading = 'lazy';
      imgWrapper.appendChild(img);
      info.appendChild(imgWrapper);
    }
    
    const textInfo = document.createElement('div');
    textInfo.className = 'selection-item__text';
    const h4 = document.createElement('h4'); h4.textContent = m.name;
    const p = document.createElement('p'); p.textContent = m.description || '';
    textInfo.appendChild(h4); 
    textInfo.appendChild(p);
    info.appendChild(textInfo);

    const controls = document.createElement('div'); controls.className = 'selection-item__controls';
    const dec = document.createElement('button'); dec.type='button'; dec.className='quantity-btn'; dec.dataset.action='decrement'; dec.setAttribute('aria-label','Retirer'); dec.textContent='−';
  const input = document.createElement('input'); input.type='number'; input.min='0'; input.value='0'; input.name = `cc-items[${m.id}]`;
    input.max = String(Math.max(0, Number(m.stock || 0)));
  input.dataset.max = String(Math.max(0, Number(m.stock || 0)));
    const inc = document.createElement('button'); inc.type='button'; inc.className='quantity-btn'; inc.dataset.action='increment'; inc.setAttribute('aria-label','Ajouter'); inc.textContent='+';
  const stockSpan = document.createElement('div'); stockSpan.className = 'selection-item__stock'; stockSpan.textContent = `Stock: ${m.stock}`;
    const priceDiv = document.createElement('div'); priceDiv.className = 'selection-item__price';
  priceDiv.textContent = m.is_quote ? 'Sur devis' : formatPrice(m.price_cents);
    if (m.stock <= 0) {
      inc.disabled = true;
      input.disabled = true;
      div.classList.add('selection-item--disabled');
    }
  controls.appendChild(dec); controls.appendChild(input); controls.appendChild(inc); controls.appendChild(priceDiv); controls.appendChild(stockSpan);

    div.appendChild(info); div.appendChild(controls);
    return div;
  }

  async function init() {
    const menus = await fetchMenus();
    allMenus = menus; // Sauvegarder tous les menus
    
    // Page menu.html - Affichage avec pagination
    const root = document.getElementById('menus-root');
    if (root) {
      // Initialiser la pagination
      if (typeof Pagination !== 'undefined') {
        menuPagination = new Pagination({
          currentPage: 1,
          itemsPerPage: 12,
          totalItems: menus.length,
          maxButtons: 5,
          containerSelector: '#menu-pagination',
          onPageChange: (page) => {
            renderMenus(menus);
            // Scroll vers le haut de la liste
            const menuSection = document.getElementById('menu-list');
            if (menuSection) {
              menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
        
        renderMenus(menus);
        menuPagination.render();
      } else {
        // Fallback sans pagination
        renderMenus(menus);
      }
    }
    
    // Page commande.html - Liste de sélection (sans pagination)
    const grid = document.getElementById('selection-grid');
    if (grid) {
      grid.innerHTML = '';
      menus.forEach(m => {
        // Ne pas afficher les items "sur devis" dans la sélection
        if (m.is_quote) return;
        const item = renderSelectionItem(m);
        grid.appendChild(item);
      });
      // Dispatch event pour la page commande
      document.dispatchEvent(new CustomEvent('menus:loaded'));
    }
  }
  
  function renderMenus(menus) {
    const root = document.getElementById('menus-root');
    if (!root) return;
    
    root.innerHTML = '';
    
    // Obtenir les items pour la page courante
    const itemsToShow = menuPagination 
      ? menuPagination.getPaginatedItems(menus)
      : menus;
    
    if (itemsToShow.length === 0) {
      root.innerHTML = '<p style="text-align:center;color:#666;padding:2rem;">Aucun menu disponible pour le moment.</p>';
      return;
    }
    
    itemsToShow.forEach(m => {
      const card = renderMenuCard(m);
      root.appendChild(card);
    });
  }

    if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
