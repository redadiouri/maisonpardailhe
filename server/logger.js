try {
  const pino = require('pino');

  const env = process.env.NODE_ENV || 'development';
  const defaultLevel =
    process.env.LOG_LEVEL || (env === 'production' ? 'info' : env === 'test' ? 'warn' : 'debug');

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

  const stdSerializers = pino.stdSerializers || require('pino-std-serializers');

  let logger;

  if (process.env.LOG_FILE) {
    const dest = pino.destination({ dest: process.env.LOG_FILE, sync: false });
    logger = pino({ level: defaultLevel, redact, serializers: stdSerializers }, dest);
  } else if (env !== 'production') {
    try {
      const transport = pino.transport
        ? pino.transport({
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' }
          })
        : null;
      logger = transport
        ? pino({ level: defaultLevel, redact, serializers: stdSerializers }, transport)
        : pino({ level: defaultLevel, redact, serializers: stdSerializers });
    } catch (e) {
      logger = pino({ level: defaultLevel, redact, serializers: stdSerializers });
    }
  } else {
    logger = pino({ level: defaultLevel, redact, serializers: stdSerializers });
  }

  module.exports = logger;
} catch (e) {
  const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
  const configured =
    process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  const minLevel = LEVELS[configured] ?? 2;

  function shouldLog(level) {
    return LEVELS[level] <= minLevel;
  }

  module.exports = {
    info: (...args) => {
      if (shouldLog('info')) console.log('[INFO]', ...args);
    },
    warn: (...args) => {
      if (shouldLog('warn')) console.warn('[WARN]', ...args);
    },
    error: (...args) => {
      if (shouldLog('error')) console.error('[ERROR]', ...args);
    },
    debug: (...args) => {
      if (shouldLog('debug'))
        console.debug ? console.debug(...args) : console.log('[DEBUG]', ...args);
    }
  };
}
