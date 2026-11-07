import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.tools/**',
      '.gradle-home/**',
      '.android-home/**',
      '.artifacts/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'android/**',
      'ios/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
