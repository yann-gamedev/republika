import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function lintFixture(code: string, filePath: string) {
  const results = await eslint.lintText(code, { filePath, warnIgnored: false });
  const result = results[0];
  if (result === undefined) throw new Error('ESLint tidak mengembalikan hasil.');
  return result;
}

describe('aturan lint batas domain', () => {
  it('menolak Math.random() di packages/simulation', async () => {
    const result = await lintFixture(
      'export function roll(): number {\n  return Math.random();\n}\n',
      'packages/simulation/src/lint-fixture-random.ts',
    );
    expect(result.messages.some((message) => message.ruleId === 'no-restricted-properties')).toBe(
      true,
    );
  });

  it.each(['react', '@tauri-apps/api', '@tauri-apps/api/core'])(
    'menolak import %s di engine',
    async (moduleName) => {
      const result = await lintFixture(
        `import * as forbidden from '${moduleName}';\nexport { forbidden };\n`,
        'packages/simulation/src/lint-fixture-import.ts',
      );
      expect(result.messages.some((message) => message.ruleId === 'no-restricted-imports')).toBe(
        true,
      );
    },
  );

  it.each(['new Date()', 'crypto.randomUUID()'])('menolak %s di engine', async (expression) => {
    const result = await lintFixture(
      `export const forbidden = ${expression};\n`,
      'packages/simulation/src/lint-fixture-global.ts',
    );
    expect(result.messages.some((message) => message.ruleId === 'no-restricted-globals')).toBe(
      true,
    );
  });

  it('menolak import @tauri-apps/api di komponen UI', async () => {
    const result = await lintFixture(
      "import { invoke } from '@tauri-apps/api/core';\n\nexport const run = invoke;\n",
      'apps/desktop/src/features/lint-fixture-tauri.tsx',
    );
    expect(result.messages.some((message) => message.ruleId === 'no-restricted-imports')).toBe(
      true,
    );
  });

  it.each([
    ['apps/desktop/src/features/lint-fixture.tsx', '@tauri-apps/api/core'],
    ['packages/simulation/src/lint-fixture.ts', 'node:fs'],
    ['packages/simulation/src/lint-fixture.ts', 'react'],
    ['packages/simulation/src/lint-fixture.ts', '@tauri-apps/api/core'],
  ])('menolak import dinamis %s: %s', async (filePath, moduleName) => {
    const result = await lintFixture(`export const forbidden = import('${moduleName}');`, filePath);
    expect(result.messages.some((message) => message.ruleId === 'no-restricted-syntax')).toBe(true);
  });

  it('mengizinkan import dinamis Tauri di platform/', async () => {
    const result = await lintFixture(
      "export const allowed = import('@tauri-apps/api/core');",
      'apps/desktop/src/platform/lint-fixture.ts',
    );
    expect(result.errorCount).toBe(0);
  });

  it('mengizinkan import @tauri-apps/api di platform/', async () => {
    const result = await lintFixture(
      "import { invoke } from '@tauri-apps/api/core';\n\nexport { invoke };\n",
      'apps/desktop/src/platform/lint-fixture-tauri.ts',
    );
    expect(result.messages.some((message) => message.ruleId === 'no-restricted-imports')).toBe(
      false,
    );
  });

  it('menolak import node:fs di packages/simulation', async () => {
    const result = await lintFixture(
      "import { readFileSync } from 'node:fs';\n\nexport { readFileSync };\n",
      'packages/simulation/src/lint-fixture-node.ts',
    );
    expect(result.messages.some((message) => message.ruleId === 'no-restricted-imports')).toBe(
      true,
    );
  });
});
