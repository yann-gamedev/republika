import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:1421',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    // GC paksa sebelum mengukur JS heap (final.spec) agar angka tidak ikut sampah.
    launchOptions: { args: ['--js-flags=--expose-gc'] },
  },
  webServer: {
    command: 'pnpm --filter @republika/desktop preview --host 127.0.0.1 --port 1421 --strictPort',
    url: 'http://127.0.0.1:1421',
    reuseExistingServer: false,
  },
});
