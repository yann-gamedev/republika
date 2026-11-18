#!/usr/bin/env node
/**
 * pnpm version:set <versi>   — mis. pnpm version:set 0.1.0-rc.1
 *
 * Satu sumber versi: package.json root. Script ini menyalin versi yang sama ke
 * apps/desktop/package.json, tauri.conf.json, Cargo.toml, Cargo.lock, dan
 * APP_VERSION di packages/shared. Tanpa argumen: menyinkronkan dari root.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

const rootPkgPath = join(ROOT, 'package.json');
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
const version = process.argv[2] ?? rootPkg.version;
if (!SEMVER.test(version)) {
  console.error(`Versi "${version}" bukan semver (contoh: 0.1.0 atau 0.1.0-rc.1).`);
  process.exit(1);
}

function updateJson(relative, mutate) {
  const path = join(ROOT, relative);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  mutate(data);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function replaceOnce(relative, pattern, replacement) {
  const path = join(ROOT, relative);
  const text = readFileSync(path, 'utf8');
  if (!pattern.test(text)) {
    console.error(`Pola versi tidak ditemukan di ${relative}.`);
    process.exit(1);
  }
  writeFileSync(path, text.replace(pattern, replacement));
}

updateJson('package.json', (data) => {
  data.version = version;
});
updateJson('apps/desktop/package.json', (data) => {
  data.version = version;
});
updateJson('apps/desktop/src-tauri/tauri.conf.json', (data) => {
  data.version = version;
});
replaceOnce('apps/desktop/src-tauri/Cargo.toml', /^version = "[^"]*"/mu, `version = "${version}"`);
replaceOnce(
  'apps/desktop/src-tauri/Cargo.lock',
  /(name = "republika"\r?\nversion = ")[^"]*(")/u,
  `$1${version}$2`,
);
replaceOnce(
  'packages/shared/src/types/constants.ts',
  /export const APP_VERSION = '[^']*';/u,
  `export const APP_VERSION = '${version}';`,
);
console.log(`Versi disetel ke ${version} di 6 file.`);
