

document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        initNavigation();
        initSmoothAnchors();
                try {
            await fetchSchedules();
        } catch (e) {
                        console.debug && console.debug('[MP] schedules fetch failed, using fallback', e);
        }
                initSelectionPanel();
        initClickCollectForm();
        initContactForm();
    })();
});

function todayIso() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatTimeHHMM(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function roundUpToSlot(date = new Date(), minutesStep = 15) {
    const ms = 1000 * 60;
    const minutes = date.getMinutes();
    const remainder = minutes % minutesStep;
    if (remainder === 0) return formatTimeHHMM(date);
    const add = minutesStep - remainder;
    const rounded = new Date(date.getTime() + add * ms);
    return formatTimeHHMM(rounded);
}

function isTimeInRange(time, min, max) {
    if (!time) return false;
    const toMinutes = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    const t = toMinutes(time);
    const a = toMinutes(min);
    const b = toMinutes(max);
    return t >= a && t <= b;
}

function toMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = String(timeStr).split(':').map(Number);
    if (parts.length !== 2) return null;
    const [h, m] = parts;
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
}

let locationSettings = {};
const _fallbackLocationSettings = {
    roquettes: {
        ranges: {
            0: [['08:30','13:00']],
            1: [],
            2: [['09:00','13:00'], ['16:00','19:30']],
            3: [['09:00','13:00'], ['16:00','19:30']],
            4: [['09:00','13:00'], ['16:00','19:30']],
            5: [['09:00','13:00'], ['16:00','19:30']],
            6: [['09:00','13:00'], ['16:00','19:30']],
        },
        hint: 'Roquettes : mardi–samedi 09h00–13h00 / 16h00–19h30 · dimanche 08h30–13h00 · lundi fermé.',
        label: '(Mardi – Samedi : 09h00–13h00 / 16h00–19h30 · Dimanche : 08h30–13h00)'
    },
    toulouse: {
        ranges: {
            0: [['07:00','13:30']],
            1: [],
            2: [['08:00','13:15'], ['16:00','19:30']],
            3: [['08:00','13:15'], ['16:00','19:30']],
            4: [['08:00','13:15'], ['16:00','19:30']],
            5: [['08:00','13:15'], ['16:00','19:30']],
            6: [['07:00','13:30']],
        },
        hint: 'Marché Victor Hugo : mardi–vendredi 08h00–13h15 / 16h00–19h30 · samedi–dimanche 07h00–13h30 · lundi fermé.',
        label: '(Marché Victor Hugo : horaires variables selon jour)'
    }
};

locationSettings = _fallbackLocationSettings;
try { window.__MP_LOCATION_SETTINGS__ = Object.fromEntries(Object.entries(locationSettings).map(([k,v])=>[k, { ranges: v.ranges } ])); } catch(e) {}

async function fetchSchedules() {
    try {
        const res = await fetch('/api/schedules', { credentials: 'include' });
        if (!res.ok) throw new Error('Network');
        const data = await res.json();
        if (data && typeof data === 'object') {
                        locationSettings = Object.assign({}, locationSettings, data);
            try { window.__MP_LOCATION_SETTINGS__ = Object.fromEntries(Object.entries(locationSettings).map(([k,v])=>[k, { ranges: v.ranges } ])); } catch(e) {}
                        const dateEl = document.querySelector('#cc-date');
            const loc = document.querySelector('#cc-location')?.value || 'roquettes';
            if (dateEl) populateTimeOptions(loc, dateEl.value || todayIso());
            else populateTimeOptions(loc, todayIso());
        }
    } catch (e) {
                console.debug && console.debug('[MP] fetchSchedules error', e && (e.message || e));
        throw e;
    }
}

const getEarliestLatest = (ranges) => {
    let earliest = null, latest = null;
    ranges.forEach(([s,e])=>{
        if (!earliest || s < earliest) earliest = s;
        if (!latest || e > latest) latest = e;
    });
    return [earliest, latest];
};

const isTimeAllowedForDay = (time, rangesForDay) => {
    if (!rangesForDay || rangesForDay.length === 0) return false;
    for (const [s,e] of rangesForDay) {
        if (isTimeInRange(time, s, e)) return true;
    }
    return false;
};

const formatHM = (m) => {
    const hh = String(Math.floor(m/60)).padStart(2,'0');
    const mm = String(m%60).padStart(2,'0');
    return `${hh}:${mm}`;
};

const generateSlotsFromRanges = (ranges, step = 15, dateIso = null) => {
    const slots = [];
    if (!Array.isArray(ranges) || ranges.length === 0) return slots;
    let nowThreshold = null;
    if (dateIso) {
        const today = new Date();
        const d = new Date(dateIso + 'T00:00:00');
        if (d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate()) {
            const r = roundUpToSlot(new Date(), step);
            nowThreshold = toMinutes(r);
        }
    }
    for (const [s,e] of ranges) {
        const start = toMinutes(s);
        const end = toMinutes(e);
        if (start === null || end === null) continue;
                const last = end - step;
        for (let m = start; m <= last; m += step) {
            if (nowThreshold !== null && m < nowThreshold) continue;
            slots.push(formatHM(m));
        }
    }
    return slots;
};

const populateTimeOptions = (location, dateIso) => {
    const container = document.getElementById('cc-time-container');
    const hiddenInput = document.getElementById('cc-time');
    if (!hiddenInput) return;     if (container) container.innerHTML = '';
    const settings = locationSettings[location] ?? locationSettings.roquettes;
    const wk = dateIso ? (new Date(dateIso + 'T00:00:00')).getDay() : (new Date()).getDay();
    const rangesForDay = (settings.ranges && Array.isArray(settings.ranges[wk])) ? settings.ranges[wk] : (settings.ranges ? (settings.ranges[wk] || []) : []);
    if (!rangesForDay || rangesForDay.length === 0) {
        console.debug && console.debug('[MP] populateTimeOptions: no slots', { location, dateIso, wk, rangesForDay });
        if (container) {
            const el = document.createElement('div'); el.className='cc-time-placeholder'; el.textContent='Aucun créneau disponible'; container.appendChild(el);
        }
        hiddenInput.value = '';
        return;
    }
    const slots = generateSlotsFromRanges(rangesForDay, 15, dateIso);
    if (!slots || slots.length === 0) {
        console.debug && console.debug('[MP] populateTimeOptions: no slots after generation', { location, dateIso, wk, rangesForDay, slots });
        if (container) {
            const el = document.createElement('div'); el.className='cc-time-placeholder'; el.textContent='Aucun créneau disponible'; container.appendChild(el);
        }
        hiddenInput.value = '';
        return;
    }

        if (container) {
                const prevErr = container.querySelector('.cc-time-error-msg'); if (prevErr) prevErr.remove();
        const ph = document.createElement('div'); ph.className='cc-time-placeholder'; ph.textContent='Choisir un créneau...'; container.appendChild(ph);
        const morning = slots.filter(s => Number(s.split(':')[0]) < 12);
        const afternoon = slots.filter(s => Number(s.split(':')[0]) >= 12);

        const renderGroup = (title, items) => {
            if (!items || items.length === 0) return;
            const group = document.createElement('div'); group.className = 'cc-slot-group cc-group';
            const header = document.createElement('div'); header.className = 'cc-group-header'; header.tabIndex = 0; header.setAttribute('role','button');
            header.textContent = `${title} (${items.length})`;
            const body = document.createElement('div'); body.className = 'cc-group-body';
            items.forEach((s) => {
                const btn = document.createElement('button'); btn.type='button'; btn.className='cc-slot-btn'; btn.textContent = s;
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.cc-slot-btn.active').forEach(b=>b.classList.remove('active'));
                    btn.classList.add('active'); hiddenInput.value = s; hiddenInput.dispatchEvent(new Event('input',{bubbles:true}));
                });
                btn.addEventListener('keydown', (ev) => { if (ev.key==='Enter' || ev.key===' ') { ev.preventDefault(); btn.click(); } });
            body.appendChild(btn);
            });
            header.addEventListener('click', () => group.classList.toggle('collapsed'));
            header.addEventListener('keydown', (ev) => { if (ev.key==='Enter' || ev.key===' ') { ev.preventDefault(); group.classList.toggle('collapsed'); } });
            group.appendChild(header); group.appendChild(body); container.appendChild(group);
        };

            renderGroup('Matin', morning);
        renderGroup('Après‑midi', afternoon);

                const lastSlot = slots[slots.length - 1];
        const existingLast = container.querySelector('#cc-last-slot');
        if (existingLast) existingLast.remove();
        if (lastSlot) {
            const lastEl = document.createElement('div');
            lastEl.id = 'cc-last-slot';
            lastEl.className = 'cc-last-slot';
                        lastEl.setAttribute('role', 'status');
            lastEl.setAttribute('aria-live', 'polite');
            lastEl.setAttribute('aria-atomic', 'true');
            lastEl.textContent = `Dernier créneau proposé : ${lastSlot}`;
                        lastEl.classList.add('cc-fade-in');
            lastEl.addEventListener('animationend', () => {
                try { lastEl.classList.remove('cc-fade-in'); } catch(e){}
            }, { once: true });
            container.appendChild(lastEl);
        }

                hiddenInput.value = '';
                hiddenInput.addEventListener('input', () => {
            container.classList.remove('error');
            const em = container.querySelector('.cc-time-error-msg'); if (em) em.remove();
        });
        return;
    }
        hiddenInput.value = '';
};

function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const links = navLinks ? navLinks.querySelectorAll('a') : [];

    if (!navToggle || !navLinks) {
        return;
    }

    const closeMenu = () => {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';     };

    const openMenu = () => {
        navLinks.classList.add('is-open');
        navToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';     };

    navToggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.contains('is-open');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

        links.forEach((link) => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('is-open')) {
                closeMenu();
            }
        });
    });

        document.addEventListener('click', (event) => {
        if (navLinks.classList.contains('is-open')) {
            const isClickInsideMenu = navLinks.contains(event.target);
            const isClickOnToggle = navToggle.contains(event.target);
            
            if (!isClickInsideMenu && !isClickOnToggle) {
                closeMenu();
            }
        }
    });

        document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && navLinks.classList.contains('is-open')) {
            closeMenu();
        }
    });
}

function initClickCollectForm() {
    const form = document.querySelector('#click-collect form');
    if (!form) return;
        const dateEl = form.querySelector('#cc-date');
    const timeEl = form.querySelector('#cc-time');
    const locationSelect = form.querySelector('#cc-location');

        const addDays = (iso, days) => {
        const d = new Date(iso + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0,10);
    };

        if (dateEl) {
                        if (window.flatpickr) {
                        const locale = (window.flatpickr && window.flatpickr.l10ns && window.flatpickr.l10ns.fr) ? window.flatpickr.l10ns.fr : 'default';
            const fp = window.flatpickr(dateEl, {
                dateFormat: 'Y-m-d',                 altInput: true,
                altFormat: 'd/m/Y',                 locale: locale,
                defaultDate: todayIso(),
                minDate: todayIso(),
                maxDate: addDays(todayIso(), 30),
            });
        } else {
            dateEl.min = todayIso();
            dateEl.max = addDays(todayIso(), 30);
            if (!dateEl.value) dateEl.value = todayIso();
        }
    }

        const initialLocation = locationSelect?.value || 'roquettes';
    if (dateEl) {
        populateTimeOptions(initialLocation, dateEl.value || todayIso());
        dateEl.addEventListener('input', () => {
            populateTimeOptions(locationSelect?.value || initialLocation, dateEl.value || todayIso());
        });
    } else {
        populateTimeOptions(initialLocation, todayIso());
    }

            if (locationSelect) {
        locationSelect.addEventListener('change', () => {
            const dateVal = (dateEl && dateEl.value) ? dateEl.value : todayIso();
            populateTimeOptions(locationSelect.value || initialLocation, dateVal);
                        const hiddenInput = document.getElementById('cc-time');
            if (hiddenInput) {
                hiddenInput.value = '';
                hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

        form.addEventListener('submit', async (e) => {
        e.preventDefault();
                const field = (name) => form.elements[name] || form.querySelector('#' + name) || null;
        const nomEl = field('cc-name');
        const phoneEl = field('cc-phone');
        const dateEl = field('cc-date');
        const emailEl = field('cc-email');
        const locationEl = field('cc-location');
        const timeEl = field('cc-time');
        const notesEl = field('cc-notes');

        const nom_complet = nomEl ? (nomEl.value || '').trim() : '';
        const telephone = phoneEl ? (phoneEl.value || '').trim() : '';
        const date_retrait = dateEl ? (dateEl.value || '') : '';
        const email = emailEl ? (emailEl.value || '').trim() : '';
        const location = locationEl ? (locationEl.value || '') : '';
        const creneau = timeEl ? (timeEl.value || '') : '';
        const precisions = notesEl ? (notesEl.value || '').trim() : '';

                const produitInputs = document.querySelectorAll('#cc-selection-panel .selection-item__controls input[type="number"]');
        const produits = [];
        produitInputs.forEach((inp) => {
            const qty = Math.max(0, Math.floor(Number(inp.value) || 0));
            if (qty > 0) {
                const container = inp.closest('.selection-item');
                const menuId = container?.dataset?.menuId ? Number(container.dataset.menuId) : null;
                const title = container?.querySelector('h4')?.textContent?.trim() || (inp.name || 'item');
                                produits.push({ menu_id: menuId, title, qty });
            }
        });
        const produit = produits.map(p => `${p.title}×${p.qty}`).join('; ');

                if (!nom_complet || !telephone || !date_retrait || !creneau || !location) {
                        if (!creneau) {
                const container = document.getElementById('cc-time-container');
                if (container) {
                    container.classList.add('error');
                    let em = container.querySelector('.cc-time-error-msg');
                    if (!em) {
                        em = document.createElement('div');
                        em.className = 'cc-time-error-msg';
                        em.textContent = 'Merci de choisir un créneau.';
                        container.appendChild(em);
                    }
                    try { container.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){}
                }
            }
            showCCMessage('Merci de remplir tous les champs obligatoires.', true);
            return;
        }

                const today = todayIso();
        const maxDate = (function(){ const d = new Date(); d.setDate(d.getDate()+30); return d.toISOString().slice(0,10); })();
        if (date_retrait < today) {
            showCCMessage('La date de retrait ne peut pas être antérieure à aujourd\'hui.', true);
            return;
        }
        if (date_retrait > maxDate) {
            showCCMessage('La date de retrait ne peut pas être au-delà de 30 jours.', true);
            return;
        }

                const timeInputEl = document.getElementById('cc-time');
        const selectedLocation = document.getElementById('cc-location')?.value;
        const minTime = timeInputEl?.min || '00:00';
        const maxTime = timeInputEl?.max || '23:59';
                const settings = locationSettings[selectedLocation] ?? locationSettings.roquettes;
        const day = (new Date(date_retrait + 'T00:00:00')).getDay();
        const rangesForDay = settings && settings.ranges ? (settings.ranges[day] || []) : [];
        const allowed = (rangesForDay.length > 0) ? isTimeAllowedForDay(creneau, rangesForDay) : isTimeInRange(creneau, minTime, maxTime);
        if (!allowed) {
            showCCMessage('Le créneau horaire sélectionné n\'est pas disponible pour le lieu choisi.', true);
            return;
        }

                if (date_retrait === today) {
            const nowRounded = roundUpToSlot(new Date(), 15);
            if (!isTimeInRange(creneau, nowRounded, maxTime)) {
                showCCMessage('Le créneau horaire doit être ultérieur à l\'heure actuelle.', true);
                return;
            }
        }

                const emailRe = /^\S+@\S+\.\S+$/;
        if (!email || !emailRe.test(email)) {
            showCCMessage('Merci de saisir une adresse email valide.', true);
            return;
        }

                if (produits.length === 0) {
            showCCMessage('Merci de sélectionner au moins un produit.', true);
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
            submitBtn.disabled = true;
            let spinner = submitBtn.querySelector('.btn-spinner');
            if (!spinner) {
                spinner = document.createElement('span');
                spinner.className = 'btn-spinner';
                spinner.setAttribute('aria-hidden', 'true');
                submitBtn.appendChild(spinner);
            }
        }

        try {
            const payload = { nom_complet, telephone, email, produit, date_retrait, creneau, precisions, location };
                        if (produits.length > 0 && produits.every(p => p.menu_id)) {
                payload.items = produits.map(p => ({ menu_id: p.menu_id, qty: p.qty }));
            }
                        let csrfToken = null;
            try {
                const tRes = await fetch('/api/csrf-token', { credentials: 'include' });
                if (tRes.ok) {
                    const td = await tRes.json();
                    csrfToken = td && td.csrfToken;
                }
            } catch (e) {  }

            const res = await fetch('/api/commandes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                                form.reset();
                                try {
                    const qtyInputs = document.querySelectorAll('#cc-selection-panel .selection-item__controls input[type="number"]');
                    qtyInputs.forEach((inp) => {
                        inp.value = '0';
                                                inp.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                                        document.querySelectorAll('#cc-selection-panel .selection-item.selection-item--active').forEach(el => el.classList.remove('selection-item--active'));
                                        const hiddenTime = document.getElementById('cc-time'); if (hiddenTime) { hiddenTime.value = ''; hiddenTime.dispatchEvent(new Event('input', { bubbles: true })); }
                                        if (typeof updateDisplay === 'function') updateDisplay();
                                        const panel = document.getElementById('cc-selection-panel'); if (panel && !panel.hidden) { panel.setAttribute('hidden', ''); panel.hidden = true; }
                } catch (e) {  }
                                let respJson = null;
                try { respJson = await res.json(); } catch (e) {  }
                const selectionSummary = produits.map(p => `${p.qty} × ${p.title}`).join(', ');
                showCCMessage(`Votre commande a bien été enregistrée : ${selectionSummary}. Nous vous confirmerons sous 2h ouvrées.`, false);
                                try {
                    const orderId = respJson && (respJson.id || respJson.insertId);
                    if (orderId) showMiniToast(orderId);
                } catch (e) {  }
            } else {
                                let errMsg = 'Une erreur est survenue. Merci de réessayer ou de nous contacter.';
                try {
                    const data = await res.json();
                    if (data && data.error) errMsg = data.error;
                    else if (data && data.message) errMsg = data.message;
                } catch (parseErr) {
                                    }
                showCCMessage(errMsg, true);
            }
        } catch (err) {
            showCCMessage("Impossible d'enregistrer la commande. Merci de réessayer plus tard.", true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                const spinner = submitBtn.querySelector('.btn-spinner');
                if (spinner) spinner.remove();
            }
        }
    });
}

function initContactForm() {
    const form = document.querySelector('form#contactForm') || document.querySelector('main form');
    if (!form) return;
        const fullname = form.querySelector('#fullname');
    const email = form.querySelector('#email');
    const subject = form.querySelector('#subject');
    const message = form.querySelector('#message');
    if (!fullname || !email || !message) return;

    const infoId = 'contact-info-msg';
    function showContactMessage(msg, isError) {
                if (typeof showToast === 'function') {
            showToast(msg, isError ? 'error' : 'success', 4000);
            return;
        }
        
                let el = document.getElementById(infoId);
        if (!el) {
            el = document.createElement('div'); el.id = infoId; el.style.marginTop = '0.75rem';
            form.appendChild(el);
        }
        el.textContent = msg;
        el.style.color = isError ? '#c00' : '#080';
    }

    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = (fullname.value || '').trim();
        const e = (email.value || '').trim();
        const s = (subject.value || '').trim();
        const m = (message.value || '').trim();
        if (!f || !e || !m) { showContactMessage('Merci de remplir tous les champs requis.', true); return; }

        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        try {
                        let csrf = null;
            try {
                const t = await fetch('/api/csrf-token', { credentials: 'include' }); if (t.ok) { const td = await t.json(); csrf = td && td.csrfToken; }
            } catch (e) {}

            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf || '' },
                credentials: 'include',
                body: JSON.stringify({ fullname: f, email: e, subject: s, message: m })
            });
            if (res.ok) {
                form.reset();
                showContactMessage('Merci, votre message a bien été envoyé. Nous vous répondrons sous 24h.', false);
            } else {
                let msg = 'Erreur lors de l\'envoi. Merci de réessayer.';
                try { const d = await res.json(); if (d && d.message) msg = d.message; } catch (e) {}
                showContactMessage(msg, true);
            }
        } catch (err) {
            showContactMessage('Impossible d\'envoyer le message. Merci de réessayer plus tard.', true);
        } finally { if (btn) btn.disabled = false; }
    });
}

function showCCMessage(msg, isError) {
        if (typeof showToast === 'function') {
        showToast(msg, isError ? 'error' : 'success', 4000);
        return;
    }
    
        let info = document.getElementById('cc-info-msg');
    if (!info) {
        info = document.createElement('div');
        info.id = 'cc-info-msg';
        info.style.textAlign = 'center';
        info.style.marginTop = '1rem';
    const container = document.querySelector('#click-collect .contact-card') || document.body;
    container.appendChild(info);
        info.setAttribute('role', 'status');
        info.setAttribute('aria-live', 'polite');
    }
    info.textContent = msg;
    info.style.color = isError ? '#f33' : '#090';
}

function showMiniToast(orderId) {
    if (!orderId) return;
        const EXIST = document.getElementById('mp-mini-toast');
    if (EXIST) {
        try { EXIST.remove(); } catch (e) {}
    }
    const toast = document.createElement('div');
    toast.id = 'mp-mini-toast';
    toast.className = 'mp-toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');

    const text = document.createElement('div');
    text.className = 'mp-toast-text';
    text.textContent = 'Commande enregistrée.';

    const link = document.createElement('a');
    link.className = 'mp-toast-link';
            link.href = `/commande?id=${orderId}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Voir la commande';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mp-toast-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label','Fermer la notification');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => {
        try { toast.remove(); } catch (e) {}
    });

    toast.appendChild(text);
    toast.appendChild(link);
    toast.appendChild(closeBtn);
    document.body.appendChild(toast);

        setTimeout(() => {
        try { toast.remove(); } catch (e) {}
    }, 8000);
}

function initSmoothAnchors() {
    const internalLinks = document.querySelectorAll('a[href^="#"]');

    internalLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('href');

            if (!targetId || targetId === '#') {
                return;
            }

            const target = document.querySelector(targetId);

            if (target) {
                event.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function initSelectionPanel() {
    const toggle = document.getElementById('cc-selection-toggle');
    const panel = document.getElementById('cc-selection-panel');
    const locationSelect = document.getElementById('cc-location');
    const timeInput = document.getElementById('cc-time');
    const timeHint = document.getElementById('cc-time-note');

    if (!toggle || !panel) {
        return;
    }

    const selectionGroup = toggle.closest('.selection-group');
    const summary = toggle.querySelector('.selection-display__summary');
    const closeButton = panel.querySelector('.selection-panel__close');

        let quantityButtons = [];
    let quantityInputs = [];
    let lastTotalCents = null;
    const attachControls = () => {
        quantityButtons = Array.from(panel.querySelectorAll('.quantity-btn'));
        quantityInputs = Array.from(panel.querySelectorAll('.selection-item__controls input[type="number"]'));

                quantityButtons.forEach((button) => {
                        if (button._menuBound) return;
            button._menuBound = true;
            button.addEventListener('click', () => {
                const controls = button.closest('.selection-item__controls');
                const input = controls?.querySelector('input[type="number"]');
                if (!input) {
                    return;
                }

                const current = normaliseInputValue(input);
                const action = button.dataset.action;

                if (action === 'increment') {
                    input.value = String(current + 1);
                }

                if (action === 'decrement') {
                    input.value = String(Math.max(current - 1, 0));
                }

                input.dispatchEvent(new Event('input', { bubbles: true }));
                updateDisplay();
            });
        });

        quantityInputs.forEach((input) => {
            if (input._menuBound) return;
            input._menuBound = true;
            input.addEventListener('input', updateDisplay);
            input.addEventListener('blur', updateDisplay);
        });
    };

    const normaliseInputValue = (input) => {
        const value = Math.max(Number(input.value) || 0, 0);
        input.value = String(value);
        return value;
    };

    const updateDisplay = () => {
        const parts = [];
        let totalCents = 0;
        let hasZeroPriceSelected = false;

        quantityInputs.forEach((input) => {
            const container = input.closest('.selection-item');
            const value = normaliseInputValue(input);

            if (container) {
                container.classList.toggle('selection-item--active', value > 0);
                const title = container.querySelector('h4')?.textContent?.trim() ?? '';

                if (value > 0) {
                    parts.push(`${title} × ${value}`);
                                        const priceCents = Number(container.dataset.priceCents || 0);
                    if (Number.isFinite(priceCents) && priceCents > 0) {
                        totalCents += priceCents * Number(value || 0);
                    } else if (priceCents === 0) {
                                                hasZeroPriceSelected = true;
                    }
                }
            }
        });

        if (summary) {
                        const summaryText = parts.length ? parts.join(', ') : 'Aucune sélection';
            const fmt = (cents) => (Number(cents)/100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
            if (parts.length && totalCents > 0) {
                summary.textContent = `${summaryText} — Total: ${fmt(totalCents)}`;
            } else if (parts.length && hasZeroPriceSelected) {
                                summary.textContent = `${summaryText} — Total: Sur devis`;
            } else {
                summary.textContent = summaryText;
            }

                        try {
                const summaryEl = summary;
                if (summaryEl) {
                                        if (lastTotalCents === null || lastTotalCents !== totalCents) {
                        summaryEl.classList.remove('total-updated');
                                                void summaryEl.offsetWidth;
                        summaryEl.classList.add('total-updated');
                                                setTimeout(() => { try { summaryEl.classList.remove('total-updated'); } catch(e){} }, 480);
                    }
                    lastTotalCents = totalCents;
                }
            } catch (e) {}
        }
                try {
            const formSubmit = document.querySelector('#click-collect form button[type="submit"]');
            if (formSubmit) {
                const disable = (parts.length === 0) || (totalCents === 0 && !hasZeroPriceSelected) || hasZeroPriceSelected;
                formSubmit.disabled = !!disable;
                if (disable) {
                    formSubmit.setAttribute('title', hasZeroPriceSelected ? 'Un ou plusieurs articles nécessitent un devis — contactez-nous' : 'Sélectionnez au moins un produit avec prix');
                } else {
                    formSubmit.removeAttribute('title');
                }
            }
        } catch (e) {}
    };

    const focusPanel = () => {
        try {
            panel.focus({ preventScroll: true });
        } catch (error) {
            panel.focus();
        }
    };

    const openPanel = () => {
        panel.hidden = false;
        panel.removeAttribute('hidden');
        panel.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
        selectionGroup?.classList.add('is-open');
        focusPanel();
    };

    const closePanel = () => {
        panel.hidden = true;
        panel.setAttribute('hidden', '');
        panel.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        selectionGroup?.classList.remove('is-open');
    };

    toggle.addEventListener('click', (event) => {
        event.preventDefault();
        if (panel.hidden) {
            openPanel();
        } else {
            closePanel();
        }
    });

    toggle.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (panel.hidden) {
                openPanel();
            } else {
                closePanel();
            }
        }
    });

    document.addEventListener('click', (event) => {
        if (panel.hidden) {
            return;
        }

        const target = event.target;

        if (target instanceof Node && !toggle.contains(target) && !panel.contains(target)) {
            closePanel();
        }
    });

    panel.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closePanel();
            toggle.focus();
        }
    });

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            closePanel();
            toggle.focus();
        });
    }

        attachControls();
    document.addEventListener('menus:loaded', () => {
        attachControls();
        updateDisplay();
    });

    updateDisplay();

    

    const applyLocationSettings = (location, dateIso) => {
        if (!timeInput || !timeHint) return;
        const settings = locationSettings[location] ?? locationSettings.roquettes;
        timeHint.textContent = settings.hint;
                populateTimeOptions(location, dateIso || todayIso());
    };

    if (locationSelect) {
                applyLocationSettings(locationSelect.value);
        locationSelect.addEventListener('change', () => {
            applyLocationSettings(locationSelect.value);
        });
    }
}
