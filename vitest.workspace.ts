import { fileURLToPath } from 'node:url';

import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'root',
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      testTimeout: 30_000,
    },
  },
  {
    test: {
      name: 'shared',
      environment: 'node',
      include: ['packages/shared/test/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'game-data',
      environment: 'node',
      include: ['packages/game-data/test/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'simulation',
      environment: 'node',
      include: ['packages/simulation/test/**/*.test.ts'],
      passWithNoTests: true,
    },
  },
  {
    test: {
      name: 'desktop',
      environment: 'node',
      include: ['apps/desktop/test/**/*.test.ts'],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./apps/desktop/src', import.meta.url)),
      },
    },
  },
]);
