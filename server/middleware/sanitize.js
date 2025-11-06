const sanitizeHtml = require('sanitize-html');

const defaultOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard'
};

const strictOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard'
};

function sanitize(dirty, strict = false) {
  if (!dirty) return '';
  if (typeof dirty !== 'string') return '';
  
  const options = strict ? strictOptions : defaultOptions;
  return sanitizeHtml(dirty, options);
}

function sanitizeObject(obj, fields = [], strict = false) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  for (const field of fields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitize(sanitized[field], strict);
    }
  }
  
  return sanitized;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeMiddleware(fields = [], strict = false) {
  return (req, res, next) => {
    if (req.body) {
      req.body = sanitizeObject(req.body, fields, strict);
    }
    
    if (req.query) {
      const queryFields = Object.keys(req.query);
      req.query = sanitizeObject(req.query, queryFields, true);
    }
    
    next();
  };
}

module.exports = {
  sanitize,
  sanitizeHtml: sanitize,
  sanitizeObject,
  escapeHtml,
  sanitizeMiddleware
};
