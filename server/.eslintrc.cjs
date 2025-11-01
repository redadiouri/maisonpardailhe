module.exports = {
  env: {
    node: true,
    jest: true,
    es2021: true
  },
  extends: ['eslint:recommended', 'plugin:jest/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'no-console': 'off',
    // Relax some rules for the legacy codebase so CI lint step is not blocking.
    'no-inner-declarations': 'off',
    'no-constant-condition': 'off',
    'no-redeclare': 'off',
    'no-unused-vars': ['warn', { 'args': 'none', 'varsIgnorePattern': '^_' }],
    'no-empty': 'warn'
  }
};
