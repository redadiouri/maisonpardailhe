// Lightweight logger wrapper: prefer pino if installed, otherwise fallback to console
try {
  // Try to load pino; if pino-pretty is available and not in production, enable pretty printing
  const pino = require('pino');
  let logger;
  if (process.env.NODE_ENV !== 'production') {
    try {
      // pino >=7 supports transport; try to use pino-pretty if installed
      const transport = require('pino').transport ? require('pino').transport({ target: 'pino-pretty', options: { colorize: true } }) : null;
      logger = transport ? pino( { level: process.env.LOG_LEVEL || 'info' }, transport ) : pino({ level: process.env.LOG_LEVEL || 'info' });
    } catch (e) {
      // pino-pretty not available — use plain pino
      logger = pino({ level: process.env.LOG_LEVEL || 'info' });
    }
  } else {
    logger = pino({ level: process.env.LOG_LEVEL || 'info' });
  }
  module.exports = logger;
} catch (e) {
  // Fallback: simple console wrapper
  module.exports = {
    info: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    debug: (...args) => (console.debug ? console.debug(...args) : console.log(...args)),
  };
}
