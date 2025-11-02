module.exports = async () => {
  try {
    const app = require('./server');
    if (app && typeof app.shutdown === 'function') {
      await app.shutdown();
    }
  } catch (e) {
    // ignore during teardown
  }
};