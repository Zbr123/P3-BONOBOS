/**
 * ESLint config — CommonJS, Node 18+, Prettier-friendly.
 */

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
    'consistent-return': 'warn',
    eqeqeq: ['error', 'smart'],
    'prefer-const': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'reports/',
    'allure-report/',
    'allure-results/',
    'screenshots/',
    'videos/',
    'traces/',
    'logs/',
  ],
};
