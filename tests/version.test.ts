import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

it('versi aplikasi sama di semua sumber (jalankan pnpm version:set bila gagal)', () => {
  const version = (JSON.parse(read('package.json')) as { version: string }).version;
  expect((JSON.parse(read('apps/desktop/package.json')) as { version: string }).version).toBe(
    version,
  );
  expect(
    (JSON.parse(read('apps/desktop/src-tauri/tauri.conf.json')) as { version: string }).version,
  ).toBe(version);
  expect(read('apps/desktop/src-tauri/Cargo.toml')).toMatch(
    new RegExp(`^version = "${version}"`, 'mu'),
  );
  expect(read('apps/desktop/src-tauri/Cargo.lock')).toMatch(
    new RegExp(`name = "republika"\\r?\\nversion = "${version.replace(/\./gu, '\\.')}"`, 'u'),
  );
  expect(read('packages/shared/src/types/constants.ts')).toContain(
    `export const APP_VERSION = '${version}';`,
  );
});
