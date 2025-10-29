// Simple JS pour login et dashboard admin
// Use a relative API base so the admin UI works behind proxies / in production
// (was hardcoded to http://localhost:3001 previously which breaks non-local deployments)
const apiBase = '/api/admin';

// Login
if (document.getElementById('loginForm')) {
  // Afficher/masquer le mot de passe (avec icônes SVG)
  const pwdInput = document.getElementById('loginPassword');
  const togglePwd = document.getElementById('togglePwd');
  const eyeOpenSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const eyeSlashSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2l20 20" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 5c-1.73 0-3.33.35-4.78.98" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12c-1.73 3.89-6 7-11 7-1.25 0-2.45-.18-3.58-.52" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (togglePwd && pwdInput) {
    // initial icon
    togglePwd.innerHTML = eyeOpenSVG;
    togglePwd.onclick = () => {
      const isPassword = pwdInput.type === 'password';
      pwdInput.type = isPassword ? 'text' : 'password';
      togglePwd.innerHTML = isPassword ? eyeSlashSVG : eyeOpenSVG;
    };
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const errorDiv = document.getElementById('loginError');
    const loader = document.getElementById('loginLoader');
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    loader.style.display = 'block';
    document.getElementById('loginBtn').disabled = true;
    try {
      const res = await fetch(apiBase + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      loader.style.display = 'none';
      document.getElementById('loginBtn').disabled = false;
      if (res.ok) {
        window.location.href = 'dashboard.html';
      } else {
        errorDiv.textContent = 'Identifiants invalides.';
        errorDiv.style.display = 'block';
      }
    } catch (err) {
      loader.style.display = 'none';
      document.getElementById('loginBtn').disabled = false;
      errorDiv.textContent = "Erreur serveur. Réessayez plus tard.";
      errorDiv.style.display = 'block';
    }
  });
}

// Animation shake pour erreur
const style = document.createElement('style');
style.innerHTML = `@keyframes shake { 0%{transform:translateX(0);} 25%{transform:translateX(-5px);} 50%{transform:translateX(5px);} 75%{transform:translateX(-5px);} 100%{transform:translateX(0);} }`;
document.head.appendChild(style);

// countdown and badge styles
const cdStyle = document.createElement('style');
cdStyle.innerHTML = `
.countdown { font-weight:700; }
.countdown--expired { color: #ff4d4f; }
.countdown--warning { color: #ff9900; }
.countdown-badge { display:inline-block; min-width:44px; text-align:center; padding:2px 8px; border-radius:12px; font-size:0.75rem; margin-left:8px; color:#fff; background:transparent; }
.countdown-badge.warn { background:#ff9900; }
.countdown-badge.expired { background:#ff4d4f; }
`;
document.head.appendChild(cdStyle);

// cell edit styles (badge / spinner / success / rollback / modified)
const cellEditStyle = document.createElement('style');
cellEditStyle.innerHTML = `
.cell-badge { display:inline-block; margin-left:8px; padding:2px 6px; border-radius:10px; font-size:0.75rem; background:#eee; color:#333; }
.cell-badge.pending { background:#f0f3ff; color:#123; }
.cell-spinner { display:inline-block; width:12px; height:12px; border-radius:50%; border:2px solid rgba(0,0,0,0.12); border-top-color: rgba(0,0,0,0.6); animation: spin 0.8s linear infinite; vertical-align:middle; margin-left:6px; }
@keyframes spin { to { transform: rotate(360deg); } }
.cell-success { display:inline-block; margin-left:8px; color: #0a0; font-weight:700; }
.cell-rollback { animation: rollback 700ms ease; }
@keyframes rollback { 0% { background: rgba(255,100,100,0.15); } 40% { background: rgba(255,60,60,0.25); } 100% { background: transparent; } }
.col-modified { width:64px; text-align:center; }
.row-modified-badge { display:inline-block; background:#ffebcc; color:#7a4b00; padding:2px 6px; border-radius:8px; font-size:0.75rem; }
.cell-undo { margin-left:6px; cursor:pointer; color:#0366d6; text-decoration:underline; font-size:0.75rem; }
`;
document.head.appendChild(cellEditStyle);

// Debug helper: use console.debug when ADMIN_DEBUG is enabled
function adminDebug(...args) {
  try {
    const enabledGlobal = (typeof window !== 'undefined' && window.ADMIN_DEBUG === true);
    const enabledStorage = (typeof localStorage !== 'undefined' && (localStorage.getItem('admin.debug') === '1' || localStorage.getItem('admin.debug') === 'true'));
    if (enabledGlobal || enabledStorage) {
      if (console && typeof console.debug === 'function') console.debug(...args);
      else if (console && typeof console.log === 'function') console.log(...args);
    }
  } catch (e) { /* ignore */ }
}

// Dashboard
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').onclick = async () => {
  await fetch(apiBase + '/logout', { method: 'POST', credentials: 'include' });
    window.location.href = 'login.html';
  };

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      const tabName = btn.dataset.tab;
      // activation helper
      const activate = (name) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const targetBtn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
        if (targetBtn) targetBtn.classList.add('active');
        const target = document.getElementById('tab-' + name);
        if (target) target.classList.add('active');
        const listId = (name === 'attente') ? 'attente-list' : 'encours-list';
        setTimeout(() => {
          adjustListMaxHeight(listId);
          animateCards(listId);
        }, 80);
        try { localStorage.setItem('admin.activeTab', name); } catch (e) {}
        // If the stockage or menus tab is activated, load the corresponding list so seeded items appear
        try {
          if (name === 'stockage' && typeof loadStock === 'function') loadStock();
          if (name === 'menus' && typeof loadMenus === 'function') loadMenus();
        } catch (e) { /* ignore */ }
      };
      activate(tabName);
    };
  });

  // Restore last active tab from localStorage (keeps dashboard on same tab after reload)
  (function restoreActiveTab() {
    try {
      const saved = localStorage.getItem('admin.activeTab');
      if (saved) {
        const btn = document.querySelector(`.tab-btn[data-tab="${saved}"]`);
        if (btn) {
          btn.click();
          return;
        }
      }
    } catch (e) {}
    // fallback: ensure default first tab is active
    const first = document.querySelector('.tab-btn');
    if (first) first.click();
  })();

  // Menus management (admin)
  async function loadMenus() {
    const container = document.querySelector('#tab-menus');
    if (!container) return;
    const tbody = document.querySelector('#menu-table tbody');
    try {
      const res = await fetch(apiBase + '/menus', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const items = await res.json();
      window._adminMenuItems = items;
      renderMenusTable(items);
    } catch (e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="color:#f33; text-align:center;">Erreur de chargement des menus.</td></tr>';
    }
  }

  function renderMenusTable(items) {
    const tbody = document.querySelector('#menu-table tbody');
    tbody.innerHTML = '';
    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="color:#aaa; text-align:center;">Aucun menu.</td></tr>';
      return;
    }
    items.forEach(it => {
      const tr = document.createElement('tr');
      tr.dataset.id = it.id;
      const desc = (it.description || '').toString().trim();
      const shortDesc = desc.length > 60 ? escapeHtml(desc.slice(0, 57)) + '...' : escapeHtml(desc);
      tr.innerHTML = `
        <td>${escapeHtml(it.name)}</td>
        <td>${escapeHtml(it.slug || '')}</td>
        <td title="${escapeAttr(desc)}">${shortDesc}</td>
        <td>${it.is_quote ? 'Sur devis' : ( (Number(it.price_cents||0)/100).toFixed(2) + '€' )}</td>
        <td>${Number(it.stock||0)}</td>
        <td>${it.is_quote ? 'Oui' : 'Non'}</td>
        <td>${it.available ? 'Oui' : 'Non'}</td>
        <td>${it.visible_on_menu ? 'Oui' : 'Non'}</td>
        <td>
          <button class="btn small" data-action="edit" data-id="${it.id}">✏️</button>
          <button class="btn small" data-action="delete-menu" data-id="${it.id}">❌</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // wire menu form and actions
  (function wireMenuUI(){
    const form = document.getElementById('menu-form');
    const search = document.getElementById('menu-search');
    const refresh = document.getElementById('menu-refresh');

    if (form) {
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const name = document.getElementById('menu-name').value.trim();
        const slug = (document.getElementById('menu-slug') && document.getElementById('menu-slug').value.trim()) || undefined;
        const description = (document.getElementById('menu-description') && document.getElementById('menu-description').value.trim()) || '';
        const price = parseFloat(document.getElementById('menu-price').value || '0');
        const stock = Math.max(0, Math.floor(Number(document.getElementById('menu-stock').value || 0)));
        const is_quote = !!document.getElementById('menu-is-quote').checked;
        const visible_on_menu = !!document.getElementById('menu-visible').checked;
        const available = !!document.getElementById('menu-available').checked;
        if (!name) return alert('Nom requis');
        if (price < 0) return alert('Prix invalide');
        try {
          const body = { name, slug, description, price_cents: Math.round(price*100), is_quote, stock, visible_on_menu, available };
          const res = await fetch(apiBase + '/menus', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body), credentials:'include' });
          if (!res.ok) throw new Error('err');
          form.reset();
          await loadMenus();
        } catch (err) { alert('Erreur lors de la sauvegarde'); }
      });
    }

    if (refresh) refresh.addEventListener('click', ()=> loadMenus());
    if (search) search.addEventListener('input', ()=>{
      const q = search.value.trim().toLowerCase();
      const items = (window._adminMenuItems || []).filter(it => (it.name||'').toLowerCase().includes(q) || (it.description||'').toLowerCase().includes(q));
      renderMenusTable(items);
    });

    document.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'delete-menu') {
        if (!confirm('Supprimer ce menu ?')) return;
        try {
          const res = await fetch(apiBase + '/menus/' + id, { method: 'DELETE', credentials: 'include' });
          if (!res.ok) throw new Error('err');
          await loadMenus();
        } catch (e) { alert('Erreur suppression'); }
      }
      if (action === 'edit') {
        // simple inline edit: load item values into the form for editing -> on submit we'll perform create; editing not fully implemented here (could open modal)
        const item = (window._adminMenuItems||[]).find(x=>String(x.id)===String(id));
        if (!item) return;
  document.getElementById('menu-name').value = item.name || '';
  if (document.getElementById('menu-slug')) document.getElementById('menu-slug').value = item.slug || '';
  if (document.getElementById('menu-description')) document.getElementById('menu-description').value = item.description || '';
  document.getElementById('menu-price').value = (Number(item.price_cents||0)/100).toFixed(2);
  document.getElementById('menu-stock').value = Number(item.stock||0);
  document.getElementById('menu-is-quote').checked = !!item.is_quote;
  if (document.getElementById('menu-available')) document.getElementById('menu-available').checked = !!item.available;
  document.getElementById('menu-visible').checked = !!item.visible_on_menu;
        // change form submit to perform update
        form.dataset.editingId = id;
        // replace submit handler to call PUT when editing
        const submitHandler = async (ev) => {
          ev.preventDefault();
          const name = document.getElementById('menu-name').value.trim();
          const slug = (document.getElementById('menu-slug') && document.getElementById('menu-slug').value.trim()) || undefined;
          const description = (document.getElementById('menu-description') && document.getElementById('menu-description').value.trim()) || '';
          const price = parseFloat(document.getElementById('menu-price').value || '0');
          const stock = Math.max(0, Math.floor(Number(document.getElementById('menu-stock').value || 0)));
          const is_quote = !!document.getElementById('menu-is-quote').checked;
          const visible_on_menu = !!document.getElementById('menu-visible').checked;
          const available = !!document.getElementById('menu-available').checked;
          try {
            const body = { name, slug, description, price_cents: Math.round(price*100), is_quote, stock, visible_on_menu, available };
            const res = await fetch(apiBase + '/menus/' + id, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body), credentials:'include' });
            if (!res.ok) throw new Error('err');
            delete form.dataset.editingId;
            form.removeEventListener('submit', submitHandler);
            form.reset();
            await loadMenus();
          } catch (err) { alert('Erreur lors de la mise à jour'); }
        };
        form.addEventListener('submit', submitHandler);
      }
    });
  })();

  // Load commandes
  async function loadCommandes(statut, containerId, badgeId, loaderId) {
    const loader = document.getElementById(loaderId);
    const list = document.getElementById(containerId);
    const badge = document.getElementById(badgeId);
    loader.style.display = 'block';
    list.innerHTML = '';
    if (badge) badge.textContent = '';
    try {
      const res = await fetch(apiBase + '/commandes?statut=' + statut, { credentials: 'include' });
      loader.style.display = 'none';
      // handle unauthorized (session expired / not logged in)
      if (res.status === 401) {
        // redirect to login so admin can re-authenticate
        console.warn('Admin API returned 401 — redirecting to login');
        window.location.href = 'login.html';
        return;
      }

      if (res.ok) {
        const commandes = await res.json();
        if (badge) badge.textContent = commandes.length;
        if (commandes.length === 0) {
          list.innerHTML = '<div style="color:#aaa; text-align:center; margin:30px 0;">Aucune commande.</div>';
          adjustListMaxHeight(containerId);
          return;
        }
        // small helper to format date strings to dd/mm/yyyy
        // Accepts ISO (YYYY-MM-DD) or French (DD/MM/YYYY) and falls back safely
        function formatDateISO(d) {
          if (!d) return '-';
          // ISO YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const dt = new Date(d + 'T00:00:00');
            if (!isNaN(dt.getTime())) {
              return dt.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
            }
          }
          // French DD/MM/YYYY
          const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d);
          if (fr) {
            const day = Number(fr[1]);
            const month = Number(fr[2]) - 1;
            const year = Number(fr[3]);
            const dt = new Date(year, month, day);
            if (dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === day) {
              return dt.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
            }
          }
          // Fallback: try general Date parsing
          try {
            const dt = new Date(d);
            if (!isNaN(dt.getTime())) return dt.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
          } catch (e) {}
          return d;
        }

        commandes.forEach(cmd => {
          // create card element for this commande with structured layout and labels
          const card = document.createElement('div');
          card.className = 'commande-card';
          const dateRetrait = formatDateISO(cmd.date_retrait);
          const created = cmd.date_creation ? new Date(cmd.date_creation).toLocaleString('fr-FR') : '';
          card.innerHTML = `
            <div class="left">
              <div class="header">
                <div>
                  <div class="client">${cmd.nom_complet} <span class="id" style="color:var(--muted);font-weight:600;font-size:0.85rem">#${cmd.id}</span></div>
                  <div class="phone"><a href="tel:${cmd.telephone}" style="color:inherit;text-decoration:none">${cmd.telephone}</a></div>
                  ${cmd.email ? `<div class="email"><a href="mailto:${cmd.email}" style="color:inherit;text-decoration:none">${cmd.email}</a></div>` : ''}
                </div>
                <div class="status" style="font-size:0.9rem;color:var(--muted);text-transform:capitalize">${cmd.statut.replace('_',' ')}</div>
              </div>
              <div class="product">${cmd.produit}</div>
              <div class="meta">
                <div><b>Date retrait:</b> ${dateRetrait} &nbsp;|&nbsp; <b>Créneau:</b> ${cmd.creneau} &nbsp;|&nbsp; <b>Lieu:</b> ${cmd.location || '-'} </div>
                <div><b>Commandé le:</b> ${created}</div>
                <div><b>Précisions:</b> ${cmd.precisions || '-'}</div>
              </div>
              ${cmd.raison_refus ? `<div class="small-note"><b>Raison du refus:</b> ${cmd.raison_refus}</div>` : ''}
            </div>
            <div class="right">
              <div class="commande-actions"></div>
            </div>`;
          const actions = card.querySelector('.commande-actions');

          // helper to parse combined date + time into a Date object
          function parseDateTime(dateStr, timeStr) {
            if (!dateStr || !timeStr) return null;
            // If dateStr already contains a time or timezone, try parsing directly
            if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr) || dateStr.includes('Z')) {
              try {
                // create a date from dateStr then overwrite hours/minutes from timeStr
                const base = new Date(dateStr);
                if (isNaN(base.getTime())) return null;
                const [hh, mm] = timeStr.split(':').map(Number);
                base.setHours(hh, mm, 0, 0);
                return base;
              } catch (e) { /* fallthrough */ }
            }
            // ISO YYYY-MM-DD (with or without time)
            if (/^\d{4}-\d{2}-\d{2}/.test(dateStr) && /^\d{2}:\d{2}$/.test(timeStr)) {
              // join as local time
              const iso = `${dateStr}T${timeStr}:00`;
              const d = new Date(iso);
              if (!isNaN(d.getTime())) return d;
            }
            // French DD/MM/YYYY
            const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr);
            if (fr && /^\d{2}:\d{2}$/.test(timeStr)) {
              const day = Number(fr[1]);
              const month = Number(fr[2]) - 1;
              const year = Number(fr[3]);
              const [hh, mm] = timeStr.split(':').map(Number);
              const d = new Date(year, month, day, hh, mm, 0);
              if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) return d;
            }
            // fallback: try Date parse with concatenation
            try {
              const d = new Date(`${dateStr} ${timeStr}`);
              return isNaN(d.getTime()) ? null : d;
            } catch (e) { return null; }
          }
          if (statut === 'en_attente') {
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'Accepter';
            acceptBtn.className = 'btn primary';
            acceptBtn.onclick = async () => {
              acceptBtn.disabled = true;
              acceptBtn.style.opacity = '0.8';
              await fetch(apiBase + `/commandes/${cmd.id}/accepter`, { method: 'POST', credentials: 'include' });
              loadCommandes('en_attente', 'attente-list', 'badge-attente', 'attente-loader');
              loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');
            };
            const refuseBtn = document.createElement('button');
            refuseBtn.textContent = 'Refuser';
            refuseBtn.className = 'btn ghost';
            refuseBtn.onclick = () => {
              const raison = prompt('Raison du refus ?');
              if (raison) {
                refuseBtn.disabled = true;
                fetch(apiBase + `/commandes/${cmd.id}/refuser`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ raison }),
                  credentials: 'include'
                }).then(() => {
                  loadCommandes('en_attente', 'attente-list', 'badge-attente', 'attente-loader');
                });
              }
            };
            actions.appendChild(acceptBtn);
            actions.appendChild(refuseBtn);
          }
          if (statut === 'en_cours') {
            const finishBtn = document.createElement('button');
            finishBtn.textContent = 'Commande terminée';
            finishBtn.className = 'btn primary';
            finishBtn.onclick = async () => {
              finishBtn.disabled = true;
              await fetch(apiBase + `/commandes/${cmd.id}/terminer`, { method: 'POST', credentials: 'include' });
              loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');
            };
            const noteBtn = document.createElement('button');
            noteBtn.textContent = 'Notes/Plus';
            noteBtn.className = 'btn ghost';
            noteBtn.onclick = () => { alert('ID: ' + cmd.id + "\nStatut: " + cmd.statut + "\nCréé: " + (created || '-')); };
            actions.appendChild(finishBtn);
            actions.appendChild(noteBtn);
          }
          list.appendChild(card);

          // If this card is in 'en_cours', append a countdown element showing time remaining until pickup
          if (statut === 'en_cours') {
            const metaDiv = card.querySelector('.meta');
            if (metaDiv) {
              const countdownDiv = document.createElement('div');
              countdownDiv.className = 'countdown-row';
              const pickupDateObj = parseDateTime(cmd.date_retrait, cmd.creneau);
              if (pickupDateObj) {
                const ts = pickupDateObj.getTime();
                countdownDiv.innerHTML = `<b>Temps restant:</b> <span class="countdown" data-target="${ts}">--:--:--</span>`;
              } else {
                countdownDiv.innerHTML = `<b>Temps restant:</b> -`;
              }
              metaDiv.appendChild(countdownDiv);
              // initialize immediately so the user doesn't wait 1s
              try { if (typeof updateCountdowns === 'function') updateCountdowns(); } catch (e) {}
            }
          }
        });
        // After rendering, adjust max-height to show exactly 3 cards (then scroll)
        adjustListMaxHeight(containerId);
        // Trigger staggered reveal (now that cards are in DOM)
        animateCards(containerId);
      } else {
        list.innerHTML = '<div style="color:#f33; text-align:center; margin:30px 0;">Erreur de chargement des commandes.</div>';
      }
    } catch (err) {
      loader.style.display = 'none';
      list.innerHTML = '<div style="color:#f33; text-align:center; margin:30px 0;">Erreur serveur.</div>';
    }
  }
  // Stock management
  async function loadStock() {
    const container = document.querySelector('#tab-stockage');
    if (!container) return;
    const tableBody = document.querySelector('#stock-table tbody');
    const loader = document.getElementById('stock-refresh');
    try {
      const res = await fetch(apiBase.replace('/admin','') + '/stock');
      if (!res.ok) throw new Error('Failed');
      const items = await res.json();
      // store items for client-side filtering/sorting
      window._adminStockItems = items;
      renderStockTable(items);
    } catch (e) {
      tableBody.innerHTML = '<tr><td colspan="6" style="color:#f33; text-align:center;">Erreur de chargement du stock.</td></tr>';
    }
  }

  function renderStockTable(items) {
    const tbody = document.querySelector('#stock-table tbody');
    tbody.innerHTML = '';
    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:#aaa; text-align:center;">Aucun produit.</td></tr>';
      return;
    }
    items.forEach(it => {
      const tr = document.createElement('tr');
      // expose id for delegation and mark cells with field names for dblclick editing
      tr.dataset.id = it.id;
      tr.innerHTML = `
        <td data-field="name">${escapeHtml(it.name)}</td>
        <td data-field="reference">${escapeHtml(it.reference || '')}</td>
        <td data-field="quantity">${Number(it.quantity || 0)}</td>
        <td data-field="available">${it.available ? 'Oui' : 'Non'}</td>
        <td class="col-modified" data-field="modified"></td>
        <td>
          <button class="btn small" data-action="toggle" data-id="${it.id}">${it.available ? '🚫' : '✔'}</button>
          <button class="btn small" data-action="delete" data-id="${it.id}">❌</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // helpers
  function escapeHtml(s){ if (s==null) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }
  function escapeAttr(s){ return escapeHtml(s); }

  // wire stock form
  (function wireStockUI(){
  const form = document.getElementById('stock-form');
  const search = document.getElementById('stock-search');
  const refresh = document.getElementById('stock-refresh');

  // Pending sends per cell (key = `${id}:${field}`)
  const PENDING = new Map();
  const DEBOUNCE_MS = 2500; // wait before sending so user can undo
  const SUCCESS_MS = 1200; // show success check for this long

  function rowPendingCount(id) {
    let c = 0;
    for (const key of PENDING.keys()) {
      if (key.startsWith(String(id) + ':')) c++;
    }
    return c;
  }

  function setRowModified(tr, flag) {
    try {
      const modCell = tr.querySelector('td[data-field="modified"]');
      if (modCell) {
        modCell.innerHTML = flag ? '<span class="row-modified-badge">En attente</span>' : '';
      }
    } catch (e) {}
  }

    if (form) {
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
  const name = document.getElementById('stock-name').value.trim();
  const reference = document.getElementById('stock-ref').value.trim();
  let quantity = Number(document.getElementById('stock-qty').value);
  const available = !!document.getElementById('stock-available').checked;
  if (!name) return alert('Nom requis');
  if (name.length > 255) return alert('Le nom est trop long (max 255 caractères).');
  if (reference.length > 100) return alert('La référence est trop longue (max 100 caractères).');
  if (isNaN(quantity) || quantity < 0) { alert('La quantité doit être un nombre >= 0.'); document.getElementById('stock-qty').focus(); return; }
  quantity = Math.floor(quantity || 0);
        try {
              // Always create a new product from the form (editing is done inline now)
              const res = await fetch('/api/stock', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, reference, quantity, available }) , credentials:'include'});
              if (!res.ok) throw new Error('err');
              form.reset();
          await loadStock();
        } catch (err) { alert('Erreur lors de la sauvegarde'); }
      });
    }

    if (refresh) refresh.addEventListener('click', ()=> loadStock());

    if (search) {
      search.addEventListener('input', ()=>{
        const q = search.value.trim().toLowerCase();
        const items = (window._adminStockItems || []).filter(it => (it.name||'').toLowerCase().includes(q) || (it.reference||'').toLowerCase().includes(q));
        renderStockTable(items);
      });
    }

    // delegate actions from table
    document.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      // old edit-via-form action removed; editing now happens inline by double-clicking cells
      if (action === 'delete') {
        if (!confirm('Supprimer ce produit ?')) return;
        try {
          const res = await fetch('/api/stock/' + id, { method: 'DELETE', credentials:'include' });
          if (!res.ok) throw new Error('err');
          await loadStock();
        } catch (e) { alert('Erreur suppression'); }
      }
      if (action === 'toggle') {
        const item = (window._adminStockItems||[]).find(x=>String(x.id)===String(id));
        if (!item) return;
        try {
          const res = await fetch('/api/stock/' + id, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ available: !item.available }), credentials:'include' });
          if (!res.ok) throw new Error('err');
          await loadStock();
        } catch (e) { alert('Erreur'); }
      }
    });

  // old cancelEdit button removed — no-op

    // Inline editing: double-click a cell to edit in-place. Commit on Enter/blur, cancel on Escape.
    document.addEventListener('dblclick', (e) => {
      const td = e.target.closest && e.target.closest('td[data-field]');
      if (!td) return;
      const tr = td.closest && td.closest('tr');
      if (!tr || !tr.dataset.id) return;
      const id = tr.dataset.id;
      const item = (window._adminStockItems||[]).find(x=>String(x.id)===String(id));
      if (!item) return;
      const field = td.dataset.field;
      // prevent starting another editor on the same cell
      if (td.dataset.editing === '1') return;
      td.dataset.editing = '1';
      const original = td.textContent;

      // create appropriate input
      let input;
      if (field === 'available') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!item.available;
      } else if (field === 'quantity') {
        input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.value = Number(item.quantity || 0);
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = item[field] || '';
      }
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      // replace cell content with input
      td.innerHTML = '';
      td.appendChild(input);
      // helper to cancel
      const cancel = () => {
        td.removeAttribute('data-editing');
        td.textContent = original;
      };
      // commit changes with debounce + undo + optimistic UI and rollback on failure
      const commit = () => {
        if (td.dataset.editing !== '1') return;
        if (td.dataset.scheduled === '1') return; // already scheduled
        let newVal;
        if (field === 'available') newVal = !!input.checked;
        else if (field === 'quantity') newVal = Number(input.value);
        else newVal = String(input.value || '').trim();

        // Client-side validation
        if (field === 'name') {
          if (!newVal) { alert('Le nom ne peut pas être vide.'); input.focus(); return; }
          if (newVal.length > 255) { alert('Le nom est trop long (max 255 caractères).'); input.focus(); return; }
        }
        if (field === 'reference') {
          if (newVal.length > 100) { alert('La référence est trop longue (max 100 caractères).'); input.focus(); return; }
        }
        if (field === 'quantity') {
          if (isNaN(newVal) || newVal < 0) { alert('La quantité doit être un nombre >= 0.'); input.focus(); return; }
          newVal = Math.floor(newVal);
        }

        // if unchanged, just cancel editor
        if (String(newVal) === String(item[field] ?? '')) {
          cancel();
          return;
        }

        const key = `${id}:${field}`;
        const origValue = item[field];
        const origText = original;

        // optimistic update locally
        item[field] = newVal;
        window._adminStockItems = (window._adminStockItems || []).map(it => (String(it.id) === String(item.id) ? item : it));
        td.removeAttribute('data-editing');
        td.textContent = (field === 'available') ? (newVal ? 'Oui' : 'Non') : String(newVal);

        // create badge with spinner + undo link
        const badge = document.createElement('span');
        badge.className = 'cell-badge pending';
        badge.innerHTML = '<span class="cell-spinner"></span><span class="cell-undo">Annuler</span>';
        td.appendChild(badge);
        td.dataset.scheduled = '1';
        // mark row as modified
        const tr = td.closest('tr');
        if (tr) { tr.dataset.modified = '1'; setRowModified(tr, true); }

        // undo handler
        const doUndo = () => {
          const p = PENDING.get(key);
          if (p) {
            if (p.timer) clearTimeout(p.timer);
            if (p.controller) try { p.controller.abort(); } catch (e) {}
            PENDING.delete(key);
          }
          // rollback visually
          item[field] = origValue;
          window._adminStockItems = (window._adminStockItems || []).map(it => (String(it.id) === String(item.id) ? item : it));
          if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
          td.textContent = origText;
          td.removeAttribute('data-editing');
          td.removeAttribute('data-scheduled');
          if (tr && rowPendingCount(id) === 0) { tr.dataset.modified = '0'; setRowModified(tr, false); }
        };
        const undoEl = badge.querySelector('.cell-undo');
        if (undoEl) undoEl.addEventListener('click', (ev)=>{ ev.stopPropagation(); doUndo(); });

        // schedule network send after debounce to allow undo
        const timer = setTimeout(async () => {
          // replace timer entry with one including controller
          const controller = new AbortController();
          PENDING.set(key, { timer: null, controller, badge, td, origValue, origText });
          try {
            const body = {}; body[field] = newVal;
            const res = await fetch('/api/stock/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body), signal: controller.signal });
            if (!res.ok) throw new Error('save-failed');
            // success: show checkmark briefly
            if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
            const success = document.createElement('span');
            success.className = 'cell-success';
            success.textContent = '✔';
            td.appendChild(success);
            delete td.dataset.scheduled;
            PENDING.delete(key);
            // update row modified state
            if (tr && rowPendingCount(id) === 0) { tr.dataset.modified = '0'; setRowModified(tr, false); }
            setTimeout(()=>{ if (success && success.parentNode) success.parentNode.removeChild(success); }, SUCCESS_MS);
          } catch (err) {
            // if aborted by undo, do nothing (undo already cleaned up)
            const p = PENDING.get(key);
            if (p && p.controller && p.controller.signal && p.controller.signal.aborted) {
              // already handled by undo
              return;
            }
            // rollback
            item[field] = origValue;
            window._adminStockItems = (window._adminStockItems || []).map(it => (String(it.id) === String(item.id) ? item : it));
            if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
            delete td.dataset.scheduled;
            td.textContent = origText;
            // visual rollback animation
            td.classList.add('cell-rollback');
            setTimeout(()=> td.classList.remove('cell-rollback'), 700);
            PENDING.delete(key);
            if (tr && rowPendingCount(id) === 0) { tr.dataset.modified = '0'; setRowModified(tr, false); }
            alert('Erreur lors de la sauvegarde — modification annulée.');
          }
        }, DEBOUNCE_MS);

        // store pending info
        PENDING.set(key, { timer, controller: null, badge, td, origValue, origText });
      };

      // keyboard handlers
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
      });
      // commit on blur (gives time for click events on checkboxes)
      input.addEventListener('blur', () => { setTimeout(commit, 150); });
      // focus the input
      try { input.focus(); if (input.select) input.select(); } catch (e) {}
    });
    // simple column sort by clicking headers
    document.querySelectorAll('#stock-table thead th[data-sort]').forEach(th=>{
      th.style.cursor='pointer';
      th.addEventListener('click', ()=>{
        const key = th.dataset.sort;
        const items = (window._adminStockItems||[]).slice();
        const dir = th.dataset.dir === 'asc' ? 'desc' : 'asc';
        th.dataset.dir = dir;
        items.sort((a,b)=>{
          const A = String(a[key] ?? '').toLowerCase();
          const B = String(b[key] ?? '').toLowerCase();
          if (!isNaN(Number(a[key])) && !isNaN(Number(b[key]))) {
            return dir === 'asc' ? Number(a[key]) - Number(b[key]) : Number(b[key]) - Number(a[key]);
          }
          if (A < B) return dir === 'asc' ? -1 : 1;
          if (A > B) return dir === 'asc' ? 1 : -1;
          return 0;
        });
        renderStockTable(items);
      });
    });

  })();
  // helper: measure card and set max-height so exactly 3 cards are visible
  function adjustListMaxHeight(containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;
    // find first card
    const first = list.querySelector('.commande-card');
    if (!first) {
      list.style.maxHeight = 'none';
      list.style.overflow = 'visible';
      return;
    }
    // measure height including margin
    const cardRect = first.getBoundingClientRect();
    const style = window.getComputedStyle(first);
    const marginBottom = parseFloat(style.marginBottom) || 12;
    // If measured height is 0 (element may be in a collapsed container), try computed height or fallback
    let cardHeight = Math.ceil(cardRect.height);
    if (cardHeight < 6) {
      const computedH = parseFloat(style.height) || 0;
      cardHeight = Math.ceil(computedH) || 120; // fallback to 120px if we can't measure
    }
    const visibleCount = 3;
    const total = cardHeight * visibleCount + marginBottom * (visibleCount - 1);
    list.style.maxHeight = total + 'px';
    list.style.overflow = (list.children.length > visibleCount) ? 'auto' : 'visible';
  }

  // stagger reveal animation for cards inside a list
  function animateCards(containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;
    const cards = Array.from(list.querySelectorAll('.commande-card'));
    if (!cards.length) return;
    // clear previous shows
    cards.forEach(c => {
      c.classList.remove('show');
      c.style.transitionDelay = '0ms';
    });
    // add with stagger
    cards.forEach((c, i) => {
      const delay = i * 80; // ms
      c.style.transitionDelay = delay + 'ms';
      // ensure class addition happens after a tick
      setTimeout(() => c.classList.add('show'), 10 + delay);
    });
  }

  loadCommandes('en_attente', 'attente-list', 'badge-attente', 'attente-loader');
  loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');

  // re-adjust on resize (cards may wrap/change height)
  window.addEventListener('resize', function () {
    adjustListMaxHeight('attente-list');
    adjustListMaxHeight('encours-list');
  });

  // Countdown updater: refresh all .countdown elements every second
  function formatRemaining(ms) {
    if (ms <= 0) return 'Heure dépassée';
    const total = Math.floor(ms / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (days > 0) return `${days}j ${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m`;
    return `${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
  }

  function updateCountdowns() {
    const nodes = Array.from(document.querySelectorAll('.countdown'));
    const now = Date.now();
    nodes.forEach(n => {
      const target = Number(n.dataset.target) || 0;
      if (!target) {
        n.textContent = '-';
        n.classList.remove('countdown--expired', 'countdown--warning');
        const next = n.nextElementSibling;
        if (next && next.classList.contains('countdown-badge')) next.textContent = '';
        return;
      }
      const diff = target - now;
      n.textContent = formatRemaining(diff);
      // manage classes and badge
      n.classList.remove('countdown--expired', 'countdown--warning');
      let badge = n.nextElementSibling;
      if (!badge || !badge.classList.contains('countdown-badge')) {
        badge = document.createElement('span');
        badge.className = 'countdown-badge';
        n.parentNode.insertBefore(badge, n.nextSibling);
      }
      if (diff <= 0) {
        n.classList.add('countdown--expired');
        badge.classList.remove('warn');
        badge.classList.add('expired');
        badge.textContent = 'Expirée';
      } else if (diff <= 15 * 60 * 1000) {
        n.classList.add('countdown--warning');
        badge.classList.remove('expired');
        badge.classList.add('warn');
        badge.textContent = '< 15 min';
      } else {
        badge.classList.remove('warn', 'expired');
        badge.textContent = '';
      }
    });
    return nodes.length;
  }

  // Adaptive scheduler: reduce update frequency when many countdowns exist
  let countdownTimer = null;
  function scheduleUpdate() {
    if (countdownTimer) clearTimeout(countdownTimer);
    const count = updateCountdowns();
    let delay = 1000;
    if (count > 30) delay = 5000;
    else if (count > 10) delay = 2000;
    // Debug: log chosen frequency and number of countdowns (filterable)
    try { adminDebug(`[countdown] timers=${count} nextUpdate=${delay}ms`); } catch (e) {}
    countdownTimer = setTimeout(scheduleUpdate, delay);
  }
  // start the adaptive updater
  scheduleUpdate();

  // Pause updates when the page is hidden to save CPU; resume when visible again
  document.addEventListener('visibilitychange', () => {
    try {
      if (document.hidden) {
        if (countdownTimer) {
          clearTimeout(countdownTimer);
          countdownTimer = null;
        }
      } else {
        // when tab becomes visible again, refresh immediately and restart scheduler
        updateCountdowns();
        scheduleUpdate();
      }
    } catch (e) { /* ignore */ }
  });

  // Change password UI handling
  const toggleChangePwd = document.getElementById('toggleChangePwd');
  const changePwdForm = document.getElementById('changePwdForm');
  const cancelChangePwd = document.getElementById('cancelChangePwd');
  const changePwdMsg = document.getElementById('changePwdMsg');

  if (toggleChangePwd && changePwdForm) {
    const setFormVisible = (visible) => {
      changePwdForm.style.display = visible ? 'grid' : 'none';
      changePwdForm.setAttribute('aria-hidden', String(!visible));
      toggleChangePwd.setAttribute('aria-expanded', String(visible));
    };

    toggleChangePwd.addEventListener('click', () => setFormVisible(changePwdForm.style.display === 'none'));
    cancelChangePwd.addEventListener('click', () => setFormVisible(false));

    changePwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      changePwdMsg.style.color = '#f33';
      changePwdMsg.textContent = '';
      const currentPassword = document.getElementById('currentPassword')?.value || '';
      const newPassword = document.getElementById('newPassword')?.value || '';
      const confirmNewPassword = document.getElementById('confirmNewPassword')?.value || '';

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        changePwdMsg.textContent = 'Merci de remplir tous les champs.';
        return;
      }
      if (newPassword !== confirmNewPassword) {
        changePwdMsg.textContent = 'Les nouveaux mots de passe ne correspondent pas.';
        return;
      }
      if (newPassword.length < 8) {
        changePwdMsg.textContent = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
        return;
      }

      const submitBtn = document.getElementById('changePwdBtn');
      submitBtn.disabled = true;
      try {
        const res = await fetch(apiBase + '/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          changePwdMsg.style.color = '#0a0';
          changePwdMsg.textContent = data.message || 'Mot de passe mis à jour.';
          // reset form
          changePwdForm.reset();
          setTimeout(() => setFormVisible(false), 1200);
        } else {
          changePwdMsg.textContent = data.message || 'Erreur lors de la mise à jour.';
        }
      } catch (err) {
        changePwdMsg.textContent = 'Erreur réseau. Réessayez plus tard.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
}
