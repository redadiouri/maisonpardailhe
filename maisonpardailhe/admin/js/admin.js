// Simple JS pour login et dashboard admin
// Use a relative API base so the admin UI works behind proxies / in production
// (was hardcoded to http://localhost:3001 previously which breaks non-local deployments)
const apiBase = '/api/admin';

// CSRF token helper: fetches and caches token from server (session-based csurf)
async function getCsrfToken() {
  try {
    if (window._csrfToken) return window._csrfToken;
    const res = await fetch('/api/csrf-token', { credentials: 'include' });
    if (!res.ok) return null;
    const d = await res.json();
    window._csrfToken = d && d.csrfToken;
    return window._csrfToken;
  } catch (e) {
    return null;
  }
}

// Preload menus into a cache for name lookup when rendering commandes
async function preloadMenus() {
  try {
    if (window._menusCache) return window._menusCache;
      // For the admin UI, request the admin endpoint so we receive all menus
      // (visible and hidden). The public `/api/menus` only returns visible items
      // which breaks name lookup for commands referencing hidden items.
      const res = await fetch('/api/admin/menus', { credentials: 'include' });
    if (!res.ok) return window._menusCache = new Map();
    const menus = await res.json();
    const map = new Map();
    menus.forEach(m => map.set(Number(m.id), { name: m.name, price_cents: Number(m.price_cents || 0) }));
    window._menusCache = map;
    return map;
  } catch (e) { window._menusCache = new Map(); return window._menusCache; }
}

function getMenuName(id) {
  try {
    if (!window._menusCache) return null;
    const m = window._menusCache.get(Number(id));
    return m ? m.name : null;
  } catch (e) { return null; }
}

function renderProduitHtml(rawProduit) {
  if (!rawProduit) return '-';
  try {
    const parsed = JSON.parse(rawProduit);
    if (Array.isArray(parsed)) {
      const parts = parsed.map(it => {
        const id = Number(it.menu_id);
        const qty = Number(it.qty) || 0;
        const name = getMenuName(id) || (`#${id}`);
        return `${qty} × ${name}`;
      });
      return `<div class="product-list">${parts.join('<br>')}</div>`;
    }
  } catch (e) {
    // not JSON – fall through
  }
  // fallback: return raw string escaped simply
  return `<div class="product-list">${String(rawProduit)}</div>`;
}

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
      const _csrf = await getCsrfToken();
      const res = await fetch(apiBase + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _csrf || '' },
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

// Stats refresh interval handle (set when stats tab is active)
let statsIntervalId = null;
let ordersChart = null;
let adminLastStats = null;

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

// Simple confirm modal helper. Returns a Promise<boolean>.
function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    // create overlay
    let overlay = document.getElementById('confirm-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirm-modal-overlay';
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.6)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '9999';
      const box = document.createElement('div');
      box.id = 'confirm-modal-box';
      box.style.background = 'var(--card)';
      box.style.color = '#fff';
      box.style.padding = '18px';
      box.style.borderRadius = '10px';
      box.style.maxWidth = '540px';
      box.style.width = '90%';
      box.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';
      const h = document.createElement('h3'); h.textContent = title || 'Confirmer'; h.style.margin = '0 0 8px 0';
      const p = document.createElement('p'); p.textContent = message || ''; p.style.margin = '0 0 16px 0'; p.style.color = 'var(--muted)';
      const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.justifyContent = 'flex-end'; actions.style.gap = '8px';
      const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn ghost'; cancelBtn.textContent = 'Annuler';
      const okBtn = document.createElement('button'); okBtn.className = 'btn primary'; okBtn.textContent = 'Confirmer';
      actions.appendChild(cancelBtn); actions.appendChild(okBtn);
      box.appendChild(h); box.appendChild(p); box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      cancelBtn.addEventListener('click', () => { overlay.remove(); resolve(false); });
      okBtn.addEventListener('click', () => { overlay.remove(); resolve(true); });
      // close on overlay click outside box
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) { overlay.remove(); resolve(false); } });
    } else {
      // overlay exists: reuse
      const ok = overlay.querySelector('.btn.primary');
      const cancel = overlay.querySelector('.btn.ghost');
      overlay.querySelector('h3').textContent = title || 'Confirmer';
      overlay.querySelector('p').textContent = message || '';
      overlay.style.display = 'flex';
      const cleanup = () => { overlay.style.display = 'none'; };
      cancel.onclick = () => { cleanup(); resolve(false); };
      ok.onclick = () => { cleanup(); resolve(true); };
    }
  });
}

// Prompt-like modal to collect a short text reason from the admin. Returns Promise<string|null>
function showReasonModal(title, message, placeholder) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('reason-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'reason-modal-overlay';
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.6)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '10000';

      const box = document.createElement('div');
      box.style.background = 'var(--card)';
      box.style.color = '#fff';
      box.style.padding = '16px';
      box.style.borderRadius = '10px';
      box.style.maxWidth = '640px';
      box.style.width = '90%';
      box.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';

      const h = document.createElement('h3'); h.textContent = title || 'Raison du refus'; h.style.margin = '0 0 8px 0';
      const p = document.createElement('p'); p.textContent = message || ''; p.style.margin = '0 0 8px 0'; p.style.color = 'var(--muted)';
      const ta = document.createElement('textarea'); ta.placeholder = placeholder || 'Indiquer brièvement la raison du refus...'; ta.style.width = '100%'; ta.style.minHeight = '96px'; ta.style.padding = '8px'; ta.style.borderRadius = '8px'; ta.style.border = '1px solid rgba(255,255,255,0.06)'; ta.style.background = 'rgba(0,0,0,0.12)'; ta.style.color = '#fff';
      ta.style.marginBottom = '12px';

      const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.justifyContent = 'flex-end'; actions.style.gap = '8px';
      const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn ghost'; cancelBtn.textContent = 'Annuler';
      const okBtn = document.createElement('button'); okBtn.className = 'btn danger'; okBtn.textContent = 'Refuser';
      actions.appendChild(cancelBtn); actions.appendChild(okBtn);

      box.appendChild(h); box.appendChild(p); box.appendChild(ta); box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      cancelBtn.addEventListener('click', () => { overlay.remove(); resolve(null); });
      okBtn.addEventListener('click', () => { const v = (ta.value || '').trim(); overlay.remove(); resolve(v || null); });
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) { overlay.remove(); resolve(null); } });
      // focus textarea
      setTimeout(()=>{ try{ ta.focus(); }catch(e){} }, 10);
    } else {
      const ta = overlay.querySelector('textarea');
      overlay.querySelector('h3').textContent = title || 'Raison du refus';
      overlay.querySelector('p').textContent = message || '';
      ta.placeholder = placeholder || 'Indiquer brièvement la raison du refus...';
      overlay.style.display = 'flex';
      const ok = overlay.querySelector('.btn.danger');
      const cancel = overlay.querySelector('.btn.ghost');
      const cleanup = () => { overlay.style.display = 'none'; };
      cancel.onclick = () => { cleanup(); resolve(null); };
      ok.onclick = () => { const v = (overlay.querySelector('textarea').value || '').trim(); cleanup(); resolve(v || null); };
      setTimeout(()=>{ try{ overlay.querySelector('textarea').focus(); } catch(e){} }, 10);
    }
  });
}

// Simple informational modal to display HTML content (read-only). Returns Promise<void> when closed.
function showInfoModal(title, htmlContent) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('info-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'info-modal-overlay';
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.6)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '10000';

      const box = document.createElement('div');
      box.style.background = 'var(--card)';
      box.style.color = '#fff';
      box.style.padding = '16px';
      box.style.borderRadius = '10px';
      box.style.maxWidth = '800px';
      box.style.width = '92%';
      box.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';

      const h = document.createElement('h3'); h.textContent = title || ''; h.style.margin = '0 0 8px 0';
      const content = document.createElement('div'); content.className = 'info-modal-content'; content.style.marginBottom = '12px';
      content.style.maxHeight = '60vh'; content.style.overflow = 'auto';
      const actions = document.createElement('div'); actions.style.display = 'flex'; actions.style.justifyContent = 'flex-end';
      const closeBtn = document.createElement('button'); closeBtn.className = 'btn ghost'; closeBtn.textContent = 'Fermer';
      actions.appendChild(closeBtn);

      box.appendChild(h); box.appendChild(content); box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      closeBtn.addEventListener('click', () => { overlay.remove(); resolve(); });
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) { overlay.remove(); resolve(); } });
      // set html content
      content.innerHTML = htmlContent || '';
    } else {
      overlay.querySelector('h3').textContent = title || '';
      overlay.querySelector('.info-modal-content').innerHTML = htmlContent || '';
      overlay.style.display = 'flex';
    }
  });
}

// Simple alert modal (OK) that mimics a blocking alert but non-blocking in async code.
function showAlertModal(title, message) {
  return new Promise((resolve) => {
    const html = `<div style="padding:12px 0;">${String(message || '')}</div>`;
    showInfoModal(title || 'Info', html).then(resolve).catch(() => resolve());
  });
}

// Small toast helper
function showToast(message, options = {}) {
  try {
    const duration = options.duration || 3000;
    const type = options.type || 'success'; // 'success' | 'error' | 'info'
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.position = 'fixed';
      container.style.right = '20px';
      container.style.bottom = '20px';
      container.style.zIndex = 10000;
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-message toast--' + type;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 240ms ease, transform 240ms ease';

    // choose icon
    let icon = '';
    if (type === 'success') {
      icon = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else if (type === 'error') {
      icon = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else {
      icon = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>';
    }

    toast.innerHTML = icon + '<div class="toast-text">' + String(message) + '</div>';
    container.appendChild(toast);

    // show
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => { try { toast.remove(); } catch (e) {} }, 260);
    }, duration);
  } catch (e) { /* ignore */ }
}

// Dashboard
if (document.getElementById('logoutBtn')) {
  // fetch current admin info and hide admin-management tab for non-primary users
  (async function loadCurrentAdmin() {
    try {
      const res = await fetch(apiBase + '/me', { credentials: 'include' });
      if (!res.ok) return;
      const current = await res.json();
      window._currentAdmin = current;
      // hide admin management tab if not primary
      if (!current || String(current.username).toLowerCase() !== 'admin') {
        const adminBtn = document.querySelector('.tab-btn[data-tab="admins"]');
        if (adminBtn) adminBtn.style.display = 'none';
      }
      // hide menus tab if current admin cannot edit menus
      if (!current || !current.can_edit_menus) {
        const menuBtn = document.querySelector('.tab-btn[data-tab="menus"]');
        if (menuBtn) menuBtn.style.display = 'none';
        // add a notice inside the menus tab explaining why it's hidden
        try {
          const tabMenus = document.getElementById('tab-menus');
          if (tabMenus) {
            const banner = document.createElement('div');
            banner.className = 'admin-perm-banner';
            banner.style.padding = '12px';
            banner.style.marginBottom = '12px';
            banner.style.borderRadius = '8px';
            banner.style.background = 'linear-gradient(90deg,#fff7e6,#fffef0)';
            banner.style.color = '#7a4b00';
            banner.style.fontWeight = '600';
            banner.textContent = "Vous n\'avez pas la permission de modifier les menus. Contactez l'administrateur principal pour obtenir l'accès.";
            tabMenus.insertBefore(banner, tabMenus.firstChild);
            // also disable the add form if present
            const form = document.getElementById('menu-form');
            if (form) {
              Array.from(form.elements || []).forEach(el => el.disabled = true);
              const addBtn = form.querySelector('button[type="submit"]');
              if (addBtn) addBtn.disabled = true;
            }
          }
        } catch (e) {}
        // if saved active tab is menus or admins, clear it so restoreActiveTab won't reactivate a hidden tab
        try {
          const saved = localStorage.getItem('admin.activeTab');
          if (saved === 'menus' || saved === 'admins') localStorage.removeItem('admin.activeTab');
        } catch (e) {}
      }
    } catch (e) { /* ignore */ }
  })();

  // Also perform an initial background refresh of stats so the data is available
  // immediately when the dashboard loads (useful if admin doesn't click the tab).
  // We call loadStats() once here; the periodic refresh is still started only
  // when the stats tab is explicitly activated (see tab activation code).
  try {
    if (typeof loadStats === 'function') {
      // fire-and-forget; failures are handled inside loadStats
      loadStats().catch(() => {});
    }
  } catch (e) { /* ignore */ }
  document.getElementById('logoutBtn').onclick = async () => {
    const _csrf = await getCsrfToken();
    await fetch(apiBase + '/logout', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': _csrf || '' } });
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
        // If the stockage, menus or stats tab is activated, load the corresponding data
        try {
          if (name === 'stockage' && typeof loadStock === 'function') loadStock();
          if (name === 'menus' && typeof loadMenus === 'function') loadMenus();
          if (name === 'admins' && typeof loadAdmins === 'function') loadAdmins();
          if (name === 'stats' && typeof loadStats === 'function') {
            // start immediate load and refresh while stats tab is visible
            loadStats();
            if (statsIntervalId) clearInterval(statsIntervalId);
            statsIntervalId = setInterval(loadStats, 60 * 1000);
          } else {
            if (statsIntervalId) { clearInterval(statsIntervalId); statsIntervalId = null; }
          }
          // if leaving admins tab, nothing special to stop
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

  // Inline editing for menus: double-click to edit cells in-place, commit on Enter/blur, cancel on Escape.
  (function wireMenusInline(){
    const PENDING = new Map();
    const DEBOUNCE_MS = 1200;
    const SUCCESS_MS = 1000;

    function rowPendingCount(id) {
      let c = 0;
      for (const key of PENDING.keys()) if (key.startsWith(String(id) + ':')) c++;
      return c;
    }

    function setRowModified(tr, flag) {
      try {
        const modCell = tr.querySelector('td[data-field="modified"]');
        if (modCell) modCell.innerHTML = flag ? '<span class="row-modified-badge">En attente</span>' : '';
      } catch (e) {}
    }

    document.addEventListener('dblclick', (e) => {
      // block inline editing when user lacks permission
      if (!window._currentAdmin || !window._currentAdmin.can_edit_menus) {
        try { showToast("Permission refusée: vous ne pouvez pas modifier les menus.", { type: 'error', duration: 2500 }); } catch (e) {}
        return;
      }
      const td = e.target.closest && e.target.closest('#menu-table td[data-field]');
      if (!td) return;
      const tr = td.closest && td.closest('tr');
      if (!tr || !tr.dataset.id) return;
      const id = tr.dataset.id;
      const item = (window._adminMenuItems||[]).find(x=>String(x.id)===String(id));
      if (!item) return;
      const field = td.dataset.field;
      if (td.dataset.editing === '1') return;
      td.dataset.editing = '1';
      const original = td.textContent;

      let input;
      if (field === 'available' || field === 'visible_on_menu' || field === 'is_quote') {
        input = document.createElement('input'); input.type = 'checkbox';
        input.checked = !!item[field];
      } else if (field === 'stock' || field === 'price_cents') {
        input = document.createElement('input'); input.type = 'number'; input.min = '0';
        if (field === 'price_cents') input.value = Number(item.price_cents||0)/100;
        else input.value = Number(item.stock||0);
        if (field === 'stock') input.step = '1'; else input.step = '0.01';
      } else {
        input = document.createElement('input'); input.type = 'text'; input.value = item[field] || '';
      }
      input.style.width = '100%'; input.style.boxSizing = 'border-box';
      td.innerHTML = ''; td.appendChild(input);

      const cancel = () => { td.removeAttribute('data-editing'); td.textContent = original; };

      const commit = () => {
        if (td.dataset.editing !== '1') return;
        let newVal;
        if (field === 'available' || field === 'visible_on_menu' || field === 'is_quote') newVal = !!input.checked;
        else if (field === 'stock') newVal = Math.max(0, Math.floor(Number(input.value) || 0));
        else if (field === 'price_cents') newVal = Math.round((Number(input.value) || 0) * 100);
        else newVal = String(input.value || '').trim();

        // simple validation
  if (field === 'name' && !newVal) { showAlertModal('Validation', 'Le nom ne peut pas être vide.'); input.focus(); return; }
  if (field === 'price_cents' && newVal < 0) { showAlertModal('Validation', 'Prix invalide'); input.focus(); return; }

        // unchanged
        if (String(newVal) === String(item[field] ?? '')) { cancel(); return; }

        const key = `${id}:${field}`;
        const origValue = item[field];
        const origText = original;

        // optimistic update
        item[field] = newVal;
        window._adminMenuItems = (window._adminMenuItems || []).map(it => (String(it.id) === String(item.id) ? item : it));
        td.removeAttribute('data-editing');
        // display value (format price)
        if (field === 'price_cents') td.textContent = (item.is_quote ? 'Sur devis' : ((Number(item.price_cents||0)/100).toFixed(2)+'€'));
        else if (field === 'available' || field === 'visible_on_menu' || field === 'is_quote') td.textContent = item[field] ? 'Oui' : 'Non';
        else td.textContent = String(item[field]);

        const badge = document.createElement('span'); badge.className = 'cell-badge pending'; badge.innerHTML = '<span class="cell-spinner"></span><span class="cell-undo">Annuler</span>';
        td.appendChild(badge); td.dataset.scheduled = '1';
        if (tr) { tr.dataset.modified = '1'; setRowModified(tr, true); }

        const doUndo = () => {
          const p = PENDING.get(key);
          if (p) { if (p.timer) clearTimeout(p.timer); PENDING.delete(key); }
          item[field] = origValue; window._adminMenuItems = (window._adminMenuItems || []).map(it => (String(it.id) === String(item.id) ? item : it));
          if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
          td.textContent = origText; td.removeAttribute('data-editing'); td.removeAttribute('data-scheduled');
          if (tr && rowPendingCount(id) === 0) { tr.dataset.modified = '0'; setRowModified(tr, false); }
        };
        const undoEl = badge.querySelector('.cell-undo'); if (undoEl) undoEl.addEventListener('click', (ev)=>{ ev.stopPropagation(); doUndo(); });

        const timer = setTimeout(async () => {
          PENDING.set(key, { timer:null, badge, td, origValue, origText });
          try {
            const body = {};
            if (field === 'price_cents') body.price_cents = Number(item.price_cents || 0);
            else body[field] = item[field];
            const _csrf = await getCsrfToken();
            const res = await fetch(apiBase + '/menus/' + id, { method: 'PUT', headers: {'Content-Type':'application/json', 'X-CSRF-Token': _csrf || ''}, credentials:'include', body: JSON.stringify(body) });
            if (!res.ok) throw new Error('save-failed');
            // success
            if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
            const success = document.createElement('span'); success.className = 'cell-success'; success.textContent = '✔'; td.appendChild(success);
            delete td.dataset.scheduled; PENDING.delete(key);
            if (tr && rowPendingCount(id) === 0) { tr.dataset.modified = '0'; setRowModified(tr, false); }
            setTimeout(()=>{ if (success && success.parentNode) success.parentNode.removeChild(success); }, SUCCESS_MS);
          } catch (err) {
            // rollback
            item[field] = origValue; window._adminMenuItems = (window._adminMenuItems || []).map(it => (String(it.id) === String(item.id) ? item : it));
            if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
            delete td.dataset.scheduled; td.textContent = origText; td.classList.add('cell-rollback'); setTimeout(()=> td.classList.remove('cell-rollback'), 700);
            PENDING.delete(key);
            if (tr && rowPendingCount(id) === 0) { tr.dataset.modified = '0'; setRowModified(tr, false); }
            showAlertModal('Erreur', 'Erreur lors de la sauvegarde — modification annulée.');
          }
        }, DEBOUNCE_MS);

        PENDING.set(key, { timer, badge, td, origValue, origText });
      };

      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); commit(); } else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); } });
      input.addEventListener('blur', () => { setTimeout(commit, 120); });
      try { input.focus(); if (input.select) input.select(); } catch (e) {}
    });
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

  // Admins management
  async function loadAdmins() {
    const container = document.querySelector('#tab-admins');
    if (!container) return;
    const tbody = document.querySelector('#admin-table tbody');
    try {
      const res = await fetch(apiBase + '/admins', { credentials: 'include' });
      if (res.status === 401) { window.location.href = 'login.html'; return; }
      if (!res.ok) throw new Error('Failed');
      const admins = await res.json();
      renderAdminsTable(admins);
    } catch (e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="2" style="color:#f33; text-align:center;">Erreur de chargement des administrateurs.</td></tr>';
    }
  }

  function renderAdminsTable(admins) {
    const tbody = document.querySelector('#admin-table tbody');
    tbody.innerHTML = '';
    if (!admins || admins.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" style="color:#aaa; text-align:center;">Aucun administrateur.</td></tr>';
      return;
    }
    admins.forEach(a => {
      const tr = document.createElement('tr');
      const canEdit = a.can_edit_menus ? 'checked' : '';
      const isPrimary = String(a.username).toLowerCase() === 'admin';
      const checkboxDisabled = isPrimary ? 'disabled' : '';
      const deleteButton = isPrimary ? `<button class="btn small" disabled title="Compte principal - suppression désactivée">—</button>` : `<button class="btn small danger" data-action="delete-admin" data-id="${a.id}">Supprimer</button>`;
      tr.innerHTML = `<td>${a.id}</td>
        <td>${escapeHtml(a.username)}</td>
        <td style="text-align:center"><input type="checkbox" data-action="toggle-perm" data-id="${a.id}" ${canEdit} ${checkboxDisabled} title="${isPrimary ? 'Compte principal — permission verrouillée' : 'Peut modifier les menus'}"></td>
        <td style="text-align:center">${deleteButton}</td>`;
      tbody.appendChild(tr);
    });
  }

  // wire admin create form
  (function wireAdminUI(){
    const form = document.getElementById('admin-create-form');
    const refresh = document.getElementById('admin-refresh');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value || '';
        const confirm = document.getElementById('admin-password-confirm').value || '';
        const canEditMenus = !!document.getElementById('admin-can-edit-menus').checked;

        if (!username) { showAlertModal('Erreur', 'Nom d\'utilisateur requis'); return; }
        if (password.length < 8) { showAlertModal('Erreur', 'Le mot de passe doit contenir au moins 8 caractères.'); return; }
        if (password !== confirm) { showAlertModal('Erreur', 'Les mots de passe ne correspondent pas.'); return; }

        try {
          const _csrf = await getCsrfToken();
          const res = await fetch(apiBase + '/admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _csrf || '' },
            credentials: 'include',
            body: JSON.stringify({ username, password, can_edit_menus: canEditMenus })
          });
          if (res.status === 401) { window.location.href = 'login.html'; return; }
          if (res.status === 409) { showAlertModal('Erreur', 'Nom d\'utilisateur déjà existant.'); return; }
          if (!res.ok) throw new Error('err');
          form.reset();
          await loadAdmins();
          showToast('Administrateur ajouté', { duration: 3000 });
        } catch (e) {
          showAlertModal('Erreur', 'Erreur lors de la création de l\'administrateur');
        }
      });
    }
    if (refresh) refresh.addEventListener('click', ()=> loadAdmins());
  })();

  function renderMenusTable(items) {
    const tbody = document.querySelector('#menu-table tbody');
    tbody.innerHTML = '';
    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="color:#aaa; text-align:center;">Aucun menu.</td></tr>';
      return;
    }
    items.forEach(it => {
      const tr = document.createElement('tr');
      tr.dataset.id = it.id;
      const desc = (it.description || '').toString().trim();
      const shortDesc = desc.length > 60 ? escapeHtml(desc.slice(0, 57)) + '...' : escapeHtml(desc);
      tr.innerHTML = `
  <td data-label="Nom" data-field="name"><span class="value">${escapeHtml(it.name)}</span></td>
  <td data-label="Description" data-field="description" title="${escapeAttr(desc)}"><span class="value">${shortDesc}</span></td>
  <td data-label="Prix" data-field="price_cents"><span class="value">${it.is_quote ? 'Sur devis' : ( (Number(it.price_cents||0)/100).toFixed(2) + '€' )}</span></td>
  <td data-label="Stock" data-field="stock"><span class="value">${Number(it.stock||0)}</span></td>
  <td data-label="Sur devis" data-field="is_quote"><span class="value">${it.is_quote ? 'Oui' : 'Non'}</span></td>
  <td data-label="Disponible" data-field="available"><span class="value">${it.available ? 'Oui' : 'Non'}</span></td>
  <td data-label="Visible" data-field="visible_on_menu"><span class="value">${it.visible_on_menu ? 'Oui' : 'Non'}</span></td>
        <td data-label="Actions">
          <!-- Edit removed: inline editing available via double-click. Delete is icon-only for compactness -->
          <button class="btn small icon-only danger" data-action="delete-menu" data-id="${it.id}" title="Supprimer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11v6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
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
        if (!window._currentAdmin || !window._currentAdmin.can_edit_menus) { showAlertModal('Permission', 'Permission refusée'); return; }
  const name = document.getElementById('menu-name').value.trim();
        const description = (document.getElementById('menu-description') && document.getElementById('menu-description').value.trim()) || '';
        const price = parseFloat(document.getElementById('menu-price').value || '0');
        const stock = Math.max(0, Math.floor(Number(document.getElementById('menu-stock').value || 0)));
        const is_quote = !!document.getElementById('menu-is-quote').checked;
        const visible_on_menu = !!document.getElementById('menu-visible').checked;
        const available = !!document.getElementById('menu-available').checked;
  if (!name) { showAlertModal('Validation', 'Nom requis'); return; }
  if (price < 0) { showAlertModal('Validation', 'Prix invalide'); return; }
        try {
          // Do not send `slug` — server generates it automatically from `name`.
          const body = { name, description, price_cents: Math.round(price*100), is_quote, stock, visible_on_menu, available };
          const _csrf = await getCsrfToken();
          const res = await fetch(apiBase + '/menus', { method: 'POST', headers: {'Content-Type':'application/json', 'X-CSRF-Token': _csrf || ''}, body: JSON.stringify(body), credentials:'include' });
          if (!res.ok) throw new Error('err');
          form.reset();
          await loadMenus();
  } catch (err) { showAlertModal('Erreur', 'Erreur lors de la sauvegarde'); }
      });
    }

    if (refresh) refresh.addEventListener('click', ()=> loadMenus());
    if (search) search.addEventListener('input', ()=>{
      const q = search.value.trim().toLowerCase();
      const items = (window._adminMenuItems || []).filter(it => (it.name||'').toLowerCase().includes(q) || (it.description||'').toLowerCase().includes(q));
      renderMenusTable(items);
    });

    document.addEventListener('click', async (e)=>{
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
  if (action === 'delete-menu') {
  if (!window._currentAdmin || !window._currentAdmin.can_edit_menus) { showAlertModal('Permission', 'Permission refusée'); return; }
        // show a nicer confirmation modal
        const confirmed = await showConfirmModal('Supprimer ce menu ?', 'Cette action supprimera définitivement ce menu. Voulez-vous continuer ?');
        if (!confirmed) return;
        try {
          const _csrf = await getCsrfToken();
          const res = await fetch(apiBase + '/menus/' + id, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-Token': _csrf || '' } });
          if (!res.ok) throw new Error('err');
          await loadMenus();
          showToast('Menu supprimé', { duration: 3000 });
  } catch (e) { showAlertModal('Erreur', 'Erreur suppression'); }
      }
      // toggle admin permission
      if (action === 'toggle-perm') {
        const checkbox = btn; // input element
        const newVal = !!checkbox.checked;
        try {
          const _csrf = await getCsrfToken();
          const res = await fetch(apiBase + '/admins/' + id, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _csrf || '' }, body: JSON.stringify({ can_edit_menus: newVal }) });
          if (!res.ok) throw new Error('err');
          showToast('Permission mise à jour', { duration: 2000 });
        } catch (e) {
          showAlertModal('Erreur', 'Erreur lors de la mise à jour des permissions');
          // revert checkbox
          checkbox.checked = !newVal;
        }
      }

      // delete admin
      if (action === 'delete-admin') {
        const confirmed = await showConfirmModal('Supprimer cet administrateur ?', 'Cette action supprimera définitivement le compte administrateur. Voulez-vous continuer ?');
        if (!confirmed) return;
        try {
          const _csrf = await getCsrfToken();
          const res = await fetch(apiBase + '/admins/' + id, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-Token': _csrf || '' } });
          if (res.status === 400) {
            const data = await res.json().catch(()=>null);
            showAlertModal('Erreur', data && data.message ? data.message : 'Impossible de supprimer cet administrateur');
            return;
          }
          if (!res.ok) throw new Error('err');
          await loadAdmins();
          showToast('Administrateur supprimé', { duration: 2500 });
  } catch (e) { showAlertModal('Erreur', 'Erreur suppression'); }
      }
  if (action === 'edit') {
  if (!window._currentAdmin || !window._currentAdmin.can_edit_menus) { showAlertModal('Permission', 'Permission refusée'); return; }
        // simple inline edit: load item values into the form for editing -> on submit we'll perform create; editing not fully implemented here (could open modal)
        const item = (window._adminMenuItems||[]).find(x=>String(x.id)===String(id));
        if (!item) return;
  document.getElementById('menu-name').value = item.name || '';
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
          const description = (document.getElementById('menu-description') && document.getElementById('menu-description').value.trim()) || '';
          const price = parseFloat(document.getElementById('menu-price').value || '0');
          const stock = Math.max(0, Math.floor(Number(document.getElementById('menu-stock').value || 0)));
          const is_quote = !!document.getElementById('menu-is-quote').checked;
          const visible_on_menu = !!document.getElementById('menu-visible').checked;
          const available = !!document.getElementById('menu-available').checked;
          try {
            // Do not include slug: server regenerates slug from name on update.
            const body = { name, description, price_cents: Math.round(price*100), is_quote, stock, visible_on_menu, available };
            const _csrf = await getCsrfToken();
            const res = await fetch(apiBase + '/menus/' + id, { method: 'PUT', headers: {'Content-Type':'application/json', 'X-CSRF-Token': _csrf || ''}, body: JSON.stringify(body), credentials:'include' });
            if (!res.ok) throw new Error('err');
            delete form.dataset.editingId;
            form.removeEventListener('submit', submitHandler);
            form.reset();
            await loadMenus();
          } catch (err) { showAlertModal('Erreur', 'Erreur lors de la mise à jour'); }
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

  // ensure menus cache is populated so produit names can be rendered
  try { await preloadMenus().catch(()=>{}); } catch(e) {}

  commandes.forEach(cmd => {
          // create card element for this commande with structured layout and labels
          const card = document.createElement('div');
          card.className = 'commande-card';
          const dateRetrait = formatDateISO(cmd.date_retrait);
          const created = cmd.date_creation ? new Date(cmd.date_creation).toLocaleString('fr-FR') : '';
          // Format total price (convert cents to euros)
          const totalDisplay = cmd.total_cents ? `<div style="margin-top:8px;"><b>Total:</b> <span style="color:#0a0;font-weight:700;">${(Number(cmd.total_cents)/100).toFixed(2)} €</span></div>` : '';
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
              <div class="product">${renderProduitHtml(cmd.produit)}</div>
              ${totalDisplay}
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
              const _csrf = await getCsrfToken();
              await fetch(apiBase + `/commandes/${cmd.id}/accepter`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': _csrf || '' } });
              loadCommandes('en_attente', 'attente-list', 'badge-attente', 'attente-loader');
              loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');
            };
            const refuseBtn = document.createElement('button');
            refuseBtn.textContent = 'Refuser';
            refuseBtn.className = 'btn ghost';
            refuseBtn.onclick = async () => {
              const raison = await showReasonModal('Refuser la commande', 'Indiquez la raison du refus qui sera transmise au client (facultatif).', 'Raison du refus');
              if (raison === null) return; // cancelled
              // proceed with request (reason may be empty string)
              refuseBtn.disabled = true;
              try {
                const _csrf = await getCsrfToken();
                await fetch(apiBase + `/commandes/${cmd.id}/refuser`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _csrf || '' },
                  body: JSON.stringify({ raison }),
                  credentials: 'include'
                });
                loadCommandes('en_attente', 'attente-list', 'badge-attente', 'attente-loader');
              } catch (e) {
                console.error('Erreur lors du refus:', e);
                // re-enable to allow retry
                refuseBtn.disabled = false;
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
              const _csrf = await getCsrfToken();
              await fetch(apiBase + `/commandes/${cmd.id}/terminer`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': _csrf || '' } });
              loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');
            };
            const noteBtn = document.createElement('button');
            noteBtn.textContent = 'Notes/Plus';
            noteBtn.className = 'btn ghost';
            noteBtn.onclick = () => {
              // Build a richer HTML summary for the commande
              const parts = [];
              parts.push(`<div style="margin-bottom:8px;"><b>ID:</b> ${cmd.id}</div>`);
              parts.push(`<div style="margin-bottom:8px;"><b>Statut:</b> ${cmd.statut || '-'} | <b>Créé:</b> ${created || '-'}</div>`);
              if (cmd.nom_complet) parts.push(`<div style="margin-bottom:6px;"><b>Nom:</b> ${escapeHtml(cmd.nom_complet)}</div>`);
              if (cmd.telephone) parts.push(`<div style="margin-bottom:6px;"><b>Téléphone:</b> ${escapeHtml(cmd.telephone)}</div>`);
              if (cmd.email) parts.push(`<div style="margin-bottom:6px;"><b>Email:</b> ${escapeHtml(cmd.email)}</div>`);
              if (cmd.location) parts.push(`<div style="margin-bottom:6px;"><b>Lieu:</b> ${escapeHtml(cmd.location)}</div>`);
              if (cmd.date_retrait) parts.push(`<div style="margin-bottom:6px;"><b>Date retrait:</b> ${escapeHtml(cmd.date_retrait)} ${cmd.creneau ? '| Créneau: ' + escapeHtml(cmd.creneau) : ''}</div>`);
              if (cmd.precisions) parts.push(`<div style="margin-bottom:6px;"><b>Précisions:</b> ${escapeHtml(cmd.precisions)}</div>`);
              // produit can be JSON or legacy string
              try {
                if (cmd.produit) {
                  const p = JSON.parse(cmd.produit);
                  if (Array.isArray(p)) {
                    // Build a small table with product name and quantity for clarity
                    const rows = p.map(it => {
                      let displayName = it.name || '';
                      if (!displayName) {
                        const menus = window._adminMenuItems || [];
                        const menu = menus.find(m => String(m.id) === String(it.menu_id));
                        displayName = menu ? menu.name : ('#' + String(it.menu_id || ''));
                      }
                      return `<tr data-menu-id="${escapeHtml(String(it.menu_id || ''))}"><td style="padding:6px 10px;">${escapeHtml(String(displayName))}</td><td style="padding:6px 10px; text-align:right; white-space:nowrap;">${escapeHtml(String(it.qty || ''))}</td></tr>`;
                    }).join('');
                    const table = `<table style="width:100%; border-collapse:collapse; margin-top:6px; background:transparent;"><thead><tr><th style="text-align:left; font-weight:600; padding:6px 10px;">Produit</th><th style="text-align:right; font-weight:600; padding:6px 10px;">Qté</th></tr></thead><tbody>${rows}</tbody></table>`;
                    parts.push(`<div style="margin-bottom:6px;"><b>Produits:</b>${table}</div>`);
                  } else {
                    parts.push(`<div style="margin-bottom:6px;"><b>Produits:</b> ${escapeHtml(String(cmd.produit))}</div>`);
                  }
                }
              } catch (e) {
                parts.push(`<div style="margin-bottom:6px;"><b>Produits:</b> ${escapeHtml(String(cmd.produit || ''))}</div>`);
              }
              if (cmd.raison_refus) parts.push(`<div style="margin-top:8px; color: #f66;"><b>Raison du refus:</b> ${escapeHtml(cmd.raison_refus)}</div>`);

              const html = parts.join('');
              showInfoModal('Notes / Détails', html);
              // If any product rows used a fallback (#id), try to fetch menus to resolve names
              try {
                const modal = document.getElementById('info-modal-overlay');
                if (modal) {
                  const rows = modal.querySelectorAll('tbody tr[data-menu-id]');
                  const missing = [];
                  rows.forEach(r => {
                    const nameCell = r.querySelector('td');
                    if (nameCell && nameCell.textContent && nameCell.textContent.trim().startsWith('#')) {
                      missing.push(r.dataset.menuId);
                    }
                  });
                  if (missing.length > 0) {
                    // fetch menus and update names
                    (async () => {
                      try {
                        const res = await fetch(apiBase + '/menus', { credentials: 'include' });
                        if (!res.ok) return;
                        const menus = await res.json();
                        window._adminMenuItems = menus;
                        rows.forEach(r => {
                          const mid = r.dataset.menuId;
                          if (!mid) return;
                          const nameCell = r.querySelector('td');
                          const menu = menus.find(m => String(m.id) === String(mid));
                          if (menu && nameCell) nameCell.textContent = menu.name || ('#' + mid);
                        });
                      } catch (e) { /* ignore */ }
                    })();
                  }
                }
              } catch (e) {}
            };
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
  // Admin dashboard statistics - fetch from protected endpoint and render
  async function loadStats() {
    // The stats tab container is `tab-stats` in the HTML. Older code looked for
    // a non-existent `admin-stats` id which caused loadStats to be a no-op.
    const container = document.getElementById('tab-stats');
    if (!container) return;
    try {
      const res = await fetch(apiBase + '/stats', { credentials: 'include' });
      if (res.status === 401) { window.location.href = 'login.html'; return; }
      if (!res.ok) throw new Error('Failed to load stats');
      const d = await res.json();
      const totalEl = document.getElementById('stat-total-orders');
      const last30El = document.getElementById('stat-last30');
      const byStatusEl = document.getElementById('stat-by-status');
      const revenueEl = document.getElementById('stat-revenue');
      if (totalEl) totalEl.textContent = String(d.totalOrders || 0);
      if (last30El) last30El.textContent = String(d.last30 || 0);
      if (byStatusEl) {
        byStatusEl.innerHTML = '';
        if (d.byStatus && Object.keys(d.byStatus).length > 0) {
          for (const k of Object.keys(d.byStatus)) {
            const div = document.createElement('div');
            div.style.marginBottom = '4px';
            div.textContent = `${k}: ${d.byStatus[k]}`;
            byStatusEl.appendChild(div);
          }
        } else {
          byStatusEl.textContent = '-';
        }
      }
      if (revenueEl) revenueEl.textContent = d.total_revenue_cents ? (Number(d.total_revenue_cents)/100).toFixed(2) + ' €' : '0.00 €';
      // remember last stats for CSV export
      adminLastStats = d;
      // render orders-by-day chart if available
      try {
        const ordersSeries = (d.orders_by_day && Array.isArray(d.orders_by_day)) ? d.orders_by_day : [];
        const revenueSeries = (d.revenue_by_day && Array.isArray(d.revenue_by_day)) ? d.revenue_by_day : [];
        const labels = ordersSeries.map(s => {
          try { const dt = new Date(s.date); return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); } catch(e){ return s.date; }
        });
        const ordersData = ordersSeries.map(s => Number(s.count || 0));
        // align revenue data by date (server returns ordered arrays but align defensively)
        const revenueData = ordersSeries.map(s => {
          const r = revenueSeries.find(rr => rr.date === s.date);
          return r ? Number((r.cents || 0) / 100) : 0;
        });
        const ctxEl = document.getElementById('ordersChart');
        if (ctxEl && typeof Chart !== 'undefined') {
          const ctx = ctxEl.getContext('2d');
          if (!ordersChart) {
            ordersChart = new Chart(ctx, {
              type: 'line',
              data: {
                labels,
                datasets: [
                  { label: 'Commandes', data: ordersData, fill: true, borderColor: '#36a2eb', backgroundColor: 'rgba(54,162,235,0.12)', tension: 0.3, yAxisID: 'y' },
                  { label: 'CA (€)', data: revenueData, fill: false, borderColor: '#ff9f40', backgroundColor: 'rgba(255,159,64,0.08)', tension: 0.3, yAxisID: 'y1' }
                ]
              },
              options: {
                responsive: true,
                plugins: { legend: { display: true } },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, position: 'left', ticks: { precision:0 } },
                  y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { callback: v => Number(v).toFixed(2) + ' €' } }
                },
                interaction: { mode: 'index', intersect: false }
              }
            });
          } else {
            ordersChart.data.labels = labels;
            ordersChart.data.datasets[0].data = ordersData;
            ordersChart.data.datasets[1].data = revenueData;
            ordersChart.update();
          }
        }
        // render itemsSold list
        const itemsList = document.getElementById('stat-items-list');
        if (itemsList) {
          if (d.itemsSold && d.itemsSold.length > 0) {
            itemsList.innerHTML = d.itemsSold.map(it => `<div>${it.name || ('#'+it.menu_id)}: ${it.qty} pcs</div>`).join('');
          } else {
            itemsList.textContent = 'Aucun item analysable (formats legacy présents)';
          }
        }
      } catch (e) { console.error('chart render error', e); }
      // wire CSV export button
      try {
        const btn = document.getElementById('stat-export-csv');
        if (btn) {
          btn.onclick = () => {
            const s = adminLastStats || d;
            if (!s) { showAlertModal('Erreur', 'Aucune donnée disponible pour export.'); return; }
            // build CSV: date,orders,revenue_eur
            const rows = [['date','orders','revenue_eur']];
            const ob = s.orders_by_day || [];
            const rb = s.revenue_by_day || [];
            for (let i = 0; i < ob.length; i++) {
              const date = ob[i].date;
              const ordersVal = ob[i].count || 0;
              const rObj = rb.find(x => x.date === date);
              const revenueVal = rObj ? ((rObj.cents || 0) / 100).toFixed(2) : '0.00';
              rows.push([date, String(ordersVal), String(revenueVal)]);
            }
            const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fname = 'stats-' + (new Date().toISOString().slice(0,10)) + '.csv';
            a.download = fname;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          };
        }
      } catch (e) { console.error('CSV export bind failed', e); }
    } catch (e) {
      console.error('Failed to load admin stats', e);
      // Surface an inline error message in the stats tab so the admin sees a
      // clear failure instead of an empty panel.
      try {
        if (container) {
          container.innerHTML = `<div class="empty">Erreur lors du chargement des statistiques. Vérifiez la console pour plus d'informations.</div>`;
        }
      } catch (e2) { /* ignore */ }
    }
  }
  // initial load is handled when the stats tab is activated (see tab activation code)
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
    if (!name) { showAlertModal('Validation', 'Nom requis'); return; }
    if (name.length > 255) { showAlertModal('Validation', 'Le nom est trop long (max 255 caractères).'); return; }
    if (reference.length > 100) { showAlertModal('Validation', 'La référence est trop longue (max 100 caractères).'); return; }
    if (isNaN(quantity) || quantity < 0) { showAlertModal('Validation', 'La quantité doit être un nombre >= 0.'); document.getElementById('stock-qty').focus(); return; }
  quantity = Math.floor(quantity || 0);
        try {
              // Always create a new product from the form (editing is done inline now)
              const _csrf = await getCsrfToken();
              const res = await fetch('/api/stock', { method: 'POST', headers:{'Content-Type':'application/json', 'X-CSRF-Token': _csrf || ''}, body: JSON.stringify({ name, reference, quantity, available }) , credentials:'include'});
              if (!res.ok) throw new Error('err');
              form.reset();
          await loadStock();
  } catch (err) { showAlertModal('Erreur', 'Erreur lors de la sauvegarde'); }
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
        const confirmedDelete = await showConfirmModal('Supprimer ce produit ?', 'Voulez-vous supprimer ce produit ?');
        if (!confirmedDelete) return;
        try {
          const _csrf = await getCsrfToken();
          const res = await fetch('/api/stock/' + id, { method: 'DELETE', credentials:'include', headers: { 'X-CSRF-Token': _csrf || '' } });
          if (!res.ok) throw new Error('err');
          await loadStock();
  } catch (e) { showAlertModal('Erreur', 'Erreur suppression'); }
      }
      if (action === 'toggle') {
        const item = (window._adminStockItems||[]).find(x=>String(x.id)===String(id));
        if (!item) return;
        try {
          const _csrf = await getCsrfToken();
          const res = await fetch('/api/stock/' + id, { method: 'PUT', headers:{'Content-Type':'application/json', 'X-CSRF-Token': _csrf || ''}, body: JSON.stringify({ available: !item.available }), credentials:'include' });
          if (!res.ok) throw new Error('err');
          await loadStock();
  } catch (e) { showAlertModal('Erreur', 'Erreur'); }
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
          if (!newVal) { showAlertModal('Validation', 'Le nom ne peut pas être vide.'); input.focus(); return; }
          if (newVal.length > 255) { showAlertModal('Validation', 'Le nom est trop long (max 255 caractères).'); input.focus(); return; }
        }
        if (field === 'reference') {
          if (newVal.length > 100) { showAlertModal('Validation', 'La référence est trop longue (max 100 caractères).'); input.focus(); return; }
        }
        if (field === 'quantity') {
          if (isNaN(newVal) || newVal < 0) { showAlertModal('Validation', 'La quantité doit être un nombre >= 0.'); input.focus(); return; }
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
            const _csrf = await getCsrfToken();
            const res = await fetch('/api/stock/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _csrf || '' }, credentials: 'include', body: JSON.stringify(body), signal: controller.signal });
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
            showAlertModal('Erreur', 'Erreur lors de la sauvegarde — modification annulée.');
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
        const _csrf = await getCsrfToken();
        const res = await fetch(apiBase + '/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _csrf || '' },
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
