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
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
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
      if (res.ok) {
        const commandes = await res.json();
        if (badge) badge.textContent = commandes.length;
        if (commandes.length === 0) {
          list.innerHTML = '<div style="color:#aaa; text-align:center; margin:30px 0;">Aucune commande.</div>';
          return;
        }
        commandes.forEach(cmd => {
          const card = document.createElement('div');
          card.className = 'commande-card';
          card.innerHTML = `<b>${cmd.nom_complet}</b> (${cmd.telephone})<br>
            Produit: ${cmd.produit}<br>
            Date: ${cmd.date_retrait} | Créneau: ${cmd.creneau}<br>
            Précisions: ${cmd.precisions || '-'}<br>
            <div class="commande-actions"></div>`;
          const actions = card.querySelector('.commande-actions');
          if (statut === 'en_attente') {
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'Accepter';
            acceptBtn.className = 'accept';
            acceptBtn.onclick = async () => {
              card.style.opacity = '0.5';
              await fetch(apiBase + `/commandes/${cmd.id}/accepter`, { method: 'POST', credentials: 'include' });
              loadCommandes('en_attente', 'attente-list', 'badge-attente', 'attente-loader');
              loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');
            };
            const refuseBtn = document.createElement('button');
            refuseBtn.textContent = 'Refuser';
            refuseBtn.className = 'refuse';
            refuseBtn.onclick = () => {
              const raison = prompt('Raison du refus ?');
              if (raison) {
                card.style.opacity = '0.5';
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
            finishBtn.className = 'finish';
            finishBtn.onclick = async () => {
              card.style.opacity = '0.5';
              await fetch(apiBase + `/commandes/${cmd.id}/terminer`, { method: 'POST', credentials: 'include' });
              loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');
            };
            actions.appendChild(finishBtn);
          }
          list.appendChild(card);
        });
      } else {
        list.innerHTML = '<div style="color:#f33; text-align:center; margin:30px 0;">Erreur de chargement des commandes.</div>';
      }
    } catch (err) {
      loader.style.display = 'none';
      list.innerHTML = '<div style="color:#f33; text-align:center; margin:30px 0;">Erreur serveur.</div>';
    }
  }
  loadCommandes('en_attente', 'attente-list', 'badge-attente', 'attente-loader');
  loadCommandes('en_cours', 'encours-list', 'badge-encours', 'encours-loader');
}
