import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import json from '@eslint/json'
import eslintNextPlugin from '@next/eslint-plugin-next'

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**']
  },
  ...tseslint.configs.recommended,
  // Web
  {
    files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      '@next/next': eslintNextPlugin,
      react: pluginReact
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    },
    settings: {
      react: { version: 'detect' }
    }
  },
  // API
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node }
  },
  // JSON
  {
    files: ['**/*.json'],
    ignores: ['**/package-lock.json'],
    language: 'json/json',
    ...json.configs.recommended
  }
]
