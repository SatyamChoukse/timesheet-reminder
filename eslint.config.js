const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'dist/', 'build/'] },
  js.configs.recommended,
  {
    files: ['main/**/*.js', 'scripts/**/*.js', 'tests/**/*.js', 'preload.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['renderer/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: { ...globals.browser, DogSounds: 'writable' },
    },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
