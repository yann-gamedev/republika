import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { expect, it } from 'vitest';

it('CLI menolak indikator placeholder dua desimal tanpa mengubah konten sumber', () => {
  const directory = mkdtempSync(join(tmpdir(), 'republika-content-'));
  const cli = resolve('packages/game-data/src/cli/contentCheck.ts');
  const tsx = resolve('packages/game-data/node_modules/tsx/dist/cli.mjs');
  try {
    cpSync(resolve('packages/game-data/content'), directory, { recursive: true });
    const valid = spawnSync(process.execPath, [tsx, cli, directory], { encoding: 'utf8' });
    expect(valid.status).toBe(0);
    const scenarioPath = join(directory, 'scenario.json');
    writeFileSync(
      scenarioPath,
      readFileSync(scenarioPath, 'utf8').replace('"approval": 58', '"approval": 58.12'),
    );
    const invalid = spawnSync(process.execPath, [tsx, cli, directory], { encoding: 'utf8' });
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toContain('KESALAHAN');
    expect(invalid.stdout).toContain('desimal');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
