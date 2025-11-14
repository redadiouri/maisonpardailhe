// Animation au scroll pour les cartes de service
(function() {
  function initScrollAnimations() {
    const serviceCards = document.querySelectorAll('.service-card');
    const awardsCards = document.querySelectorAll('.award-card');
    const showcaseCards = document.querySelectorAll('.showcase-card');
    
    const allCards = [...serviceCards, ...awardsCards, ...showcaseCards];
    
    allCards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }, 0);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    allCards.forEach(card => observer.observe(card));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations);
  } else {
    initScrollAnimations();
  }
})();
