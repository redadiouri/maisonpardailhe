module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 2021
  },
  rules: {
    // project-specific rules can be added here
    "no-console": "off"
  }
};
