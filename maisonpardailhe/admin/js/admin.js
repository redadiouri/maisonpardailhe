const apiBase = '/api/admin';

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

async function preloadMenus() {
  try {
    if (window._menusCache) return window._menusCache;
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
      }
    return `<div class="product-list">${String(rawProduit)}</div>`;
}

if (document.getElementById('loginForm')) {
    const pwdInput = document.getElementById('loginPassword');
  const togglePwd = document.getElementById('togglePwd');
  const eyeOpenSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const eyeSlashSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2l20 20" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 5c-1.73 0-3.33.35-4.78.98" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12c-1.73 3.89-6 7-11 7-1.25 0-2.45-.18-3.58-.52" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (togglePwd && pwdInput) {
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
        window.location.href = '/admin/dashboard';
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

let statsIntervalId = null;
let ordersChart = null;
let statusChart = null;
let adminLastStats = null;

const style = document.createElement('style');
style.innerHTML = `@keyframes shake { 0%{transform:translateX(0);} 25%{transform:translateX(-5px);} 50%{transform:translateX(5px);} 75%{transform:translateX(-5px);} 100%{transform:translateX(0);} }`;
document.head.appendChild(style);

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

function adminDebug(...args) {
  try {
    const enabledGlobal = (typeof window !== 'undefined' && window.ADMIN_DEBUG === true);
    const enabledStorage = (typeof localStorage !== 'undefined' && (localStorage.getItem('admin.debug') === '1' || localStorage.getItem('admin.debug') === 'true'));
    if (enabledGlobal || enabledStorage) {
      if (console && typeof console.debug === 'function') console.debug(...args);
      else if (console && typeof console.log === 'function') console.log(...args);
    }
  } catch (e) {  }
}

function showConfirmModal(title, message) {
  return new Promise((resolve) => {
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
            overlay.addEventListener('click', (ev) => { if (ev.target === overlay) { overlay.remove(); resolve(false); } });
    } else {
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
            content.innerHTML = htmlContent || '';
    } else {
      overlay.querySelector('h3').textContent = title || '';
      overlay.querySelector('.info-modal-content').innerHTML = htmlContent || '';
      overlay.style.display = 'flex';
    }
  });
}

function showAlertModal(title, message) {
  return new Promise((resolve) => {
    const html = `<div style="padding:12px 0;">${String(message || '')}</div>`;
    showInfoModal(title || 'Info', html).then(resolve).catch(() => resolve());
  });
}

function showToast(message, options = {}) {
  try {
    const duration = options.duration || 3000;
    const type = options.type || 'success';     let container = document.getElementById('toast-container');
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

        requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => { try { toast.remove(); } catch (e) {} }, 260);
    }, duration);
  } catch (e) {  }
}

if (document.getElementById('logoutBtn')) {
    (async function loadCurrentAdmin() {
    try {
      const res = await fetch(apiBase + '/me', { credentials: 'include' });
      if (!res.ok) return;
      const current = await res.json();
      window._currentAdmin = current;
            if (!current || String(current.username).toLowerCase() !== 'admin') {
        const adminBtn = document.querySelector('.tab-btn-vertical[data-tab="admins"]');
        if (adminBtn) adminBtn.style.display = 'none';
      }
            if (!current || !current.can_edit_menus) {
        const menuBtn = document.querySelector('.tab-btn-vertical[data-tab="menus"]');
        if (menuBtn) menuBtn.style.display = 'none';
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
                        const form = document.getElementById('menu-form');
            if (form) {
              Array.from(form.elements || []).forEach(el => el.disabled = true);
              const addBtn = form.querySelector('button[type="submit"]');
              if (addBtn) addBtn.disabled = true;
            }
          }
        } catch (e) {}
                try {
          const saved = localStorage.getItem('admin.activeTab');
          if (saved === 'menus' || saved === 'admins') localStorage.removeItem('admin.activeTab');
        } catch (e) {}
      }
    } catch (e) {  }
  })();

          try {
    if (typeof loadStats === 'function') {
            loadStats().catch(() => {});
    }
  } catch (e) {  }
  document.getElementById('logoutBtn').onclick = async () => {
    const _csrf = await getCsrfToken();
    await fetch(apiBase + '/logout', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': _csrf || '' } });
    window.location.href = '/admin/login';
  };

        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileLogout = document.getElementById('mobile-logout');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const body = document.body;

  function openMobileMenu() {
    body.classList.add('sidebar-open');
    overlay.classList.add('active');
    sidebar.setAttribute('aria-hidden', 'false');
  }

  function closeMobileMenu() {
    body.classList.remove('sidebar-open');
    overlay.classList.remove('active');
    sidebar.setAttribute('aria-hidden', 'true');
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      if (body.classList.contains('sidebar-open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeMobileMenu);
  }

        const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (sidebarCollapsed && sidebar) {
    sidebar.classList.add('collapsed');
  }
  
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', () => {
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
        
                sidebarToggleBtn.setAttribute('title', isCollapsed ? 'Développer le menu' : 'Réduire le menu');
        sidebarToggleBtn.setAttribute('aria-label', isCollapsed ? 'Développer le menu' : 'Réduire le menu');
      }
    });
  }
  
    const tabButtons = document.querySelectorAll('.tab-btn-vertical');
  tabButtons.forEach(btn => {
    const label = btn.querySelector('.tab-label');
    if (label) {
      btn.setAttribute('data-tooltip', label.textContent.trim());
    }
  });

  if (mobileLogout) {
    mobileLogout.addEventListener('click', async () => {
      if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        try {
          await fetch(apiBase + '/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {}
        window.location.href = '/admin/login';
      }
    });
  }

        document.querySelectorAll('.tab-btn-vertical').forEach(btn => {
    btn.onclick = () => {
      const tabName = btn.dataset.tab;
      
            closeMobileMenu();
      
            const activate = (name) => {
        document.querySelectorAll('.tab-btn-vertical').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const targetBtn = document.querySelector(`.tab-btn-vertical[data-tab="${name}"]`);
        if (targetBtn) {
          targetBtn.classList.add('active');
          targetBtn.setAttribute('aria-selected', 'true');
        }
        const target = document.getElementById('tab-' + name);
        if (target) target.classList.add('active');
        const listId = (name === 'attente') ? 'attente-list' : 'encours-list';
        setTimeout(() => {
          adjustListMaxHeight(listId);
          animateCards(listId);
        }, 80);
        try { localStorage.setItem('admin.activeTab', name); } catch (e) {}
                try {
          if (name === 'stockage' && typeof loadStock === 'function') loadStock();
          if (name === 'menus' && typeof loadMenus === 'function') loadMenus();
          if (name === 'admins' && typeof loadAdmins === 'function') loadAdmins();
          if (name === 'notifications' && typeof loadNotifications === 'function') loadNotifications();
          if (name === 'emails' && typeof initEmailTemplatesTab === 'function') {
                        const emailsTab = document.querySelector('[data-tab="emails"]');
            if (emailsTab && emailsTab._emailsInitialized !== true) {
              initEmailTemplatesTab();
              emailsTab._emailsInitialized = true;
            }
          }
          if (name === 'stats' && typeof loadStats === 'function') {
                        if (typeof initStatsControls === 'function') initStatsControls();
                        loadStats();
            if (statsIntervalId) clearInterval(statsIntervalId);
            statsIntervalId = setInterval(loadStats, 60 * 1000);
          } else {
            if (statsIntervalId) { clearInterval(statsIntervalId); statsIntervalId = null; }
          }
                  } catch (e) {  }
      };
      activate(tabName);
    };
  });

    (function restoreActiveTab() {
    try {
      const saved = localStorage.getItem('admin.activeTab');
      if (saved) {
        const btn = document.querySelector(`.tab-btn-vertical[data-tab="${saved}"]`);
        if (btn) {
          btn.click();
          return;
        }
      }
    } catch (e) {}
        const first = document.querySelector('.tab-btn-vertical');
    if (first) first.click();
  })();

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

          if (field === 'name' && !newVal) { showAlertModal('Validation', 'Le nom ne peut pas être vide.'); input.focus(); return; }
  if (field === 'price_cents' && newVal < 0) { showAlertModal('Validation', 'Prix invalide'); input.focus(); return; }

                if (String(newVal) === String(item[field] ?? '')) { cancel(); return; }

        const key = `${id}:${field}`;
        const origValue = item[field];
        const origText = original;

                item[field] = newVal;
        window._adminMenuItems = (window._adminMenuItems || []).map(it => (String(it.id) === String(item.id) ? item : it));
        td.removeAttribute('data-editing');
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
                        if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
            const success = document.createElement('span'); success.className = 'cell-success'; success.textContent = '✔'; td.appendChild(success);
            delete td.dataset.scheduled; PENDING.delete(key);
            if (tr && rowPendingCount(id) === 0) { tr.dataset.modified = '0'; setRowModified(tr, false); }
            setTimeout(()=>{ if (success && success.parentNode) success.parentNode.removeChild(success); }, SUCCESS_MS);
          } catch (err) {
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

    async function loadAdmins() {
    const container = document.querySelector('#tab-admins');
    if (!container) return;
    const tbody = document.querySelector('#admin-table tbody');
    try {
      const res = await fetch(apiBase + '/admins', { credentials: 'include' });
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error('Failed');
      const admins = await res.json();
      renderAdminsTable(admins);
    } catch (e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="2" style="color:#f33; text-align:center;">Erreur de chargement des administrateurs.</td></tr>';
    }
  }

    async function loadNotifications() {
    const container = document.querySelector('#tab-notifications');
    if (!container) return;
    const listEl = document.getElementById('notifications-list');
    const loader = document.getElementById('notifications-loader');
    if (loader) loader.style.display = 'block';
    try {
      const res = await fetch('/api/admin/notifications', { credentials: 'include' });
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error('Failed');
      const items = await res.json();
      renderNotificationsList(items);
            const unread = (items || []).filter(i => !i.read).length;
      const badge = document.getElementById('badge-notifs');
      if (badge) badge.textContent = unread ? String(unread) : '';
    } catch (e) {
      if (listEl) listEl.innerHTML = '<div style="color:#f33; text-align:center;">Erreur de chargement des notifications.</div>';
    } finally {
      if (loader) loader.style.display = 'none';
    }
  }

  function renderNotificationsList(items) {
    const listEl = document.getElementById('notifications-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!items || items.length === 0) {
      listEl.innerHTML = '<div style="color:#aaa; text-align:center;">Aucune notification.</div>';
      return;
    }
    const ul = document.createElement('div'); ul.className = 'admin-notifs-list';
    items.forEach(it => {
      const el = document.createElement('div'); el.className = 'admin-notif';
      el.style.border = '1px solid rgba(255,255,255,0.04)';
      el.style.padding = '10px'; el.style.marginBottom = '8px'; el.style.borderRadius = '8px';
      const meta = document.createElement('div'); meta.style.display = 'flex'; meta.style.gap = '8px'; meta.style.alignItems = 'center';
      const title = document.createElement('div'); title.style.fontWeight = '700'; title.textContent = it.subject || 'Message de contact';
      const when = document.createElement('div'); when.style.marginLeft = 'auto'; when.style.color = 'var(--muted)'; when.style.fontSize = '0.85rem';
      const d = new Date(it.created_at); when.textContent = isNaN(d.getTime()) ? (it.created_at || '') : d.toLocaleString();
      meta.appendChild(title); meta.appendChild(when);
      const body = document.createElement('div'); body.style.marginTop = '8px'; body.innerHTML = `<div><strong>${escapeHtml(it.fullname)}</strong> — <a href="mailto:${escapeAttr(it.email)}">${escapeHtml(it.email)}</a></div><div style="margin-top:6px; white-space:pre-wrap;">${escapeHtml(it.message)}</div>`;
      const actions = document.createElement('div'); actions.style.marginTop = '8px'; actions.style.display = 'flex'; actions.style.gap = '8px';
      const mark = document.createElement('button'); mark.className = 'btn small'; mark.textContent = it.read ? 'Lu' : 'Marquer lu';
      const del = document.createElement('button'); del.className = 'btn small danger'; del.textContent = 'Supprimer';
      mark.addEventListener('click', async () => {
        try {
          const _csrf = await getCsrfToken();
          const res = await fetch('/api/admin/notifications/' + encodeURIComponent(it.id) + '/read', { method: 'PUT', credentials: 'include', headers: { 'X-CSRF-Token': _csrf || '' } });
          if (res.ok) { mark.textContent = 'Lu'; el.style.opacity = '0.7'; loadNotifications(); }
        } catch (e) {}
      });
      del.addEventListener('click', async () => {
        try {
          if (!confirm('Supprimer cette notification ?')) return;
          const _csrf = await getCsrfToken();
          const res = await fetch('/api/admin/notifications/' + encodeURIComponent(it.id), { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-Token': _csrf || '' } });
          if (res.ok) { showToast('Notification supprimée'); loadNotifications(); }
        } catch (e) { showAlertModal('Erreur', 'Impossible de supprimer'); }
      });
      actions.appendChild(mark); actions.appendChild(del);
      el.appendChild(meta); el.appendChild(body); el.appendChild(actions);
      ul.appendChild(el);
    });
    listEl.appendChild(ul);
  }

    function escapeHtml(s) { if (s === undefined || s === null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function escapeAttr(s) { return (s === undefined || s === null) ? '' : String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }


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
          if (res.status === 401) { window.location.href = '/admin/login'; return; }
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
          <button class="btn small icon-only danger" data-action="delete-menu" data-id="${it.id}" title="Supprimer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11v6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

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
            if (action === 'toggle-perm') {
        const checkbox = btn;         const newVal = !!checkbox.checked;
        try {
          const _csrf = await getCsrfToken();
          const res = await fetch(apiBase + '/admins/' + id, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _csrf || '' }, body: JSON.stringify({ can_edit_menus: newVal }) });
          if (!res.ok) throw new Error('err');
          showToast('Permission mise à jour', { duration: 2000 });
        } catch (e) {
          showAlertModal('Erreur', 'Erreur lors de la mise à jour des permissions');
                    checkbox.checked = !newVal;
        }
      }

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
                const item = (window._adminMenuItems||[]).find(x=>String(x.id)===String(id));
        if (!item) return;
  document.getElementById('menu-name').value = item.name || '';
  if (document.getElementById('menu-description')) document.getElementById('menu-description').value = item.description || '';
  document.getElementById('menu-price').value = (Number(item.price_cents||0)/100).toFixed(2);
  document.getElementById('menu-stock').value = Number(item.stock||0);
  document.getElementById('menu-is-quote').checked = !!item.is_quote;
  if (document.getElementById('menu-available')) document.getElementById('menu-available').checked = !!item.available;
  document.getElementById('menu-visible').checked = !!item.visible_on_menu;
                form.dataset.editingId = id;
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

    function formatDateISO(d) {
    if (!d) return '-';
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const dt = new Date(d + 'T00:00:00');
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      }
    }
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
        try {
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) return dt.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {}
    return d;
  }

    function parseDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
        if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr) || dateStr.includes('Z')) {
      try {
                const base = new Date(dateStr);
        if (isNaN(base.getTime())) return null;
        const [hh, mm] = timeStr.split(':').map(Number);
        base.setHours(hh, mm, 0, 0);
        return base;
      } catch (e) {  }
    }
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr) && /^\d{2}:\d{2}$/.test(timeStr)) {
            const iso = `${dateStr}T${timeStr}:00`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }
        const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr);
    if (fr && /^\d{2}:\d{2}$/.test(timeStr)) {
      const day = Number(fr[1]);
      const month = Number(fr[2]) - 1;
      const year = Number(fr[3]);
      const [hh, mm] = timeStr.split(':').map(Number);
      const d = new Date(year, month, day, hh, mm, 0);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) return d;
    }
        try {
      const d = new Date(`${dateStr} ${timeStr}`);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  }

    function createCommandeCard(cmd, statut) {
    const card = document.createElement('div');
    card.className = 'commande-card';
    card.dataset.commandeId = cmd.id;
    
    const dateRetrait = formatDateISO(cmd.date_retrait);
    const created = cmd.date_creation ? new Date(cmd.date_creation).toLocaleString('fr-FR') : '';
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
        if (raison === null) return;
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
        try {
          const res = await fetch(apiBase + `/commandes/${cmd.id}/terminer`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': _csrf || '' } });
          if (res.ok) {
                        showToast('Commande marquée terminée — demande d\'envoi d\'un email de remerciement déclenchée', { type: 'success' });
            console.info(`📧 Email trigger requested for commande #${cmd.id}`);
                        try { const body = await res.json().catch(()=>null); console.debug('Server response for terminer:', body); } catch(e){}
          } else {
            showToast('Erreur lors de la finalisation de la commande', { type: 'error' });
            console.warn('Failed to mark commande as terminée', res.status);
          }
        } catch (err) {
          showToast('Erreur réseau lors de la finalisation', { type: 'error' });
          console.error('Error finishing commande', err);
        } finally {
          loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');
        }
      };
      
      const noteBtn = document.createElement('button');
      noteBtn.textContent = 'Notes/Plus';
      noteBtn.className = 'btn ghost';
      noteBtn.onclick = () => {
        const created = cmd.date_creation ? new Date(cmd.date_creation).toLocaleString('fr-FR') : '';
                const parts = [];
        parts.push(`<div style="margin-bottom:8px;"><b>ID:</b> ${cmd.id}</div>`);
        parts.push(`<div style="margin-bottom:8px;"><b>Statut:</b> ${cmd.statut || '-'} | <b>Créé:</b> ${created || '-'}</div>`);
        if (cmd.nom_complet) parts.push(`<div style="margin-bottom:6px;"><b>Nom:</b> ${escapeHtml(cmd.nom_complet)}</div>`);
        if (cmd.telephone) parts.push(`<div style="margin-bottom:6px;"><b>Téléphone:</b> ${escapeHtml(cmd.telephone)}</div>`);
        if (cmd.email) parts.push(`<div style="margin-bottom:6px;"><b>Email:</b> ${escapeHtml(cmd.email)}</div>`);
        if (cmd.location) parts.push(`<div style="margin-bottom:6px;"><b>Lieu:</b> ${escapeHtml(cmd.location)}</div>`);
        if (cmd.date_retrait) parts.push(`<div style="margin-bottom:6px;"><b>Date retrait:</b> ${escapeHtml(cmd.date_retrait)} ${cmd.creneau ? '| Créneau: ' + escapeHtml(cmd.creneau) : ''}</div>`);
        if (cmd.precisions) parts.push(`<div style="margin-bottom:6px;"><b>Précisions:</b> ${escapeHtml(cmd.precisions)}</div>`);
                try {
          if (cmd.produit) {
            const p = JSON.parse(cmd.produit);
            if (Array.isArray(p)) {
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
      };
      
      actions.appendChild(finishBtn);
      actions.appendChild(noteBtn);
      
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
      }
    }
    
    return card;
  }

    async function addCommandeToList(cmd, statut, containerId, badgeId) {
    const list = document.getElementById(containerId);
    const badge = document.getElementById(badgeId);
    
    if (!list) {
      console.error('❌ List element not found:', containerId);
      return;
    }
    
        try { await preloadMenus().catch(()=>{}); } catch(e) {}
    
        const existing = list.querySelector(`[data-commande-id="${cmd.id}"]`);
    if (existing) return;
    
        const noCommandeMsg = list.querySelector('div[style*="Aucune commande"]');
    if (noCommandeMsg) noCommandeMsg.remove();
    
        const card = createCommandeCard(cmd, statut);
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    list.insertBefore(card, list.firstChild);
    
        requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
    
        if (badge) {
      const currentCount = parseInt(badge.textContent) || 0;
      badge.textContent = currentCount + 1;
    }
    
        if (statut === 'en_cours') {
      try { 
        if (typeof updateCountdowns === 'function') updateCountdowns(); 
      } catch (e) {}
    }
    
        adjustListMaxHeight(containerId);
  }

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
            if (res.status === 401) {
                console.warn('Admin API returned 401 — redirecting to login');
        window.location.href = '/admin/login';
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

    try { await preloadMenus().catch(()=>{}); } catch(e) {}

  commandes.forEach(cmd => {
                    const card = createCommandeCard(cmd, statut);
          list.appendChild(card);

                  });
                adjustListMaxHeight(containerId);
                animateCards(containerId);
      } else {
        list.innerHTML = '<div style="color:#f33; text-align:center; margin:30px 0;">Erreur de chargement des commandes.</div>';
      }
    } catch (err) {
      loader.style.display = 'none';
      list.innerHTML = '<div style="color:#f33; text-align:center; margin:30px 0;">Erreur serveur.</div>';
    }
  }
    async function loadStats() {
    const container = document.getElementById('tab-stats');
    if (!container) return;
    
    try {
            const periodSelect = document.getElementById('stats-period');
      const period = periodSelect ? periodSelect.value : '30';
      
      const res = await fetch(apiBase + '/stats?period=' + period, { credentials: 'include' });
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error('Failed to load stats');
      const d = await res.json();
      
            updateKPICard('stat-total-orders', d.periodOrders || 0, d.trends?.orders);
      updateKPICard('stat-revenue', formatCurrency(d.period_revenue_cents || 0), d.trends?.revenue);
      updateKPICard('stat-avg-basket', formatCurrency(d.avg_basket_cents || 0), d.trends?.basket);
      
            const pendingEl = document.getElementById('stat-pending');
      if (pendingEl) {
        const pending = (d.byStatus?.attente || 0) + (d.byStatus?.encours || 0);
        pendingEl.textContent = String(pending);
      }
      
            adminLastStats = d;
      
            renderOrdersChart(d.orders_by_day || [], d.revenue_by_day || []);
      
            renderStatusChart(d.byStatus || {});
      
            renderTopProducts(d.itemsSold || []);
      
            renderRecentActivity(d.recent_orders || []);
      
            renderAlerts(d.alerts || []);
      
            renderLocationStats(d.location_stats || {});
      
            renderCustomerInsights(d.customer_insights || {});
      
            renderYoYComparison(d.yoy_comparison || {});
      
            setupCSVExport(d);
      
    } catch (e) {
      console.error('Failed to load admin stats', e);
      if (container) {
        container.innerHTML = `<div class="empty-state">Erreur lors du chargement des statistiques. Vérifiez la console pour plus d'informations.</div>`;
      }
    }
  }
  
    function updateKPICard(elementId, value, trend) {
    const valueEl = document.getElementById(elementId);
    if (!valueEl) return;
    valueEl.textContent = String(value);
    
    const trendEl = document.getElementById(elementId + '-trend');
    if (trendEl && trend !== null && trend !== undefined) {
      const trendNum = parseFloat(trend);
      const isPositive = trendNum >= 0;
      trendEl.className = 'stat-trend ' + (isPositive ? 'positive' : 'negative');
      trendEl.textContent = (isPositive ? '+' : '') + trend + '%';
    } else if (trendEl) {
      trendEl.textContent = '';
    }
  }
  
    function formatCurrency(cents) {
    return (Number(cents) / 100).toFixed(2) + ' €';
  }
  
    function renderOrdersChart(ordersSeries, revenueSeries) {
    const ctxEl = document.getElementById('ordersChart');
    if (!ctxEl || typeof Chart === 'undefined') return;
    
    const labels = ordersSeries.map(s => {
      try {
        const dt = new Date(s.date);
        return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      } catch(e) {
        return s.date;
      }
    });
    
    const ordersData = ordersSeries.map(s => Number(s.count || 0));
    
        const revenueData = ordersSeries.map(s => {
      const r = revenueSeries.find(rr => rr.date === s.date);
      return r ? Number((r.cents || 0) / 100) : 0;
    });
    
    const ctx = ctxEl.getContext('2d');
    
    if (!ordersChart) {
      ordersChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Commandes',
              data: ordersData,
              fill: true,
              borderColor: '#36a2eb',
              backgroundColor: 'rgba(54,162,235,0.12)',
              tension: 0.4,
              yAxisID: 'y',
              borderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 6
            },
            {
              label: 'CA (€)',
              data: revenueData,
              fill: false,
              borderColor: '#ff9f40',
              backgroundColor: 'rgba(255,159,64,0.08)',
              tension: 0.4,
              yAxisID: 'y1',
              borderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1
            }
          },
          scales: {
            x: {
              grid: { display: false, color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#bdbfc1', maxRotation: 45, minRotation: 0 }
            },
            y: {
              beginAtZero: true,
              position: 'left',
              ticks: { precision: 0, color: '#bdbfc1' },
              grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: { display: false },
              ticks: {
                callback: v => (Number(v).toFixed(0)) + '€',
                color: '#bdbfc1'
              }
            }
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
  
    function renderStatusChart(byStatus) {
    const ctxEl = document.getElementById('statusChart');
    const legendEl = document.getElementById('stat-by-status-list');
    if (!ctxEl || typeof Chart === 'undefined') return;
    
    const statusLabels = {
      'attente': 'En attente',
      'encours': 'En cours',
      'terminee': 'Terminée',
      'refusee': 'Refusée'
    };
    
    const statusColors = {
      'attente': '#f1c40f',
      'encours': '#3498db',
      'terminee': '#2ecc71',
      'refusee': '#e74c3c'
    };
    
    const labels = [];
    const data = [];
    const colors = [];
    
    for (const [key, count] of Object.entries(byStatus)) {
      labels.push(statusLabels[key] || key);
      data.push(count);
      colors.push(statusColors[key] || '#95a5a6');
    }
    
    const ctx = ctxEl.getContext('2d');
    
    if (!statusChart) {
      statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#1b1d1e'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff'
            }
          }
        }
      });
    } else {
      statusChart.data.labels = labels;
      statusChart.data.datasets[0].data = data;
      statusChart.data.datasets[0].backgroundColor = colors;
      statusChart.update();
    }
    
        if (legendEl) {
      legendEl.innerHTML = labels.map((label, i) => `
        <div class="status-legend-item">
          <span class="status-legend-dot" style="background:${colors[i]}"></span>
          <span class="status-legend-label">${label}</span>
          <span class="status-legend-value">${data[i]}</span>
        </div>
      `).join('');
    }
  }
  
    function renderTopProducts(items) {
    const container = document.getElementById('stat-items-list');
    if (!container) return;
    
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="empty-state">Aucun produit vendu sur cette période</div>';
      return;
    }
    
        const topItems = items.slice(0, 8);
    
    container.innerHTML = topItems.map((item, index) => `
      <div class="stat-product-card" onclick="showProductTrendModal(${item.menu_id}, '${escapeHtml(item.name || 'Menu #' + item.menu_id).replace(/'/g, "\\'")}')">
        <div class="stat-product-rank">${index + 1}</div>
        <div class="stat-product-info">
          <div class="stat-product-name">${escapeHtml(item.name || 'Menu #' + item.menu_id)}</div>
          <div class="stat-product-qty">${item.qty} unités vendues</div>
        </div>
      </div>
    `).join('');
  }
  
    function renderRecentActivity(orders) {
    const container = document.getElementById('stat-recent-orders');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
      container.innerHTML = '<div class="empty-state">Aucune commande récente</div>';
      return;
    }
    
    container.innerHTML = orders.map(order => {
      const date = order.date ? new Date(order.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '-';
      const amount = formatCurrency(order.total_cents || 0);
      const statusClass = 'status-' + (order.statut || 'attente');
      const statusLabels = {
        'attente': 'En attente',
        'encours': 'En cours',
        'terminee': 'Terminée',
        'refusee': 'Refusée'
      };
      const statusLabel = statusLabels[order.statut] || order.statut;
      
      return `
        <div class="activity-row">
          <div class="activity-date">${date}</div>
          <div class="activity-customer">${escapeHtml(order.customer)}</div>
          <div class="activity-amount">${amount}</div>
          <div class="activity-status ${statusClass}">${statusLabel}</div>
        </div>
      `;
    }).join('');
  }
  
    function renderAlerts(alerts) {
    const container = document.getElementById('stats-alerts-container');
    if (!container) return;
    
    if (!alerts || alerts.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    const html = alerts.map(alert => {
      const icon = alert.type === 'danger' ? '🚨' : '⚠️';
      return `
        <div class="stats-alert alert-${alert.type}">
          <div class="stats-alert-icon">${icon}</div>
          <div class="stats-alert-content">
            <div class="stats-alert-title">${alert.title}</div>
            <div class="stats-alert-message">${alert.message}</div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  }
  
    function renderLocationStats(locationStats) {
    const container = document.getElementById('stat-locations');
    if (!container) return;
    
    const locations = [
      { 
        key: 'roquettes', 
        name: 'Roquettes', 
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' 
      },
      { 
        key: 'victor_hugo', 
        name: 'Victor Hugo (Toulouse)', 
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' 
      },
      { 
        key: 'other', 
        name: 'Autres', 
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' 
      }
    ];
    
    const totalOrders = Object.values(locationStats).reduce((sum, loc) => sum + (loc.orders || 0), 0);
    const totalRevenue = Object.values(locationStats).reduce((sum, loc) => sum + (loc.revenue || 0), 0);
    
    const html = locations.map(loc => {
      const data = locationStats[loc.key] || { orders: 0, revenue: 0 };
      const ordersPct = totalOrders > 0 ? Math.round((data.orders / totalOrders) * 100) : 0;
      const revenuePct = totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0;
      
      return `
        <div class="location-stat-card">
          <div class="location-header">
            <span class="location-icon">${loc.icon}</span>
            <span class="location-name">${loc.name}</span>
          </div>
          <div class="location-metrics">
            <div class="location-metric">
              <span class="location-metric-label">Commandes</span>
              <span class="location-metric-value">
                ${data.orders}
                <span class="location-percentage">${ordersPct}%</span>
              </span>
            </div>
            <div class="location-metric">
              <span class="location-metric-label">Chiffre d'affaires</span>
              <span class="location-metric-value revenue">
                ${formatCurrency(data.revenue)}
                <span class="location-percentage">${revenuePct}%</span>
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html || '<div class="empty-state">Aucune donnée de localisation</div>';
  }
  
    function renderCustomerInsights(insights) {
    const overviewContainer = document.getElementById('stat-customer-overview');
    const tableContainer = document.getElementById('stat-top-customers');
    
    if (!overviewContainer || !tableContainer) return;
    
        const overviewHtml = `
      <div class="customer-overview-card">
        <div class="customer-overview-label">Total clients</div>
        <div class="customer-overview-value">${insights.total_customers || 0}</div>
      </div>
      <div class="customer-overview-card">
        <div class="customer-overview-label">Clients réguliers</div>
        <div class="customer-overview-value">${insights.regular_customers || 0}</div>
      </div>
    `;
    overviewContainer.innerHTML = overviewHtml;
    
        const topCustomers = insights.top_customers || [];
    if (topCustomers.length === 0) {
      tableContainer.innerHTML = '<div class="empty-state">Aucun client</div>';
      return;
    }
    
    const tableHtml = `
      <div class="customer-row header">
        <span>Client</span>
        <span>Téléphone</span>
        <span>Commandes</span>
        <span>Total dépensé</span>
        <span>Panier moyen</span>
      </div>
      ${topCustomers.map(customer => `
        <div class="customer-row">
          <span class="customer-name">
            ${customer.name}
            ${customer.orders >= 3 ? '<span class="customer-badge regular">Régulier</span>' : ''}
          </span>
          <span class="customer-phone">${customer.phone}</span>
          <span class="customer-orders">${customer.orders}</span>
          <span class="customer-spent">${formatCurrency(customer.total_spent)}</span>
          <span class="customer-avg">${formatCurrency(customer.avg_basket)}</span>
        </div>
      `).join('')}
    `;
    
    tableContainer.innerHTML = tableHtml;
  }
  
    let yoyChart = null;
  
    function renderYoYComparison(yoyData) {
    const ctxEl = document.getElementById('yoyChart');
    if (!ctxEl) return;
    
    const current = yoyData.current || [];
    const previous = yoyData.previous || [];
    
    if (current.length === 0 && previous.length === 0) {
      const parent = ctxEl.parentElement;
      if (parent) {
        parent.innerHTML = '<div class="empty-state">Pas encore de données pour comparaison année sur année</div>';
      }
      return;
    }
    
        const labels = current.map(d => d.date);
    const currentOrders = current.map(d => d.orders);
    const previousOrders = previous.map(d => d.orders);
    
    const ctx = ctxEl.getContext('2d');
    
    if (!yoyChart) {
      yoyChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Année en cours',
              data: currentOrders,
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Année précédente',
              data: previousOrders,
              borderColor: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              borderDash: [5, 5]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { color: '#e0e0e0', font: { size: 12 } }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff'
            }
          },
          scales: {
            x: {
              grid: { color: '#2c2f33', drawBorder: false },
              ticks: { color: '#94a3b8', font: { size: 11 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: '#2c2f33', drawBorder: false },
              ticks: { color: '#94a3b8', font: { size: 11 } }
            }
          }
        }
      });
    } else {
      yoyChart.data.labels = labels;
      yoyChart.data.datasets[0].data = currentOrders;
      yoyChart.data.datasets[1].data = previousOrders;
      yoyChart.update();
    }
  }
  
    let productTrendChart = null;
  
    window.showProductTrendModal = function(menuId, productName) {
    const modal = document.getElementById('product-trend-modal');
    const titleEl = document.getElementById('product-trend-title');
    const ctxEl = document.getElementById('productTrendChart');
    
    if (!modal || !titleEl || !ctxEl) return;
    
        if (!adminLastStats || !adminLastStats.product_trends) {
      showAlertModal('Erreur', 'Données de tendance produit non disponibles');
      return;
    }
    
    const productTrend = adminLastStats.product_trends.find(p => p.menu_id === menuId);
    if (!productTrend) {
      showAlertModal('Erreur', 'Tendance non trouvée pour ce produit');
      return;
    }
    
        titleEl.textContent = `Tendance: ${productName}`;
    
        const trend = productTrend.trend || [];
    const labels = trend.map(d => d.date);
    const data = trend.map(d => d.qty);
    
    const ctx = ctxEl.getContext('2d');
    
        if (productTrendChart) {
      productTrendChart.destroy();
      productTrendChart = null;
    }
    
    productTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Quantité vendue',
          data,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff'
          }
        },
        scales: {
          x: {
            grid: { color: '#2c2f33', drawBorder: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#2c2f33', drawBorder: false },
            ticks: { color: '#94a3b8', font: { size: 11 }, stepSize: 1 }
          }
        }
      }
    });
    
        modal.style.display = 'flex';
  };
  
    window.closeProductTrendModal = function() {
    const modal = document.getElementById('product-trend-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  };
  
    window.addEventListener('click', (e) => {
    const modal = document.getElementById('product-trend-modal');
    if (e.target === modal) {
      window.closeProductTrendModal();
    }
  });
  
    function setupCSVExport(statsData) {
    const btn = document.getElementById('stat-export-csv');
    if (!btn) return;
    
    btn.onclick = () => {
      const s = adminLastStats || statsData;
      if (!s) {
        showAlertModal('Erreur', 'Aucune donnée disponible pour export.');
        return;
      }
      
            const rows = [['date', 'commandes', 'ca_eur']];
      const ob = s.orders_by_day || [];
      const rb = s.revenue_by_day || [];
      
      for (let i = 0; i < ob.length; i++) {
        const date = ob[i].date;
        const ordersVal = ob[i].count || 0;
        const rObj = rb.find(x => x.date === date);
        const revenueVal = rObj ? ((rObj.cents || 0) / 100).toFixed(2) : '0.00';
        rows.push([date, String(ordersVal), String(revenueVal)]);
      }
      
      const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fname = 'stats-' + (new Date().toISOString().slice(0, 10)) + '.csv';
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };
  }
  
  
  function initStatsControls() {
    const periodSelect = document.getElementById('stats-period');
    if (periodSelect) {
      periodSelect.addEventListener('change', () => {
        loadStats();
      });
    }
  }
  
  
  
  
  
  async function loadStock() {
    const container = document.querySelector('#tab-stockage');
    if (!container) return;
    const tableBody = document.querySelector('#stock-table tbody');
    const loader = document.getElementById('stock-refresh');
    try {
      const res = await fetch(apiBase.replace('/admin','') + '/stock');
      if (!res.ok) throw new Error('Failed');
      const items = await res.json();
      
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

  
  function escapeHtml(s){ if (s==null) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }
  function escapeAttr(s){ return escapeHtml(s); }

    (function wireStockUI(){
  const form = document.getElementById('stock-form');
  const search = document.getElementById('stock-search');
  const refresh = document.getElementById('stock-refresh');

    const PENDING = new Map();
  const DEBOUNCE_MS = 2500;   const SUCCESS_MS = 1200; 
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

        document.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
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

  
        document.addEventListener('dblclick', (e) => {
      const td = e.target.closest && e.target.closest('td[data-field]');
      if (!td) return;
      const tr = td.closest && td.closest('tr');
      if (!tr || !tr.dataset.id) return;
      const id = tr.dataset.id;
      const item = (window._adminStockItems||[]).find(x=>String(x.id)===String(id));
      if (!item) return;
      const field = td.dataset.field;
            if (td.dataset.editing === '1') return;
      td.dataset.editing = '1';
      const original = td.textContent;

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
            td.innerHTML = '';
      td.appendChild(input);
            const cancel = () => {
        td.removeAttribute('data-editing');
        td.textContent = original;
      };
            const commit = () => {
        if (td.dataset.editing !== '1') return;
        if (td.dataset.scheduled === '1') return;         let newVal;
        if (field === 'available') newVal = !!input.checked;
        else if (field === 'quantity') newVal = Number(input.value);
        else newVal = String(input.value || '').trim();

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

                if (String(newVal) === String(item[field] ?? '')) {
          cancel();
          return;
        }

        const key = `${id}:${field}`;
        const origValue = item[field];
        const origText = original;

                item[field] = newVal;
        window._adminStockItems = (window._adminStockItems || []).map(it => (String(it.id) === String(item.id) ? item : it));
        td.removeAttribute('data-editing');
        td.textContent = (field === 'available') ? (newVal ? 'Oui' : 'Non') : String(newVal);

                const badge = document.createElement('span');
        badge.className = 'cell-badge pending';
        badge.innerHTML = '<span class="cell-spinner"></span><span class="cell-undo">Annuler</span>';
        td.appendChild(badge);
        td.dataset.scheduled = '1';
                const tr = td.closest('tr');
        if (tr) { tr.dataset.modified = '1'; setRowModified(tr, true); }

                const doUndo = () => {
          const p = PENDING.get(key);
          if (p) {
            if (p.timer) clearTimeout(p.timer);
            if (p.controller) try { p.controller.abort(); } catch (e) {}
            PENDING.delete(key);
          }
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

                const timer = setTimeout(async () => {
                    const controller = new AbortController();
          PENDING.set(key, { timer: null, controller, badge, td, origValue, origText });
          try {
            const body = {}; body[field] = newVal;
            const _csrf = await getCsrfToken();
            const res = await fetch('/api/stock/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _csrf || '' }, credentials: 'include', body: JSON.stringify(body), signal: controller.signal });
            if (!res.ok) throw new Error('save-failed');
                        if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
            const success = document.createElement('span');
            success.className = 'cell-success';
            success.textContent = '✔';
            td.appendChild(success);
            delete td.dataset.scheduled;
            PENDING.delete(key);
                        if (tr && rowPendingCount(id) === 0) { tr.dataset.modified = '0'; setRowModified(tr, false); }
            setTimeout(()=>{ if (success && success.parentNode) success.parentNode.removeChild(success); }, SUCCESS_MS);
          } catch (err) {
                        const p = PENDING.get(key);
            if (p && p.controller && p.controller.signal && p.controller.signal.aborted) {
                            return;
            }
                        item[field] = origValue;
            window._adminStockItems = (window._adminStockItems || []).map(it => (String(it.id) === String(item.id) ? item : it));
            if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
            delete td.dataset.scheduled;
            td.textContent = origText;
                        td.classList.add('cell-rollback');
            setTimeout(()=> td.classList.remove('cell-rollback'), 700);
            PENDING.delete(key);
            if (tr && rowPendingCount(id) === 0) { tr.dataset.modified = '0'; setRowModified(tr, false); }
            showAlertModal('Erreur', 'Erreur lors de la sauvegarde — modification annulée.');
          }
        }, DEBOUNCE_MS);

                PENDING.set(key, { timer, controller: null, badge, td, origValue, origText });
      };

            input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
      });
            input.addEventListener('blur', () => { setTimeout(commit, 150); });
            try { input.focus(); if (input.select) input.select(); } catch (e) {}
    });
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
    function adjustListMaxHeight(containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;
        const first = list.querySelector('.commande-card');
    if (!first) {
      list.style.maxHeight = 'none';
      list.style.overflow = 'visible';
      return;
    }
        const cardRect = first.getBoundingClientRect();
    const style = window.getComputedStyle(first);
    const marginBottom = parseFloat(style.marginBottom) || 12;
        let cardHeight = Math.ceil(cardRect.height);
    if (cardHeight < 6) {
      const computedH = parseFloat(style.height) || 0;
      cardHeight = Math.ceil(computedH) || 120;     }
    const visibleCount = 3;
    const total = cardHeight * visibleCount + marginBottom * (visibleCount - 1);
    list.style.maxHeight = total + 'px';
    list.style.overflow = (list.children.length > visibleCount) ? 'auto' : 'visible';
  }

    function animateCards(containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;
    const cards = Array.from(list.querySelectorAll('.commande-card'));
    if (!cards.length) return;
        cards.forEach(c => {
      c.classList.remove('show');
      c.style.transitionDelay = '0ms';
    });
        cards.forEach((c, i) => {
      const delay = i * 80;       c.style.transitionDelay = delay + 'ms';
            setTimeout(() => c.classList.add('show'), 10 + delay);
    });
  }

  loadCommandes('en_attente', 'attente-list', 'badge-attente', 'attente-loader');
  loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');

    let eventSource = null;
  let notificationSound = null;
  let sseReconnectAttempts = 0;
  const MAX_SSE_RECONNECT_ATTEMPTS = 3;
  let sseWorking = false;
  let fallbackPollingInterval = null;

    function startFallbackPolling() {
    if (fallbackPollingInterval) return;     
    let lastCommandeId = 0;
    
        const existingCards = document.querySelectorAll('[data-commande-id]');
    existingCards.forEach(card => {
      const id = parseInt(card.dataset.commandeId);
      if (id > lastCommandeId) lastCommandeId = id;
    });
    
    fallbackPollingInterval = setInterval(async () => {
      try {
                const attenteTab = document.getElementById('tab-attente');
        if (!attenteTab || !attenteTab.classList.contains('active')) return;
        
                const res = await fetch(apiBase + '/commandes?statut=en_attente', { credentials: 'include' });
        if (!res.ok) return;
        
        const commandes = await res.json();
        
                const newCommandes = commandes.filter(cmd => cmd.id > lastCommandeId);
        
        if (newCommandes.length > 0) {
                    newCommandes.sort((a, b) => a.id - b.id);
          
          for (const cmd of newCommandes) {
            const existing = document.querySelector(`[data-commande-id="${cmd.id}"]`);
            if (!existing) {
              await addCommandeToList(cmd, 'en_attente', 'attente-list', 'badge-attente');
              
                            if (notificationSound) {
                try { notificationSound.play(); } catch (e) {}
              }
              
                            showOrderNotification(cmd);
              
                            if (cmd.id > lastCommandeId) lastCommandeId = cmd.id;
            }
          }
        }
      } catch (e) {
        console.error('❌ Polling error:', e);
      }
    }, 5000);   }

  function stopFallbackPolling() {
    if (fallbackPollingInterval) {
      clearInterval(fallbackPollingInterval);
      fallbackPollingInterval = null;
    }
  }

    function initNotificationSound() {
    try {
            notificationSound = {
        play: function() {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.15);
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.4);
        }
      };
    } catch (e) {
      console.warn('Failed to initialize notification sound:', e);
    }
  }

    function setupSSE() {
    if (eventSource) {
      try {
        eventSource.close();
      } catch (e) {}
    }

    try {
      eventSource = new EventSource('/api/admin/commandes/stream');

      eventSource.onopen = function() {
        sseReconnectAttempts = 0;         sseWorking = true;
        stopFallbackPolling();       };

      eventSource.onmessage = function(event) {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'connected') return;
          
          if (message.type === 'new_order') {
                        if (notificationSound) {
              try {
                notificationSound.play();
              } catch (e) {
                console.warn('Failed to play notification sound:', e);
              }
            }
            
                        showOrderNotification(message.data);
            
                        addCommandeToList(message.data, 'en_attente', 'attente-list', 'badge-attente')
              .catch(err => console.error('❌ Error adding order to list:', err));
          }
        } catch (e) {
          console.error('❌ Failed to parse SSE message:', e, 'Raw data:', event.data);
        }
      };

      eventSource.onerror = function(err) {
        console.error('❌ SSE error:', err);
        sseWorking = false;
        
        try {
          eventSource.close();
        } catch (e) {}
        
                if (sseReconnectAttempts < MAX_SSE_RECONNECT_ATTEMPTS) {
          sseReconnectAttempts++;
          const delay = Math.min(5000 * sseReconnectAttempts, 15000);           setTimeout(() => {
            setupSSE();
          }, delay);
        }
      };
    } catch (e) {
      console.error('Failed to setup SSE:', e);
    }
  }

    function showOrderNotification(commande) {
        const notification = document.createElement('div');
    notification.className = 'order-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.12));
      color: white;
      padding: 18px 24px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 6px 18px rgba(0,0,0,0.6);
      z-index: 10000;
      font-weight: 600;
      animation: slideInRight 0.3s ease-out;
      max-width: 400px;
      backdrop-filter: blur(10px);
      font-family: Inter, 'Segoe UI', Roboto, Arial, sans-serif;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 10px;
          background: linear-gradient(90deg, #c02929, #8f1212);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 4px 12px rgba(192, 41, 41, 0.4);
        ">🔔</div>
        <div style="flex: 1;">
          <div style="font-size: 15px; margin-bottom: 5px; color: #fff; font-weight: 700;">Nouvelle commande !</div>
          <div style="font-size: 13px; color: #bdbfc1; font-weight: 500;">
            <span style="color: #fff; font-weight: 600;">${commande.nom_complet}</span>
            ${commande.location ? ` • ${commande.location}` : ''}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
        const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
        setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

    initNotificationSound();
  
      startFallbackPolling();
  
    setupSSE();

    window.addEventListener('beforeunload', () => {
    if (eventSource) {
      eventSource.close();
    }
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
  });
  
    let autoRefreshInterval = null;
  let lastKnownOrderIds = new Set();

  function checkForNewOrdersSimple() {
    const attenteTab = document.getElementById('tab-attente');
    if (!attenteTab || !attenteTab.classList.contains('active')) return;
    
    fetch(apiBase + '/commandes?statut=en_attente', { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(async cmds => {
        const newOnes = cmds.filter(c => !lastKnownOrderIds.has(c.id));
        if (newOnes.length > 0) {
          newOnes.sort((a,b) => a.id - b.id);
          
          for (const cmd of newOnes) {
            lastKnownOrderIds.add(cmd.id);
            if (!document.querySelector(`[data-commande-id="${cmd.id}"]`)) {
              await addCommandeToList(cmd, 'en_attente', 'attente-list', 'badge-attente');
              if (notificationSound) try { notificationSound.play(); } catch(e) {}
              showOrderNotification(cmd);
            }
          }
        }
        cmds.forEach(c => lastKnownOrderIds.add(c.id));
      })
      .catch(e => console.error('❌ Auto-refresh error:', e));
  }

  function initAutoRefresh() {
    document.querySelectorAll('[data-commande-id]').forEach(card => {
      const id = parseInt(card.dataset.commandeId);
      if (id) lastKnownOrderIds.add(id);
    });
    checkForNewOrdersSimple();
    autoRefreshInterval = setInterval(checkForNewOrdersSimple, 3000);
  }

    initAutoRefresh();

    document.querySelectorAll('.tab-btn-vertical').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'attente') {
        setTimeout(() => {
          lastKnownOrderIds.clear();
          document.querySelectorAll('[data-commande-id]').forEach(card => {
            const id = parseInt(card.dataset.commandeId);
            if (id) lastKnownOrderIds.add(id);
          });
        }, 100);
      }
    });
  });
  
    window.addEventListener('resize', function () {
    adjustListMaxHeight('attente-list');
    adjustListMaxHeight('encours-list');
  });

        let _deviceResizeTimer = null;
  function detectDeviceAndApplyLayout() {
    try {
      const w = window.innerWidth || document.documentElement.clientWidth;
      const h = window.innerHeight || document.documentElement.clientHeight;
      let mode = 'desktop';
      let cardHeight = '420px'; 
                              if (w <= 520) {
        mode = 'mobile';
        cardHeight = '360px';
      } else if (w <= 1024) {
        mode = 'tablet';
                cardHeight = getComputedStyle(document.documentElement).getPropertyValue('--commande-card-height') || '260px';
                if (!cardHeight || cardHeight.trim() === '') cardHeight = '260px';
      } else {
        mode = 'desktop';
        cardHeight = '640px';
      }

  
            document.body.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
      document.body.classList.add('device-' + mode);

            adjustListMaxHeight('attente-list');
      adjustListMaxHeight('encours-list');
      animateCards('attente-list');
      animateCards('encours-list');
      adminDebug && typeof adminDebug === 'function' && adminDebug(`[device] mode=${mode} w=${w} h=${h} cardHeight=${cardHeight}`);
    } catch (e) {
      console.warn('Device detection failed', e);
    }
  }

    window.addEventListener('resize', function () {
    if (_deviceResizeTimer) clearTimeout(_deviceResizeTimer);
    _deviceResizeTimer = setTimeout(() => {
      detectDeviceAndApplyLayout();
    }, 150);
  });

    window.addEventListener('orientationchange', function () {
    setTimeout(detectDeviceAndApplyLayout, 200);
  });

    try { detectDeviceAndApplyLayout(); } catch (e) {}

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

    let countdownTimer = null;
  function scheduleUpdate() {
    if (countdownTimer) clearTimeout(countdownTimer);
    const count = updateCountdowns();
    let delay = 1000;
    if (count > 30) delay = 5000;
    else if (count > 10) delay = 2000;
        try { adminDebug(`[countdown] timers=${count} nextUpdate=${delay}ms`); } catch (e) {}
    countdownTimer = setTimeout(scheduleUpdate, delay);
  }
    scheduleUpdate();

    document.addEventListener('visibilitychange', () => {
    try {
      if (document.hidden) {
        if (countdownTimer) {
          clearTimeout(countdownTimer);
          countdownTimer = null;
        }
      } else {
                updateCountdowns();
        scheduleUpdate();
      }
    } catch (e) {  }
  });

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

function initEmailTemplatesTab() {
  let templates = [];
  let currentTemplate = null;
  
  const templatesList = document.getElementById('email-templates-list');
  const editorEmpty = document.getElementById('email-editor-empty');
  const editor = document.getElementById('email-editor');
  const editorTitle = document.getElementById('email-editor-title');
  const editorDescription = document.getElementById('email-editor-description');
  const variablesList = document.getElementById('email-variables-list');
  const htmlEditor = document.getElementById('email-html-editor');
  const visualEditor = document.getElementById('email-visual-editor');
  const previewFrame = document.getElementById('email-preview-frame');
  const saveBtn = document.getElementById('email-save-btn');
  const restoreBtn = document.getElementById('email-restore-btn');
  const statusDiv = document.getElementById('email-editor-status');
  
    const tabBtns = document.querySelectorAll('.email-tab-btn');
  const visualMode = document.getElementById('email-visual-mode');
  const previewMode = document.getElementById('email-preview-mode');
  const codeMode = document.getElementById('email-code-mode');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (mode === 'visual') {
                if (htmlEditor.value) {
          visualEditor.innerHTML = extractBodyContent(htmlEditor.value);
        }
        visualMode.classList.add('active');
        previewMode.classList.remove('active');
        codeMode.classList.remove('active');
      } else if (mode === 'preview') {
                syncVisualToHtml();
        visualMode.classList.remove('active');
        previewMode.classList.add('active');
        codeMode.classList.remove('active');
        updatePreview();
      } else if (mode === 'code') {
                syncVisualToHtml();
        visualMode.classList.remove('active');
        previewMode.classList.remove('active');
        codeMode.classList.add('active');
      }
    });
  });
  
    const toolbar = document.querySelector('.email-visual-toolbar');
  if (toolbar) {
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (!btn) return;
      
      e.preventDefault();
      const command = btn.dataset.command;
      
      if (command === 'createLink') {
        const url = prompt('URL du lien:');
        if (url) {
          document.execCommand('createLink', false, url);
        }
      } else if (command === 'insertVariable') {
        showVariableModal();
      } else {
        document.execCommand(command, false, null);
      }
      
      visualEditor.focus();
    });
    
        toolbar.addEventListener('change', (e) => {
      const select = e.target.closest('.toolbar-select');
      if (!select) return;
      
      const command = select.dataset.command;
      const value = select.value;
      
      if (value) {
        document.execCommand(command, false, value);
        select.value = '';
        visualEditor.focus();
      }
    });
  }
  
    function showVariableModal() {
    if (!currentTemplate || !currentTemplate.variables) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;';
    
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--card);padding:1.5rem;border-radius:8px;max-width:500px;width:90%;';
    
    const title = document.createElement('h3');
    title.textContent = 'Insérer une variable';
    title.style.marginTop = '0';
    
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;margin:1rem 0;';
    
    currentTemplate.variables.forEach(varName => {
      const btn = document.createElement('button');
      btn.textContent = `{{${varName}}}`;
      btn.className = 'btn';
      btn.style.cssText = 'text-align:left;font-family:monospace;';
      btn.onclick = () => {
        document.execCommand('insertHTML', false, `<span style="background:#fff3cd;padding:2px 4px;border-radius:3px;font-family:monospace;">{{${varName}}}</span>`);
        modal.remove();
        visualEditor.focus();
      };
      list.appendChild(btn);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuler';
    cancelBtn.className = 'btn ghost';
    cancelBtn.onclick = () => modal.remove();
    
    box.appendChild(title);
    box.appendChild(list);
    box.appendChild(cancelBtn);
    modal.appendChild(box);
    document.body.appendChild(modal);
    
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }
  
    function extractBodyContent(html) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1];
    }
    return html;
  }
  
    function syncVisualToHtml() {
    if (!currentTemplate) return;
    
    const bodyContent = visualEditor.innerHTML;
    const fullHtml = htmlEditor.value;
    
        const newHtml = fullHtml.replace(
      /(<body[^>]*>)([\s\S]*)(<\/body>)/i,
      `$1${bodyContent}$3`
    );
    
    htmlEditor.value = newHtml;
  }
  
    async function loadTemplates() {
    try {
      templatesList.innerHTML = '<div class="loader" style="margin:2rem auto;"></div>';
      const token = await getCsrfToken();
      const res = await fetch('/api/admin/email-templates', {
        credentials: 'include',
        headers: token ? { 'csrf-token': token } : {}
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to load templates:', res.status, errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      templates = data.templates || [];
      renderTemplatesList();
    } catch (err) {
      console.error('Error loading templates:', err);
      templatesList.innerHTML = `<p style="color:#ff6b6b; text-align:center; padding:1rem;">❌ Erreur: ${err.message}</p>`;
      showStatus('Erreur lors du chargement des templates: ' + err.message, 'error');
    }
  }
  
    function renderTemplatesList() {
    if (!templates.length) {
      templatesList.innerHTML = '<p style="color:var(--muted); text-align:center;">Aucun template trouvé</p>';
      return;
    }
    
    templatesList.innerHTML = templates.map(t => `
      <div class="email-template-item ${currentTemplate && currentTemplate.filename === t.filename ? 'active' : ''}" 
           data-filename="${t.filename}">
        <h4>${t.name || t.filename}</h4>
        <p>${t.description || ''}</p>
      </div>
    `).join('');
    
        templatesList.querySelectorAll('.email-template-item').forEach(item => {
      item.addEventListener('click', () => {
        const filename = item.dataset.filename;
        loadTemplate(filename);
      });
    });
  }
  
    async function loadTemplate(filename) {
    try {
      const token = await getCsrfToken();
      const res = await fetch(`/api/admin/email-templates/${filename}`, {
        credentials: 'include',
        headers: token ? { 'csrf-token': token } : {}
      });
      
      if (!res.ok) throw new Error('Failed to load template');
      
      currentTemplate = await res.json();
      renderEditor();
      renderTemplatesList();     } catch (err) {
      console.error('Error loading template:', err);
      showStatus('Erreur lors du chargement du template', 'error');
    }
  }
  
    function renderEditor() {
    if (!currentTemplate) {
      editorEmpty.style.display = 'flex';
      editor.style.display = 'none';
      return;
    }
    
    editorEmpty.style.display = 'none';
    editor.style.display = 'flex';
    
    editorTitle.textContent = currentTemplate.name || currentTemplate.filename;
    editorDescription.textContent = currentTemplate.description || '';
    htmlEditor.value = currentTemplate.content || '';
    
        visualEditor.innerHTML = extractBodyContent(currentTemplate.content || '');
    
        if (currentTemplate.variables && currentTemplate.variables.length) {
      variablesList.innerHTML = currentTemplate.variables.map(v => 
        `<code class="email-variable-tag">{{${v}}}</code>`
      ).join('');
    } else {
      variablesList.innerHTML = '<p style="color:var(--muted);">Aucune variable disponible</p>';
    }
    
        statusDiv.textContent = '';
    statusDiv.className = 'email-editor-status';
    
        tabBtns[0].click();
  }
  
    function updatePreview() {
    if (!currentTemplate) return;
    
    const html = htmlEditor.value;
    const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  }
  
    saveBtn.addEventListener('click', async () => {
    if (!currentTemplate) return;
    
        syncVisualToHtml();
    
    const content = htmlEditor.value;
    
    if (!content.trim()) {
      showStatus('Le contenu ne peut pas être vide', 'error');
      return;
    }
    
    try {
      saveBtn.disabled = true;
      showStatus('Enregistrement...', 'info');
      
      const token = await getCsrfToken();
      const res = await fetch(`/api/admin/email-templates/${currentTemplate.filename}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'csrf-token': token } : {})
        },
        body: JSON.stringify({ content })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      
      showStatus('✓ Template enregistré avec succès', 'success');
      
            setTimeout(() => loadTemplate(currentTemplate.filename), 1000);
    } catch (err) {
      console.error('Error saving template:', err);
      showStatus('Erreur lors de l\'enregistrement: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });
  
    restoreBtn.addEventListener('click', async () => {
    if (!currentTemplate) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir restaurer le template "${currentTemplate.name}" depuis la dernière sauvegarde ?`)) {
      return;
    }
    
    try {
      restoreBtn.disabled = true;
      showStatus('Restauration...', 'info');
      
      const token = await getCsrfToken();
      const res = await fetch(`/api/admin/email-templates/${currentTemplate.filename}/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { 'csrf-token': token } : {}
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to restore');
      
      showStatus('✓ Template restauré avec succès', 'success');
      
            setTimeout(() => loadTemplate(currentTemplate.filename), 1000);
    } catch (err) {
      console.error('Error restoring template:', err);
      showStatus('Erreur lors de la restauration: ' + err.message, 'error');
    } finally {
      restoreBtn.disabled = false;
    }
  });
  
    function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `email-editor-status ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'email-editor-status';
      }, 3000);
    }
  }
  
    loadTemplates();
}

