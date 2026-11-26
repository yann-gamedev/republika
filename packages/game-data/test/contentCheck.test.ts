import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { placeholderPaths } from '../src/cli/placeholderPaths.js';

const root = resolve(import.meta.dirname, '../../..');
const content = resolve(import.meta.dirname, '../content');
const cli = resolve(import.meta.dirname, '../src/cli/contentCheck.ts');

function check(...args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

describe('content:check --strict', () => {
  it('mendeteksi ID, teks, reasonCode, key dan kapitalisasi dalam seluruh koleksi', () => {
    expect(
      placeholderPaths({
        backgrounds: [{ name: '(Placeholder)' }],
        candidates: [{ bio: 'biografi placeholder' }],
        effect: { reasonCode: 'PLACEHOLDER_AID' },
        'PLACEHOLDER-KEY': null,
        valid: [42, false, null, 'final'],
      }),
    ).toEqual([
      '$.backgrounds[0].name',
      '$.candidates[0].bio',
      '$.effect.reasonCode',
      '$.PLACEHOLDER-KEY',
    ]);
  });

  it('strict lulus tanpa placeholder; teks kandidat diblokir hanya pada strict; opsi salah ditolak', () => {
    const directory = mkdtempSync(join(tmpdir(), 'republika-content-check-'));
    try {
      cpSync(content, directory, { recursive: true });
      for (const name of readdirSync(directory, { recursive: true, encoding: 'utf8' })) {
        if (!name.endsWith('.json')) continue;
        const path = join(directory, name);
        writeFileSync(path, readFileSync(path, 'utf8').replace(/placeholder/giu, 'FINAL'));
      }
      const result = check(directory, '--strict');
      expect(result.status, result.stderr).toBe(0);
      const candidatesPath = join(directory, 'cabinet-candidates.json');
      const candidates = JSON.parse(readFileSync(candidatesPath, 'utf8')) as Array<{ bio: string }>;
      candidates[0]!.bio = 'Biografi placeholder';
      writeFileSync(candidatesPath, JSON.stringify(candidates));
      const normal = check(directory);
      expect(normal.error).toBeUndefined();
      expect(normal.status, normal.stderr).toBe(0);
      for (const args of [
        [directory, '--strict'],
        ['--strict', directory],
      ]) {
        const strict = check(...args);
        expect(strict.status, strict.stderr).toBe(1);
        expect(strict.stderr).toContain('Pemeriksaan ketat gagal');
        expect(strict.stderr).toContain('$.candidates[0].bio');
      }
      expect(check('--strcit').status).not.toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 30_000);
});
