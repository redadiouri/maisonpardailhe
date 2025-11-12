/**
 * Système de pagination réutilisable pour Maison Pardailhé
 * Peut être utilisé pour les listes de commandes, menus, etc.
 */

class Pagination {
  constructor(options = {}) {
    this.currentPage = options.currentPage || 1;
    this.itemsPerPage = options.itemsPerPage || 10;
    this.totalItems = options.totalItems || 0;
    this.maxButtons = options.maxButtons || 5; // Nombre max de boutons de page affichés
    this.onPageChange = options.onPageChange || (() => {});
    this.containerSelector = options.containerSelector || null;
  }

  /**
   * Calcule le nombre total de pages
   */
  getTotalPages() {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  /**
   * Retourne les items pour la page courante
   */
  getPaginatedItems(items) {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return items.slice(startIndex, endIndex);
  }

  /**
   * Change la page courante
   */
  goToPage(pageNumber) {
    const totalPages = this.getTotalPages();
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    this.currentPage = pageNumber;
    this.onPageChange(pageNumber);
    this.render();
  }

  /**
   * Page précédente
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * Page suivante
   */
  nextPage() {
    const totalPages = this.getTotalPages();
    if (this.currentPage < totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Met à jour le nombre total d'items
   */
  updateTotalItems(total) {
    this.totalItems = total;
    // Si la page courante est maintenant invalide, retourner à la page 1
    if (this.currentPage > this.getTotalPages()) {
      this.currentPage = 1;
    }
    this.render();
  }

  /**
   * Génère les numéros de pages à afficher
   */
  getPageNumbers() {
    const totalPages = this.getTotalPages();
    const current = this.currentPage;
    const maxButtons = this.maxButtons;
    
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfButtons = Math.floor(maxButtons / 2);
    let startPage = Math.max(1, current - halfButtons);
    let endPage = Math.min(totalPages, current + halfButtons);

    // Ajuster si on est au début ou à la fin
    if (current <= halfButtons) {
      endPage = maxButtons;
    } else if (current >= totalPages - halfButtons) {
      startPage = totalPages - maxButtons + 1;
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Rend l'interface de pagination
   */
  render() {
    if (!this.containerSelector) return;

    const container = document.querySelector(this.containerSelector);
    if (!container) return;

    const totalPages = this.getTotalPages();
    if (totalPages <= 1) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';

    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);

    const html = `
      <div class="pagination">
        <div class="pagination-info">
          ${startItem} à ${endItem} sur ${this.totalItems}
        </div>
        
        <div class="pagination-controls">
          <button 
            class="pagination-btn pagination-prev" 
            ${this.currentPage === 1 ? 'disabled' : ''}
            aria-label="Page précédente"
          >
            ‹
          </button>
          
          ${this.getPageNumbers().map(page => `
            <button 
              class="pagination-btn ${page === this.currentPage ? 'active' : ''}" 
              data-page="${page}"
            >
              ${page}
            </button>
          `).join('')}
          
          <button 
            class="pagination-btn pagination-next" 
            ${this.currentPage === totalPages ? 'disabled' : ''}
            aria-label="Page suivante"
          >
            ›
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attacher les événements
    const prevBtn = container.querySelector('.pagination-prev');
    const nextBtn = container.querySelector('.pagination-next');
    const pageButtons = container.querySelectorAll('.pagination-btn[data-page]');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.previousPage());
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextPage());
    }

    pageButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        this.goToPage(page);
      });
    });
  }

  /**
   * Réinitialise la pagination
   */
  reset() {
    this.currentPage = 1;
    this.render();
  }
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Pagination;
}
