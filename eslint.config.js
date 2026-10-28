import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'storage/**', 'server/storage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['server/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['*.js', '*.config.ts', 'client/*.config.ts', 'server/*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
