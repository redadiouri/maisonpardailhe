// Point d’entrée JavaScript pour Maison Pardailhe

/**
 * Initialise les interactions de la page une fois le DOM chargé.
 */
document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        initNavigation();
        initSmoothAnchors();
        // Fetch schedules from server so UI and API share the same rules.
        try {
            await fetchSchedules();
        } catch (e) {
            // ignore — fallback settings are already applied
            console.debug && console.debug('[MP] schedules fetch failed, using fallback', e);
        }
        // init selection panel first so it can set time min/max
        initSelectionPanel();
        initClickCollectForm();
    })();
});

// Helper: format Date to YYYY-MM-DD
function todayIso() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Helper: format time hh:mm from Date
function formatTimeHHMM(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

// Round date up to next slot (minutesStep)
function roundUpToSlot(date = new Date(), minutesStep = 15) {
    const ms = 1000 * 60;
    const minutes = date.getMinutes();
    const remainder = minutes % minutesStep;
    if (remainder === 0) return formatTimeHHMM(date);
    const add = minutesStep - remainder;
    const rounded = new Date(date.getTime() + add * ms);
    return formatTimeHHMM(rounded);
}

// Check hh:mm between min and max (inclusive)
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

// Convert hh:mm to minutes since midnight (shared helper)
function toMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = String(timeStr).split(':').map(Number);
    if (parts.length !== 2) return null;
    const [h, m] = parts;
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
}

// Location-specific schedules (per-weekday ranges).
// We fetch these from the server at runtime to keep front & back in sync.
// A small fallback is present for resiliency when the API is unavailable.
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

// Initialize with fallback immediately so UI can render before API responds
locationSettings = _fallbackLocationSettings;
try { window.__MP_LOCATION_SETTINGS__ = Object.fromEntries(Object.entries(locationSettings).map(([k,v])=>[k, { ranges: v.ranges } ])); } catch(e) {}

// Fetch schedules from server and apply them to the client runtime.
async function fetchSchedules() {
    try {
        const res = await fetch('/api/schedules', { credentials: 'include' });
        if (!res.ok) throw new Error('Network');
        const data = await res.json();
        if (data && typeof data === 'object') {
            // merge with existing (keep any missing keys from fallback)
            locationSettings = Object.assign({}, locationSettings, data);
            try { window.__MP_LOCATION_SETTINGS__ = Object.fromEntries(Object.entries(locationSettings).map(([k,v])=>[k, { ranges: v.ranges } ])); } catch(e) {}
            // If date/time UIs are already present, re-populate slots for current selection
            const dateEl = document.querySelector('#cc-date');
            const loc = document.querySelector('#cc-location')?.value || 'roquettes';
            if (dateEl) populateTimeOptions(loc, dateEl.value || todayIso());
            else populateTimeOptions(loc, todayIso());
        }
    } catch (e) {
        // keep fallback settings
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

// Helper to format minutes-since-midnight into HH:MM
const formatHM = (m) => {
    const hh = String(Math.floor(m/60)).padStart(2,'0');
    const mm = String(m%60).padStart(2,'0');
    return `${hh}:${mm}`;
};

// Generate 15-minute slots from ranges (shared so both selection panel and date form can use it)
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
        // Make the end time exclusive: last slot should be end - step (e.g. 09:00-13:00 => last 12:45)
        const last = end - step;
        for (let m = start; m <= last; m += step) {
            if (nowThreshold !== null && m < nowThreshold) continue;
            slots.push(formatHM(m));
        }
    }
    return slots;
};

// Populate the cc-time container (visual buttons) and hidden input with slots for the given location & dateIso
const populateTimeOptions = (location, dateIso) => {
    const container = document.getElementById('cc-time-container');
    const hiddenInput = document.getElementById('cc-time');
    if (!hiddenInput) return; // we need the hidden input to store the chosen slot
    if (container) container.innerHTML = '';
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

    // Build grouped buttons: Matin / Après-midi
    if (container) {
        // remove previous inline error message if any
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
            // collapse large groups by default
            if (items.length > 8) group.classList.add('collapsed');
            header.addEventListener('click', () => group.classList.toggle('collapsed'));
            header.addEventListener('keydown', (ev) => { if (ev.key==='Enter' || ev.key===' ') { ev.preventDefault(); group.classList.toggle('collapsed'); } });
            group.appendChild(header); group.appendChild(body); container.appendChild(group);
        };

        renderGroup('Matin', morning);
        renderGroup('Après‑midi', afternoon);

        // Show a small textual hint with the last offered slot (e.g. "Dernier créneau proposé : 12:45")
        const lastSlot = slots[slots.length - 1];
        const existingLast = container.querySelector('#cc-last-slot');
        if (existingLast) existingLast.remove();
        if (lastSlot) {
            const lastEl = document.createElement('div');
            lastEl.id = 'cc-last-slot';
            lastEl.className = 'cc-last-slot';
            // Accessibility: announce changes to assistive tech politely and atomically
            lastEl.setAttribute('role', 'status');
            lastEl.setAttribute('aria-live', 'polite');
            lastEl.setAttribute('aria-atomic', 'true');
            lastEl.textContent = `Dernier créneau proposé : ${lastSlot}`;
            // animation: add class to animate in, remove after animation so it can be re-used
            lastEl.classList.add('cc-fade-in');
            lastEl.addEventListener('animationend', () => {
                try { lastEl.classList.remove('cc-fade-in'); } catch(e){}
            }, { once: true });
            container.appendChild(lastEl);
        }

        // ensure hidden input cleared until user picks one
        hiddenInput.value = '';
        // clear error class when user selects
        hiddenInput.addEventListener('input', () => {
            container.classList.remove('error');
            const em = container.querySelector('.cc-time-error-msg'); if (em) em.remove();
        });
        return;
    }
    // Fallback: if no container present, set the hidden input to empty
    hiddenInput.value = '';
};

function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const links = navLinks ? navLinks.querySelectorAll('a') : [];

    if (!navToggle || !navLinks) {
    initSelectionPanel();
    }

    const closeMenu = () => {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    links.forEach((link) => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('is-open')) {
                closeMenu();
            }
        });
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
    // set default date and time constraints
    const dateEl = form.querySelector('#cc-date');
    const timeEl = form.querySelector('#cc-time');
    const locationSelect = form.querySelector('#cc-location');

    // helper to add days
    const addDays = (iso, days) => {
        const d = new Date(iso + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0,10);
    };

    // default date = today, restrict selectable range to 30 days
    if (dateEl) {
        // If flatpickr is available, initialize it to show French format (dd/mm/YYYY)
        // while keeping the input value in ISO (Y-m-d) for the API.
        if (window.flatpickr) {
            // ensure French locale is available
            const locale = (window.flatpickr && window.flatpickr.l10ns && window.flatpickr.l10ns.fr) ? window.flatpickr.l10ns.fr : 'default';
            const fp = window.flatpickr(dateEl, {
                dateFormat: 'Y-m-d', // value format (ISO)
                altInput: true,
                altFormat: 'd/m/Y', // visible format to users (fr)
                locale: locale,
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

    // Populate slots initially and re-populate when the date changes
    const initialLocation = locationSelect?.value || 'roquettes';
    if (dateEl) {
        populateTimeOptions(initialLocation, dateEl.value || todayIso());
        dateEl.addEventListener('input', () => {
            populateTimeOptions(locationSelect?.value || initialLocation, dateEl.value || todayIso());
        });
    } else {
        populateTimeOptions(initialLocation, todayIso());
    }

    // slot generation & population moved to module scope
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // defensive: check elements exist before reading values
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

        // build produit list from selection panel quantities (if any)
        const produitInputs = document.querySelectorAll('#cc-selection-panel .selection-item__controls input[type="number"]');
        const produits = [];
        produitInputs.forEach((inp) => {
            const qty = Math.max(0, Math.floor(Number(inp.value) || 0));
            if (qty > 0) {
                const container = inp.closest('.selection-item');
                const menuId = container?.dataset?.menuId ? Number(container.dataset.menuId) : null;
                const title = container?.querySelector('h4')?.textContent?.trim() || (inp.name || 'item');
                // push structured item (menu_id if available) so server can decrement stock
                produits.push({ menu_id: menuId, title, qty });
            }
        });
        const produit = produits.map(p => `${p.title}×${p.qty}`).join('; ');

        // Validation simple
        if (!nom_complet || !telephone || !date_retrait || !creneau || !location) {
            // If the missing field is the time slot, highlight the slot picker with an inline error
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

        // Date validations: not in the past and within 30 days
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

        // Time must respect min/max for selected location
        const timeInputEl = document.getElementById('cc-time');
        const selectedLocation = document.getElementById('cc-location')?.value;
        const minTime = timeInputEl?.min || '00:00';
        const maxTime = timeInputEl?.max || '23:59';
        // Validate against per-location per-weekday ranges when available
        const settings = locationSettings[selectedLocation] ?? locationSettings.roquettes;
        const day = (new Date(date_retrait + 'T00:00:00')).getDay();
        const rangesForDay = settings && settings.ranges ? (settings.ranges[day] || []) : [];
        const allowed = (rangesForDay.length > 0) ? isTimeAllowedForDay(creneau, rangesForDay) : isTimeInRange(creneau, minTime, maxTime);
        if (!allowed) {
            showCCMessage('Le créneau horaire sélectionné n\'est pas disponible pour le lieu choisi.', true);
            return;
        }

        // If date is today, ensure time is not in the past relative to now
        if (date_retrait === today) {
            const nowRounded = roundUpToSlot(new Date(), 15);
            if (!isTimeInRange(creneau, nowRounded, maxTime)) {
                showCCMessage('Le créneau horaire doit être ultérieur à l\'heure actuelle.', true);
                return;
            }
        }

        // Email validation (required)
        const emailRe = /^\S+@\S+\.\S+$/;
        if (!email || !emailRe.test(email)) {
            showCCMessage('Merci de saisir une adresse email valide.', true);
            return;
        }

        // Require at least one product selected
        if (produits.length === 0) {
            showCCMessage('Merci de sélectionner au moins un produit.', true);
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        // disable submit and show spinner
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
            // include structured items so server can atomically decrement stock
            if (produits.length > 0 && produits.every(p => p.menu_id)) {
                payload.items = produits.map(p => ({ menu_id: p.menu_id, qty: p.qty }));
            }
            // fetch CSRF token (session-based) and include it in the request
            let csrfToken = null;
            try {
                const tRes = await fetch('/api/csrf-token', { credentials: 'include' });
                if (tRes.ok) {
                    const td = await tRes.json();
                    csrfToken = td && td.csrfToken;
                }
            } catch (e) { /* ignore - we'll still attempt the request */ }

            const res = await fetch('/api/commandes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                form.reset();
                // show selection summary in the confirmation (use `title` set when building the list)
                const selectionSummary = produits.map(p => `${p.qty} × ${p.title}`).join(', ');
                showCCMessage(`Votre commande a bien été enregistrée : ${selectionSummary}. Nous vous confirmerons sous 2h ouvrées.`, false);
            } else {
                // try to extract error details
                let errMsg = 'Une erreur est survenue. Merci de réessayer ou de nous contacter.';
                try {
                    const data = await res.json();
                    if (data && data.error) errMsg = data.error;
                    else if (data && data.message) errMsg = data.message;
                } catch (parseErr) {
                    // ignore parse error
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

function showCCMessage(msg, isError) {
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

    // Attach handlers to quantity controls. We call this once and also when menus are loaded dynamically.
    let quantityButtons = [];
    let quantityInputs = [];
    const attachControls = () => {
        quantityButtons = Array.from(panel.querySelectorAll('.quantity-btn'));
        quantityInputs = Array.from(panel.querySelectorAll('.selection-item__controls input[type="number"]'));

        // remove previous listeners by replacing nodes (simple approach) is avoided; instead we attach handlers idempotently
        quantityButtons.forEach((button) => {
            // prevent duplicate handlers by checking a marker
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

        quantityInputs.forEach((input) => {
            const container = input.closest('.selection-item');
            const value = normaliseInputValue(input);

            if (container) {
                container.classList.toggle('selection-item--active', value > 0);
                const title = container.querySelector('h4')?.textContent?.trim() ?? '';

                if (value > 0) {
                    parts.push(`${title} × ${value}`);
                }
            }
        });

        if (summary) {
            summary.textContent = parts.length ? parts.join(', ') : 'Aucune sélection';
        }
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

    // Attach controls now (in case selection items already present) and whenever menus are loaded dynamically
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
        // dateIso may be undefined here (initSelectionPanel runs before datepicker is initialized)
        populateTimeOptions(location, dateIso || todayIso());
    };

    if (locationSelect) {
        // initial population using today; initClickCollectForm will re-populate when the date input exists
        applyLocationSettings(locationSelect.value);
        locationSelect.addEventListener('change', () => {
            applyLocationSettings(locationSelect.value);
        });
    }
}
