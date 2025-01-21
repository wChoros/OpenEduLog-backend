module.exports = [
  {
    ignores: ['node_modules', 'dist'],
  },
  {
    files: ['src/**/*.{ts,tsx}'], // Specify the extensions here
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {
      ...require('@typescript-eslint/eslint-plugin').configs.recommended.rules,
    },
  },
];
