// Point d’entrée JavaScript pour Maison Pardailhe

/**
 * Initialise les interactions de la page une fois le DOM chargé.
 */
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSmoothAnchors();
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
