import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tauriImportRule = [
  'error',
  {
    patterns: [
      {
        group: ['@tauri-apps/*', '@tauri-apps/api'],
        message: 'Akses Tauri hanya boleh lewat apps/desktop/src/platform/ (AGENT.md §4.4).',
      },
    ],
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-stats/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'apps/desktop/src-tauri/target/**',
      'apps/desktop/src-tauri/gen/**',
      '.agents/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-restricted-imports': tauriImportRule,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['packages/simulation/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message:
            'Engine memakai import statis agar batas dependency dapat diperiksa (AGENT.md §4.1).',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'Engine simulasi harus murni tanpa React (AGENT.md §4.1).',
            },
            {
              group: ['@tauri-apps/*', '@tauri-apps/api'],
              message: 'Engine simulasi tidak boleh menyentuh Tauri (AGENT.md §4.1).',
            },
            {
              group: ['node:*', 'fs', 'path', 'os', 'crypto', 'child_process'],
              message: 'Engine simulasi tidak boleh melakukan I/O (AGENT.md §4.1).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: 'Waktu harus menjadi argumen eksplisit (AGENT.md §4.2).',
        },
        {
          name: 'crypto',
          message: 'RNG harus menjadi argumen eksplisit (AGENT.md §4.2).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Gunakan PRNG ber-seed dari argumen (AGENT.md §4.2).',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Waktu harus menjadi argumen eksplisit (AGENT.md §4.2).',
        },
        {
          object: 'globalThis',
          property: 'crypto',
          message: 'RNG harus menjadi argumen eksplisit (AGENT.md §4.2).',
        },
      ],
    },
  },
  {
    files: ['apps/desktop/src/**/*.{ts,tsx}'],
    ignores: ['apps/desktop/src/platform/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression[source.value=/^@tauri-apps/]',
          message: 'Akses Tauri hanya boleh lewat apps/desktop/src/platform/ (AGENT.md §4.4).',
        },
        {
          selector: 'ImportExpression[source.type!="Literal"]',
          message: 'Gunakan path import literal agar batas platform dapat diperiksa.',
        },
      ],
      'no-restricted-imports': tauriImportRule,
    },
  },
  {
    files: ['apps/desktop/src/platform/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  prettier,
);
