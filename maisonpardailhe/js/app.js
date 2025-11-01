// Point d’entrée JavaScript pour Maison Pardailhe

/**
 * Initialise les interactions de la page une fois le DOM chargé.
 */
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSmoothAnchors();
    // init selection panel first so it can set time min/max
    initSelectionPanel();
    initClickCollectForm();
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

    // default time: round up to next slot and clamp to min/max (if defined)
    if (timeEl) {
        const candidate = roundUpToSlot(new Date(), 15);
        const min = timeEl.min || '08:30';
        const max = timeEl.max || '19:30';
        timeEl.value = isTimeInRange(candidate, min, max) ? candidate : min;
    }
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
        if (!isTimeInRange(creneau, minTime, maxTime)) {
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

    const locationSettings = {
        roquettes: {
            min: '08:30',
            max: '19:30',
            hint: 'Roquettes : mardi à samedi 09h00-13h00 / 16h00-19h30 · dimanche 08h30-13h00 · fermé lundi.',
            label: '(Mardi – Samedi : 09h00-13h00 / 16h00-19h30 · Dimanche : 08h30-13h00)',
        },
        toulouse: {
            min: '07:00',
            max: '13:30',
            hint: 'Marché Victor Hugo : mardi-vendredi 08h00-13h15 · samedi-dimanche 07h00-13h30 · fermé lundi.',
            label: '(Marché Victor Hugo : 07h00-13h30 · Fermé lundi)',
        },
    };

    const applyLocationSettings = (location) => {
        if (!timeInput || !timeHint) {
            return;
        }

        const settings = locationSettings[location] ?? locationSettings.roquettes;

    timeInput.min = settings.min;
    timeInput.max = settings.max;
    // set a sensible default time: round up to next slot and clamp to min/max
    const candidate = roundUpToSlot(new Date(), 15);
    timeInput.value = isTimeInRange(candidate, settings.min, settings.max) ? candidate : settings.min;
    timeHint.textContent = settings.hint;
    };

    if (locationSelect) {
        applyLocationSettings(locationSelect.value);
        locationSelect.addEventListener('change', () => {
            applyLocationSettings(locationSelect.value);
        });
    }
}
