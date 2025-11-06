// small util to read query params
function qp(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function escapeHtml(s){ if (s===undefined||s===null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// SVG Icons
const icons = {
  user: '<svg class="order-info-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
  phone: '<svg class="order-info-icon" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  email: '<svg class="order-info-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  location: '<svg class="order-info-icon" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
  calendar: '<svg class="order-info-icon" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>',
  clock: '<svg class="order-info-icon" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
  note: '<svg class="order-info-icon" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
  utensils: '<svg class="product-icon" viewBox="0 0 24 24"><path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/></svg>',
  money: '<svg class="price-icon" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>',
  clipboard: '<svg class="card-icon" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
  check: '<svg class="status-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
  clock_status: '<svg class="status-icon" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
  close: '<svg class="status-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  hourglass: '<svg class="status-icon" viewBox="0 0 24 24"><path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/></svg>'
};

// Map statut to French labels and icons
const statutConfig = {
  'en_attente': { label: 'En attente', icon: icons.hourglass },
  'en_cours': { label: 'Acceptée - En cours', icon: icons.clock_status },
  'terminée': { label: 'Terminée', icon: icons.check },
  'refusée': { label: 'Refusée', icon: icons.close }
};

// Load menu names from API
async function loadMenuNames() {
  try {
    const res = await fetch('/api/menus');
    if (!res.ok) return new Map();
    const menus = await res.json();
    const map = new Map();
    if (Array.isArray(menus)) {
      menus.forEach(m => {
        if (m.id && m.name) map.set(Number(m.id), m.name);
      });
    }
    return map;
  } catch (e) {
    console.error('Erreur chargement menus:', e);
    return new Map();
  }
}

// Render products as a beautiful table with icons
async function renderProducts(produit){
  // Load menu names first
  const menuNames = await loadMenuNames();
  
  // produit may be JSON array or legacy string
  try {
    const arr = JSON.parse(produit);
    if (Array.isArray(arr)){
      const rows = arr.map(it=>{
        const menuId = Number(it.menu_id);
        // Try to get the real menu name from the API
        const name = menuNames.get(menuId) || it.title || it.name || `Article #${menuId || ''}`;
        const qty = escapeHtml(String(it.qty || it.quantity || '1'));
        return `<tr>
          <td class="product-name">${icons.utensils}${escapeHtml(name)}</td>
          <td class="product-qty">×${qty}</td>
        </tr>`;
      }).join('');
      return `<table class="products-table"><tbody>${rows}</tbody></table>`;
    }
  } catch (e){ /* not JSON */ }
  // fallback: plain preformatted or semi-parsed string
  return `<div style="padding:12px;background:#f8f9fa;border-radius:8px;white-space:pre-wrap;">${escapeHtml(String(produit||''))}</div>`;
}

// Format price in euros
function formatPrice(cents) {
  if (!cents || isNaN(cents)) return '';
  return `${(cents / 100).toFixed(2)} €`;
}

(async function(){
  const id = qp('id');
  // Fetch server-side config (timezone, app URL). Fallback to Europe/Paris.
  let TZ = 'Europe/Paris';
  try {
    const cfgRes = await fetch('/api/config');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (cfg && cfg.timezone) TZ = cfg.timezone;
    }
  } catch (e) {
    // ignore, keep default TZ
  }
  const title = document.getElementById('page-title');
  const sub = document.getElementById('page-sub');
  const recap = document.getElementById('recap');
  const spinner = document.getElementById('recap-spinner');
  const spinText = document.getElementById('recap-spin-text');
  if (!id){ title.textContent = 'Commande introuvable'; sub.textContent = 'Identifiant manquant dans l\'URL.'; return; }
  title.textContent = `Récapitulatif — Commande #${id}`;
  try{
    // show spinner
    if (spinner) spinner.style.display = 'block';
    const res = await fetch(`/api/commandes/${id}`);
    if (!res.ok){
      if (res.status===404) {
        sub.textContent = 'Commande introuvable. Vérifiez l\'identifiant ou contactez-nous.';
      } else if (res.status >= 500) {
        sub.textContent = 'Erreur serveur. Réessayez dans quelques instants.';
      } else {
        sub.textContent = 'Impossible de récupérer la commande. Vérifiez votre connexion.';
      }
      if (spinner) spinner.style.display = 'none';
      return;
    }
    const data = await res.json();
    const cmd = data && data.commande;
    if (!cmd){ sub.textContent = 'Données invalides.'; return; }
    sub.style.display='none'; recap.style.display='block'; if (spinner) spinner.style.display = 'none';
    
    // small helper: format date strings into human-friendly French date
    function formatDateForDisplay(d){
      if (!d) return '';
      try {
        // Parse into Date and format in configured timezone to avoid UTC offset crossing days
        const dt = new Date(d);
        if (isNaN(dt)) return escapeHtml(String(d));
        const fmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
        return fmt.format(dt);
      } catch (e) {
        return escapeHtml(String(d));
      }
    }

    // Format full datetime
    function formatDateTimeForDisplay(d){
      if (!d) return '';
      try {
        const dt = new Date(d);
        if (isNaN(dt)) return escapeHtml(String(d));
        const fmt = new Intl.DateTimeFormat('fr-FR', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: TZ 
        });
        return fmt.format(dt);
      } catch (e) {
        return escapeHtml(String(d));
      }
    }

    // Build status badge
    const statutClass = `status-${cmd.statut || 'en_attente'}`;
    const config = statutConfig[cmd.statut] || { label: escapeHtml(cmd.statut || 'Inconnu'), icon: icons.clipboard };
    const statusBadge = `<span class="status-badge ${statutClass}">${config.icon}${config.label}</span>`;

    // Build order header
    const orderDate = cmd.date_creation ? formatDateTimeForDisplay(cmd.date_creation) : '';
    const headerHtml = `
      <div class="order-header">
        <h1>Commande #${escapeHtml(id)}</h1>
        <p>${orderDate ? `Passée le ${orderDate}` : ''}</p>
      </div>
    `;

    // Build customer info card
    const customerInfo = `
      <div class="order-card">
        <h2><svg class="card-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> Informations client</h2>
        ${cmd.nom_complet ? `
          <div class="order-info-row">
            ${icons.user}
            <div class="order-info-content">
              <div class="order-info-label">Nom complet</div>
              <div class="order-info-value">${escapeHtml(cmd.nom_complet)}</div>
            </div>
          </div>
        ` : ''}
        ${cmd.telephone ? `
          <div class="order-info-row">
            ${icons.phone}
            <div class="order-info-content">
              <div class="order-info-label">Téléphone</div>
              <div class="order-info-value"><a href="tel:${escapeHtml(cmd.telephone)}">${escapeHtml(cmd.telephone)}</a></div>
            </div>
          </div>
        ` : ''}
        ${cmd.email ? `
          <div class="order-info-row">
            ${icons.email}
            <div class="order-info-content">
              <div class="order-info-label">Email</div>
              <div class="order-info-value"><a href="mailto:${escapeHtml(cmd.email)}">${escapeHtml(cmd.email)}</a></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Build pickup info card
    const pickupDate = cmd.date_retrait ? formatDateForDisplay(cmd.date_retrait) : '';
    const pickupTime = cmd.creneau ? escapeHtml(cmd.creneau) : '';
    const pickupLocation = cmd.location ? escapeHtml(cmd.location) : '';
    
    const pickupInfo = `
      <div class="order-card">
        <h2><svg class="card-icon" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> Informations de retrait</h2>
        ${pickupLocation ? `
          <div class="order-info-row">
            ${icons.location}
            <div class="order-info-content">
              <div class="order-info-label">Lieu</div>
              <div class="order-info-value">${pickupLocation}</div>
            </div>
          </div>
        ` : ''}
        ${pickupDate ? `
          <div class="order-info-row">
            ${icons.calendar}
            <div class="order-info-content">
              <div class="order-info-label">Date</div>
              <div class="order-info-value">${pickupDate}</div>
            </div>
          </div>
        ` : ''}
        ${pickupTime ? `
          <div class="order-info-row">
            ${icons.clock}
            <div class="order-info-content">
              <div class="order-info-label">Créneau horaire</div>
              <div class="order-info-value">${pickupTime}</div>
            </div>
          </div>
        ` : ''}
        ${cmd.precisions ? `
          <div class="order-info-row">
            ${icons.note}
            <div class="order-info-content">
              <div class="order-info-label">Précisions</div>
              <div class="order-info-value">${escapeHtml(cmd.precisions)}</div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Build products card
    const productsHtml = await renderProducts(cmd.produit);
    const totalPrice = cmd.total_cents ? `<div class="total-price">${icons.money}Total : <strong>${formatPrice(cmd.total_cents)}</strong></div>` : '';
    
    const productsCard = `
      <div class="order-card" style="grid-column: 1 / -1;">
        <h2><svg class="card-icon" viewBox="0 0 24 24"><path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/></svg> Produits commandés</h2>
        ${productsHtml}
        ${totalPrice}
      </div>
    `;

    // Build status card
    const statusCard = `
      <div class="order-card" style="grid-column: 1 / -1; text-align: center;">
        <h2 style="justify-content: center;">${icons.clipboard} Statut de la commande</h2>
        <div style="margin-top: 20px;">
          ${statusBadge}
        </div>
        ${cmd.raison_refus ? `
          <div class="refusal-reason">
            <strong>⚠ Raison du refus :</strong>
            <div>${escapeHtml(cmd.raison_refus)}</div>
          </div>
        ` : ''}
      </div>
    `;

    // Assemble everything
    recap.innerHTML = `
      ${headerHtml}
      <div class="order-container">
        ${customerInfo}
        ${pickupInfo}
        ${productsCard}
        ${statusCard}
      </div>
    `;
  }catch(err){ console.error(err); if (spinner) spinner.style.display = 'none'; sub.textContent='Impossible de charger la commande. Vérifiez votre connexion ou réessayez.'; }
})();
