

(function() {
  'use strict';

    let toastContainer = null;

    const TOAST_TYPES = {
    success: {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    error: {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      color: '#ef4444',
      bgColor: '#fee2e2'
    },
    warning: {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    info: {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      color: '#3b82f6',
      bgColor: '#dbeafe'
    }
  };

  
  function initToastContainer() {
    if (toastContainer) return;
    
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('aria-atomic', 'true');
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
      max-width: 420px;
    `;
    
        const mediaQuery = window.matchMedia('(max-width: 640px)');
    if (mediaQuery.matches) {
      toastContainer.style.cssText += `
        top: auto;
        bottom: 20px;
        left: 20px;
        right: 20px;
        max-width: none;
      `;
    }
    
    document.body.appendChild(toastContainer);
  }

  
  function showToast(message, type = 'info', duration = 4000, options = {}) {
    initToastContainer();
    
    const config = TOAST_TYPES[type] || TOAST_TYPES.info;
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.setAttribute('role', 'alert');
    toast.style.cssText = `
      background: white;
      border-left: 4px solid ${config.color};
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      pointer-events: auto;
      cursor: ${options.actionUrl ? 'default' : 'pointer'};
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(400px);
      opacity: 0;
      min-width: 300px;
      max-width: 420px;
    `;
    
        const iconWrapper = document.createElement('div');
    iconWrapper.style.cssText = `
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${config.bgColor};
      color: ${config.color};
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    iconWrapper.innerHTML = config.icon;
    
        const contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      font-size: 0.95rem;
      line-height: 1.5;
      color: #1a1a1a;
      font-weight: 500;
    `;
    content.textContent = message;
    
    contentWrapper.appendChild(content);
    
    // Add action button if provided
    if (options.actionUrl && options.actionText) {
      const actionBtn = document.createElement('a');
      actionBtn.href = options.actionUrl;
      actionBtn.target = '_blank';
      actionBtn.rel = 'noopener noreferrer';
      actionBtn.textContent = options.actionText;
      actionBtn.style.cssText = `
        display: inline-block;
        padding: 8px 16px;
        background: ${config.color};
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.2s;
        align-self: flex-start;
      `;
      actionBtn.onmouseover = () => {
        actionBtn.style.opacity = '0.9';
        actionBtn.style.transform = 'translateY(-1px)';
      };
      actionBtn.onmouseout = () => {
        actionBtn.style.opacity = '1';
        actionBtn.style.transform = 'translateY(0)';
      };
      actionBtn.onclick = (e) => {
        e.stopPropagation();
      };
      contentWrapper.appendChild(actionBtn);
    }
    
        const closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Fermer la notification');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
      flex-shrink: 0;
      margin-top: 4px;
    `;
    closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.onmouseover = () => closeBtn.style.color = '#4b5563';
    closeBtn.onmouseout = () => closeBtn.style.color = '#9ca3af';
    
    toast.appendChild(iconWrapper);
    toast.appendChild(contentWrapper);
    toast.appendChild(closeBtn);
    
        function removeToast() {
      toast.style.transform = 'translateX(400px)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
    
    
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      removeToast();
    };
    
    // Only make the whole toast clickable if there's no action button
    if (!options.actionUrl) {
      toast.onclick = removeToast;
    }        let autoRemoveTimer;
    toast.onmouseenter = () => {
      if (autoRemoveTimer) clearTimeout(autoRemoveTimer);
      toast.style.transform = 'translateX(0) scale(1.02)';
    };
    
    toast.onmouseleave = () => {
      toast.style.transform = 'translateX(0) scale(1)';
      autoRemoveTimer = setTimeout(removeToast, 2000);
    };
    
        toastContainer.appendChild(toast);
    
        requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });
    
        if (duration > 0) {
      autoRemoveTimer = setTimeout(removeToast, duration);
    }
    
    return toast;
  }

  
  window.showToast = showToast;
  window.toast = {
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    warning: (msg, duration) => showToast(msg, 'warning', duration),
    info: (msg, duration) => showToast(msg, 'info', duration)
  };

})();
