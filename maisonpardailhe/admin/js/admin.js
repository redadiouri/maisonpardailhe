// Simple JS pour login et dashboard admin
const apiBase = 'http://localhost:3001/api/admin';

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

// Dashboard
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').onclick = async () => {
  await fetch(apiBase + '/logout', { method: 'POST', credentials: 'include' });
    window.location.href = 'login.html';
  };

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      const target = document.getElementById('tab-' + btn.dataset.tab);
      if (target) {
        target.classList.add('active');
        // adjust list height then animate cards inside this tab
        const listId = (btn.dataset.tab === 'attente') ? 'attente-list' : 'encours-list';
        // small timeout to allow CSS transitions start
        setTimeout(() => {
          adjustListMaxHeight(listId);
          animateCards(listId);
        }, 80);
      }
    };
  });

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
        // small helper to format ISO date strings to dd/mm/yyyy
        function formatDateISO(d) {
          if (!d) return '-';
          try {
            const dt = new Date(d + 'T00:00:00');
            return dt.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
          } catch (e) { return d; }
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
                </div>
                <div class="status" style="font-size:0.9rem;color:var(--muted);text-transform:capitalize">${cmd.statut.replace('_',' ')}</div>
              </div>
              <div class="product">${cmd.produit}</div>
              <div class="meta">
                <div><b>Date retrait:</b> ${dateRetrait} &nbsp;|&nbsp; <b>Créneau:</b> ${cmd.creneau}</div>
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
