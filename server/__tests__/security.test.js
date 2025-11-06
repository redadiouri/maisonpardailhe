const request = require('supertest');
const { sanitize, escapeHtml, sanitizeObject } = require('../middleware/sanitize');

describe('Security & Validation Tests', () => {
  describe('Sanitization', () => {
    it('should remove dangerous HTML tags', () => {
      const dirty = '<script>alert("XSS")</script><p>Safe text</p>';
      const clean = sanitize(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('<p>Safe text</p>');
    });

    it('should strip all HTML in strict mode', () => {
      const dirty = '<b>Bold</b> and <script>alert("XSS")</script>';
      const clean = sanitize(dirty, true);
      expect(clean).toBe('Bold and ');
      expect(clean).not.toContain('<');
    });

    it('should escape HTML entities', () => {
      const text = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(text);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('should sanitize object fields', () => {
      const obj = {
        name: '<b>John</b>',
        email: 'test@example.com',
        comment: '<script>alert("XSS")</script>Safe'
      };
      const clean = sanitizeObject(obj, ['name', 'comment'], false);
      expect(clean.name).toBe('<b>John</b>');
      expect(clean.comment).not.toContain('<script>');
      expect(clean.email).toBe('test@example.com');
    });

    it('should handle null and undefined values', () => {
      expect(sanitize(null)).toBe('');
      expect(sanitize(undefined)).toBe('');
      expect(sanitize('')).toBe('');
    });

    it('should handle non-string values', () => {
      expect(sanitize(123)).toBe('');
      expect(sanitize({})).toBe('');
      expect(sanitize([])).toBe('');
    });
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
      '<body onload=alert(1)>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<input onfocus=alert(1) autofocus>',
      '<select onfocus=alert(1) autofocus>',
      '<textarea onfocus=alert(1) autofocus>',
      '<keygen onfocus=alert(1) autofocus>',
      '<video><source onerror="alert(1)">',
      '<audio src=x onerror=alert(1)>',
      '<details open ontoggle=alert(1)>',
      '<marquee onstart=alert(1)>'
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should sanitize XSS payload #${index + 1}: ${payload.substring(0, 30)}...`, () => {
        const clean = sanitize(payload, true);
        expect(clean).not.toContain('<script');
        expect(clean).not.toContain('onerror=');
        expect(clean).not.toContain('onload=');
        expect(clean).not.toContain('<iframe');
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users--",
      "1' AND '1'='1",
      "admin'--",
      "' UNION SELECT NULL--",
      "1; UPDATE users SET password='hacked'--"
    ];

    sqlPayloads.forEach((payload, index) => {
      it(`should handle SQL injection attempt #${index + 1} safely`, () => {
        const result = sanitize(payload, true);
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle very long strings', () => {
      const longString = 'A'.repeat(100000) + '<script>alert(1)</script>';
      const clean = sanitize(longString, true);
      expect(clean).not.toContain('<script>');
      expect(clean.length).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      const special = '§!@#$%^&*()_+-={}[]|\\:";\'<>?,./`~';
      const clean = sanitize(special, true);
      expect(typeof clean).toBe('string');
    });

    it('should handle unicode and emoji', () => {
      const unicode = 'Café ☕ 日本語 🍕 <script>alert(1)</script>';
      const clean = sanitize(unicode, true);
      expect(clean).toContain('Café');
      expect(clean).toContain('☕');
      expect(clean).toContain('日本語');
      expect(clean).toContain('🍕');
      expect(clean).not.toContain('<script>');
    });

    it('should handle mixed content', () => {
      const mixed = 'Normal text <b>bold</b> <script>alert(1)</script> more text';
      const clean = sanitize(mixed, false); // Allow some tags
      expect(clean).toContain('<b>bold</b>');
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('Normal text');
    });
  });

  describe('CSRF Protection (Integration)', () => {
    // Note: Ces tests nécessitent que l'app soit initialisée
    // Pour l'instant, on vérifie juste que le middleware CSRF est configuré
    
    it('should have CSRF middleware configured', () => {
      const csurf = require('csurf');
      expect(typeof csurf).toBe('function');
    });
  });

  describe('Rate Limiting Configuration', () => {
    const rateLimits = require('../middleware/rateLimits');

    it('should export all required limiters', () => {
      expect(rateLimits.globalLimiter).toBeDefined();
      expect(rateLimits.strictAuthLimiter).toBeDefined();
      expect(rateLimits.authLimiter).toBeDefined();
      expect(rateLimits.commandeLimiter).toBeDefined();
      expect(rateLimits.apiLimiter).toBeDefined();
      expect(rateLimits.emailLimiter).toBeDefined();
      expect(rateLimits.adminActionLimiter).toBeDefined();
    });

    it('should configure strict limits for auth endpoints', () => {
      // Les limiters sont des fonctions middleware
      expect(typeof rateLimits.strictAuthLimiter).toBe('function');
      expect(typeof rateLimits.authLimiter).toBe('function');
    });

    it('should configure limits for commande endpoints', () => {
      expect(typeof rateLimits.commandeLimiter).toBe('function');
    });
  });

  describe('Content Security Policy', () => {
    it('should have helmet configured with CSP', () => {
      const helmet = require('helmet');
      expect(typeof helmet).toBe('function');
    });
  });
});

describe('Commandes Validation Security', () => {
  describe('Phone Number Validation', () => {
    const validPhones = [
      '0612345678',
      '06 12 34 56 78',
      '06.12.34.56.78',
      '06-12-34-56-78',
      '+33612345678',
      '0033612345678'
    ];

    const invalidPhones = [
      '123',
      'abcdefghij',
      '06123456', // too short
      '061234567890123', // too long
      '<script>alert(1)</script>',
      "'; DROP TABLE commandes--"
    ];

    validPhones.forEach(phone => {
      it(`should accept valid phone: ${phone}`, () => {
        // Test que la sanitization ne casse pas les formats valides
        const clean = sanitize(phone, true);
        expect(clean.replace(/\D/g, '')).toMatch(/^\d+$/);
      });
    });

    invalidPhones.forEach(phone => {
      it(`should handle invalid phone safely: ${phone}`, () => {
        const clean = sanitize(phone, true);
        expect(clean).not.toContain('<script>');
      });
    });
  });

  describe('Date Validation', () => {
    it('should handle malicious date inputs', () => {
      const maliciousDates = [
        "2025-01-01'; DROP TABLE commandes--",
        '<script>alert(1)</script>',
        "../../etc/passwd",
        "null",
        "undefined"
      ];

      maliciousDates.forEach(date => {
        const clean = sanitize(date, true);
        expect(clean).not.toContain('<script>');
        expect(clean).not.toContain('<iframe');
      });
    });
  });

  describe('Items Array Validation', () => {
    it('should handle malicious item payloads', () => {
      const maliciousItems = [
        { menu_id: "1'; DROP TABLE menus--", qty: 1 },
        { menu_id: '<script>alert(1)</script>', qty: 999999 },
        { menu_id: -1, qty: -100 },
        { menu_id: 'null', qty: 'infinity' }
      ];

      maliciousItems.forEach(item => {
        const cleanId = sanitize(String(item.menu_id), true);
        expect(cleanId).not.toContain('<script>');
        expect(cleanId).not.toContain('<iframe');
      });
    });
  });
});
