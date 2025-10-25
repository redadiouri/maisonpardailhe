// Point d’entrée JavaScript pour Maison Pardailhe

/**
 * Initialise les interactions de la page une fois le DOM chargé.
 */
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSmoothAnchors();
    initClickCollectForm();
    initSelectionPanel();
});

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
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // defensive: check elements exist before reading values
        const field = (name) => form.elements[name] || form.querySelector('#' + name) || null;
        const nomEl = field('cc-name');
        const phoneEl = field('cc-phone');
        const dateEl = field('cc-date');
        const timeEl = field('cc-time');
        const notesEl = field('cc-notes');

        const nom_complet = nomEl ? (nomEl.value || '').trim() : '';
        const telephone = phoneEl ? (phoneEl.value || '').trim() : '';
        const date_retrait = dateEl ? (dateEl.value || '') : '';
        const creneau = timeEl ? (timeEl.value || '') : '';
        const precisions = notesEl ? (notesEl.value || '').trim() : '';

        // build produit list from selection panel quantities (if any)
        const produitInputs = document.querySelectorAll('#cc-selection-panel .selection-item__controls input[type="number"]');
        const produits = [];
        produitInputs.forEach((inp) => {
            const qty = Number(inp.value) || 0;
            if (qty > 0) {
                const item = inp.closest('.selection-item')?.dataset.item || (inp.name || 'item');
                produits.push({ item, qty });
            }
        });
        const produit = produits.map(p => `${p.item}×${p.qty}`).join('; ');

        // Validation simple
        if (!nom_complet || !telephone || !date_retrait || !creneau) {
            showCCMessage('Merci de remplir tous les champs obligatoires.', true);
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
            const res = await fetch('/api/commandes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom_complet, telephone, produit, date_retrait, creneau, precisions })
            });
            if (res.ok) {
                form.reset();
                // show selection summary in the confirmation
                const selectionSummary = produits.map(p => `${p.qty} × ${p.item}`).join(', ');
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
    const quantityButtons = panel.querySelectorAll('.quantity-btn');
    const quantityInputs = panel.querySelectorAll('.selection-item__controls input[type="number"]');

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

    quantityButtons.forEach((button) => {
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
        input.addEventListener('input', updateDisplay);
        input.addEventListener('blur', updateDisplay);
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
        timeInput.value = '';
        timeHint.textContent = settings.hint;
    };

    if (locationSelect) {
        applyLocationSettings(locationSelect.value);
        locationSelect.addEventListener('change', () => {
            applyLocationSettings(locationSelect.value);
        });
    }
}
