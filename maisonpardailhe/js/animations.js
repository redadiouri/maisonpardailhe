/**
 * Script d'animation au scroll pour Maison Pardailhé
 * Gère l'apparition progressive des éléments lors du défilement
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        threshold: 0.15, // Pourcentage de visibilité avant déclenchement
        rootMargin: '0px 0px -50px 0px', // Marge pour déclencher l'animation
        animationClass: 'animated'
    };

    // Observer pour détecter les éléments visibles
    let observer;

    /**
     * Initialise l'Intersection Observer
     */
    function initObserver() {
        const options = {
            threshold: CONFIG.threshold,
            rootMargin: CONFIG.rootMargin
        };

        observer = new IntersectionObserver(handleIntersection, options);
    }

    /**
     * Gère l'intersection des éléments observés
     */
    function handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add(CONFIG.animationClass);
                // Optionnel : arrêter d'observer après animation
                observer.unobserve(entry.target);
            }
        });
    }

    /**
     * Ajoute les classes d'animation aux éléments
     */
    function setupAnimations() {
        // Titres de section
        const sectionTitles = document.querySelectorAll('.section-title');
        sectionTitles.forEach((title, index) => {
            title.classList.add('animate-on-scroll', 'animate-fade-up');
            observer.observe(title);
        });

        // Sous-titres de section
        const sectionSubtitles = document.querySelectorAll('.section-subtitle');
        sectionSubtitles.forEach(subtitle => {
            subtitle.classList.add('animate-on-scroll', 'animate-fade-up', 'animate-delay-1');
            observer.observe(subtitle);
        });

        // Cartes (alternance gauche/droite pour effet dynamique)
        const cards = document.querySelectorAll('.card, .media-card');
        cards.forEach((card, index) => {
            const animationType = index % 2 === 0 ? 'animate-fade-left' : 'animate-fade-right';
            const delay = `animate-delay-${Math.min(index % 4 + 1, 6)}`;
            
            card.classList.add('animate-on-scroll', animationType, delay);
            observer.observe(card);
        });

        // Info cards
        const infoCards = document.querySelectorAll('.info-card');
        infoCards.forEach((card, index) => {
            const delay = `animate-delay-${index + 1}`;
            card.classList.add('animate-on-scroll', 'animate-scale', delay);
            observer.observe(card);
        });

        // Contact card / Click & Collect
        const contactCard = document.querySelector('.contact-card');
        if (contactCard) {
            contactCard.classList.add('animate-on-scroll', 'animate-fade-up');
            observer.observe(contactCard);
        }

        // Grilles
        const grids = document.querySelectorAll('.grid');
        grids.forEach(grid => {
            grid.classList.add('animate-on-scroll', 'animate-fade-up', 'animate-delay-2');
            observer.observe(grid);
        });

        // Elements du footer
        const footerSections = document.querySelectorAll('.footer-section');
        footerSections.forEach((section, index) => {
            const delay = `animate-delay-${index + 1}`;
            section.classList.add('animate-on-scroll', 'animate-fade-up', delay);
            observer.observe(section);
        });
    }

    /**
     * Ajoute un effet parallaxe subtil au hero
     */
    function initParallax() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.pageYOffset;
                    const parallaxSpeed = 0.5;
                    
                    if (scrolled < window.innerHeight) {
                        hero.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
                        hero.style.opacity = 1 - (scrolled / 600);
                    }
                    
                    ticking = false;
                });

                ticking = true;
            }
        });
    }

    /**
     * Ajoute un effet de brillance au logo au scroll
     */
    function initLogoScrollEffect() {
        const brand = document.querySelector('.brand');
        if (!brand) return;

        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.pageYOffset;
                    
                    // Réduit légèrement le logo en scrollant
                    if (scrolled > 50) {
                        brand.style.transform = 'scale(0.9)';
                    } else {
                        brand.style.transform = 'scale(1)';
                    }
                    
                    ticking = false;
                });

                ticking = true;
            }
        });
    }

    /**
     * Effet de révélation progressive pour les images
     */
    function initImageReveal() {
        const images = document.querySelectorAll('.card img, .media-card img');
        
        images.forEach(img => {
            img.style.opacity = '0';
            img.style.transform = 'scale(0.95)';
            
            // Observer pour l'image
            const imgObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'scale(1)';
                        }, 200);
                        imgObserver.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1
            });

            imgObserver.observe(img);
        });
    }

    /**
     * Ajoute un compteur animé pour les chiffres (si présents)
     */
    function initCounterAnimation() {
        const counters = document.querySelectorAll('[data-count]');
        
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-count'));
            const duration = 2000; // 2 secondes
            const increment = target / (duration / 16); // 60fps
            let current = 0;

            const counterObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const updateCounter = () => {
                            current += increment;
                            if (current < target) {
                                counter.textContent = Math.floor(current);
                                requestAnimationFrame(updateCounter);
                            } else {
                                counter.textContent = target;
                            }
                        };
                        updateCounter();
                        counterObserver.unobserve(entry.target);
                    }
                });
            });

            counterObserver.observe(counter);
        });
    }

    /**
     * Initialisation au chargement du DOM
     */
    function init() {
        // Vérifier le support de IntersectionObserver
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver non supporté, animations désactivées');
            // Afficher tous les éléments sans animation
            document.querySelectorAll('.animate-on-scroll').forEach(el => {
                el.style.opacity = '1';
            });
            return;
        }

        initObserver();
        setupAnimations();
        initParallax();
        initLogoScrollEffect();
        initImageReveal();
        initCounterAnimation();

        console.log('✨ Animations initialisées pour Maison Pardailhé');
    }

    // Lancer l'initialisation
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Réinitialiser les animations au redimensionnement (debounced)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Optionnel : réajuster les animations si nécessaire
        }, 250);
    });

})();
