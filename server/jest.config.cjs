module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.js'],
  // globalTeardown ensures we close DB and session pools created by server
  globalTeardown: './jest.teardown.js'
  ,
  // forceExit is a last-resort to ensure test runner exits; used here because
  // some third-party libraries create background handles we don't control in tests.
  forceExit: true
};
