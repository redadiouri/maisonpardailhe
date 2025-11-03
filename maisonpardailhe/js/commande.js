// small util to read query params
function qp(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function escapeHtml(s){ if (s===undefined||s===null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// Render products as a small table with icons
function renderProducts(produit){
  // produit may be JSON array or legacy string
  try {
    const arr = JSON.parse(produit);
    if (Array.isArray(arr)){
      const rows = arr.map(it=>{
        const name = escapeHtml(it.title || it.name || (`Article #${it.menu_id||''}`));
        const qty = escapeHtml(String(it.qty || it.quantity || '1'));
        return `<tr><td style="padding:6px 10px;">🍽️ ${name}</td><td style="padding:6px 10px;text-align:right;">${qty}</td></tr>`;
      }).join('');
      return `<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden"><tbody>${rows}</tbody></table>`;
    }
  } catch (e){ /* not JSON */ }
  // fallback: plain preformatted or semi-parsed string
  return `<div style="white-space:pre-wrap;">${escapeHtml(String(produit||''))}</div>`;
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

    // build markup
    const meta = [];
    if (cmd.nom_complet) meta.push(`<div><b>Nom:</b> ${escapeHtml(cmd.nom_complet)}</div>`);
    if (cmd.telephone) meta.push(`<div><b>Téléphone:</b> ${escapeHtml(cmd.telephone)}</div>`);
    if (cmd.email) meta.push(`<div><b>Email:</b> <a href="mailto:${escapeHtml(cmd.email)}">${escapeHtml(cmd.email)}</a></div>`);
    if (cmd.location || cmd.date_retrait || cmd.creneau) {
      const parts = [];
      if (cmd.location) parts.push(escapeHtml(cmd.location));
      if (cmd.date_retrait || cmd.creneau) {
        let datetimePart = '';
        if (cmd.date_retrait && cmd.creneau) {
          datetimePart = `${formatDateForDisplay(cmd.date_retrait)} à ${escapeHtml(cmd.creneau)}`;
        } else if (cmd.date_retrait) {
          datetimePart = formatDateForDisplay(cmd.date_retrait);
        } else {
          datetimePart = escapeHtml(cmd.creneau);
        }
        parts.push(datetimePart);
      }
      meta.push(`<div><b>Lieu / créneau:</b> ${parts.join(' — ')}</div>`);
    }
    if (cmd.precisions) meta.push(`<div><b>Précisions:</b> ${escapeHtml(cmd.precisions)}</div>`);
    const produk = renderProducts(cmd.produit);
    const statut = `<div style="margin-top:12px;color:var(--muted)"><small>Statut: ${escapeHtml(cmd.statut||'')}</small></div>`;
    recap.innerHTML = `<div style="display:grid;grid-template-columns:1fr 320px;gap:18px;align-items:start"><div>${meta.join('')}</div><div><h3 style="margin-top:0">Produits</h3>${produk}${statut}</div></div>`;
  }catch(err){ console.error(err); if (spinner) spinner.style.display = 'none'; sub.textContent='Impossible de charger la commande. Vérifiez votre connexion ou réessayez.'; }
})();
