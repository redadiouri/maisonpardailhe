module.exports = {
  testEnvironment: 'node',
  testTimeout: 10000,
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.js'],
  globalTeardown: './jest.teardown.js',
  forceExit: true
};
