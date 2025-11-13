module.exports = {
  env: {
    node: true,
    jest: true,
    es2021: true
  },
  extends: ['eslint:recommended', 'prettier', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'no-console': 'off',
    'no-inner-declarations': 'off',
    'no-constant-condition': 'off',
    'no-redeclare': 'off',
    'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
    'no-empty': 'warn'
  }
};
