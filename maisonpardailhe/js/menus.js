// Fetch menus from API and render them on menu.html and in the click & collect selection panel
(function(){
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
    // badge only if price or quote
    const badge = document.createElement('span');
    badge.className = 'menu-badge';
    badge.textContent = m.is_quote ? 'Sur devis' : (m.price_cents && m.price_cents>0 ? '' : '');
    if (!m.is_quote) {
      // leave badge empty if not needed
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

    article.appendChild(badge);
    article.appendChild(h3);
    article.appendChild(p);
    article.appendChild(priceDiv);
    return article;
  }

  function renderSelectionItem(m) {
    const div = document.createElement('div');
    div.className = 'selection-item';
    div.dataset.menuId = String(m.id);
    const info = document.createElement('div'); info.className = 'selection-item__info';
    const h4 = document.createElement('h4'); h4.textContent = m.name;
    const p = document.createElement('p'); p.textContent = m.description || '';
    info.appendChild(h4); info.appendChild(p);

    const controls = document.createElement('div'); controls.className = 'selection-item__controls';
    const dec = document.createElement('button'); dec.type='button'; dec.className='quantity-btn'; dec.dataset.action='decrement'; dec.setAttribute('aria-label','Retirer'); dec.textContent='−';
    const input = document.createElement('input'); input.type='number'; input.min='0'; input.value='0'; input.name = `cc-items[${m.id}]`;
    const inc = document.createElement('button'); inc.type='button'; inc.className='quantity-btn'; inc.dataset.action='increment'; inc.setAttribute('aria-label','Ajouter'); inc.textContent='+';
    const stockSpan = document.createElement('div'); stockSpan.style.fontSize='0.85rem'; stockSpan.style.color='rgba(247,247,247,0.7)'; stockSpan.style.marginLeft='0.5rem'; stockSpan.textContent = `Stock: ${m.stock}`;
    if (m.stock <= 0) {
      inc.disabled = true;
      div.classList.add('selection-item--disabled');
    }
    controls.appendChild(dec); controls.appendChild(input); controls.appendChild(inc); controls.appendChild(stockSpan);

    div.appendChild(info); div.appendChild(controls);
    return div;
  }

  async function init() {
    const menus = await fetchMenus();
    // render on menu.html
    const root = document.getElementById('menus-root');
    if (root) {
      root.innerHTML = '';
      menus.forEach(m => {
        const card = renderMenuCard(m);
        root.appendChild(card);
      });
    }
    // render selection panel on index.html
    const grid = document.getElementById('selection-grid');
    if (grid) {
      grid.innerHTML = '';
      menus.forEach(m => {
        // skip items not visible_on_menu? still include
        const item = renderSelectionItem(m);
        grid.appendChild(item);
      });
      // signal that menus are loaded so other scripts may attach handlers
      document.dispatchEvent(new CustomEvent('menus:loaded'));
    }
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
