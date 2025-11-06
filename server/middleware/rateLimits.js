const rateLimit = require('express-rate-limit');
const logger = require('../logger');

const isProd = process.env.NODE_ENV === 'production';

const createLimiter = (options) => {
  const defaults = {
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded');
      res.status(429).json({
        error: 'Trop de requêtes. Veuillez réessayer plus tard.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  };
  return rateLimit({ ...defaults, ...options });
};

const globalLimiter = createLimiter({
  windowMs: 1 * 60 * 1000,
  max: isProd ? 100 : 200,
  message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer dans une minute.',
  skip: (req) => {
    const path = req.path;
    return path.match(/\.(css|js|jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i);
  }
});

const strictAuthLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 10,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 20,
  message: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.'
});

const commandeLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 10 : 50,
  message: 'Trop de commandes en une heure. Veuillez réessayer plus tard.',
  skipSuccessfulRequests: false
});

const apiLimiter = createLimiter({
  windowMs: 1 * 60 * 1000,
  max: isProd ? 30 : 100,
  message: 'Trop de requêtes API. Veuillez réessayer dans une minute.'
});

const emailLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 3 : 10,
  message: 'Trop d\'envois d\'emails. Veuillez réessayer dans une heure.'
});

const adminActionLimiter = createLimiter({
  windowMs: 1 * 60 * 1000,
  max: isProd ? 50 : 100,
  message: 'Trop d\'actions administratives. Veuillez ralentir.'
});

module.exports = {
  globalLimiter,
  strictAuthLimiter,
  authLimiter,
  commandeLimiter,
  apiLimiter,
  emailLimiter,
  adminActionLimiter
};
