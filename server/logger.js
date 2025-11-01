// Improved logger configuration using pino
// - environment-aware log levels
// - optional file transport (via LOG_FILE)
// - pretty console output in development
// - redact common secrets to avoid accidental exposure
try {
  const pino = require('pino');

  // Map environment to sensible default log levels
  const env = process.env.NODE_ENV || 'development';
  const defaultLevel = process.env.LOG_LEVEL || (env === 'production' ? 'info' : (env === 'test' ? 'warn' : 'debug'));

  // Redact common sensitive fields when objects are logged
  const redact = {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers.set-cookie',
      'password',
      'pass',
      'token',
      'secret',
      'apiKey',
      'apikey',
      'smtp.*',
      'DB_PASSWORD',
      'SESSION_SECRET'
    ],
    censor: '[REDACTED]'
  };

  // Standard serializers for req/res/err
  const stdSerializers = pino.stdSerializers || require('pino-std-serializers');

  let logger;

  // If a log file path is configured, write structured logs to that file.
  // Note: rotation is recommended to be handled by an external tool (logrotate)
  // or a hosted log pipeline. Setting LOG_FILE enables file output.
  if (process.env.LOG_FILE) {
    const dest = pino.destination({ dest: process.env.LOG_FILE, sync: false });
    logger = pino({ level: defaultLevel, redact, serializers: stdSerializers }, dest);
  } else if (env !== 'production') {
    // Development: pretty print to console when possible
    try {
      const transport = pino.transport ? pino.transport({ target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }) : null;
      logger = transport ? pino({ level: defaultLevel, redact, serializers: stdSerializers }, transport) : pino({ level: defaultLevel, redact, serializers: stdSerializers });
    } catch (e) {
      // Fallback to plain pino
      logger = pino({ level: defaultLevel, redact, serializers: stdSerializers });
    }
  } else {
    // Production: structured JSON to stdout (or container logs)
    logger = pino({ level: defaultLevel, redact, serializers: stdSerializers });
  }

  module.exports = logger;
} catch (e) {
  // If pino is not available, fallback to a minimal console wrapper with level filtering
  const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
  const configured = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  const minLevel = LEVELS[configured] ?? 2;

  function shouldLog(level) {
    return LEVELS[level] <= minLevel;
  }

  module.exports = {
    info: (...args) => { if (shouldLog('info')) console.log('[INFO]', ...args); },
    warn: (...args) => { if (shouldLog('warn')) console.warn('[WARN]', ...args); },
    error: (...args) => { if (shouldLog('error')) console.error('[ERROR]', ...args); },
    debug: (...args) => { if (shouldLog('debug')) (console.debug ? console.debug(...args) : console.log('[DEBUG]', ...args)); }
  };
}
