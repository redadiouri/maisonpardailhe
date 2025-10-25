// Point d’entrée JavaScript pour Maison Pardailhe

/**
 * Initialise les interactions de la page une fois le DOM chargé.
 */
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSmoothAnchors();
    initClickCollectForm();
});

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
        const nom_complet = form['cc-name'].value.trim();
        const telephone = form['cc-phone'].value.trim();
        const produit = form['cc-selection'].value;
        const date_retrait = form['cc-date'].value;
        const creneau = form['cc-time'].value;
        const precisions = form['cc-notes'].value.trim();

        // Validation simple
        if (!nom_complet || !telephone || !produit || !date_retrait || !creneau) {
            showCCMessage('Merci de remplir tous les champs obligatoires.', true);
            return;
        }

        try {
            const res = await fetch('/api/commandes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom_complet, telephone, produit, date_retrait, creneau, precisions })
            });
            if (res.ok) {
                form.reset();
                showCCMessage('Votre commande a bien été enregistrée ! Nous vous confirmerons sous 2h ouvrées.', false);
            } else {
                showCCMessage("Une erreur est survenue. Merci de réessayer ou de nous contacter.", true);
            }
        } catch (err) {
            showCCMessage("Impossible d'enregistrer la commande. Merci de réessayer plus tard.", true);
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
        document.querySelector('#click-collect .contact-card').appendChild(info);
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
