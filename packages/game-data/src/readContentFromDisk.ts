import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { RawContentBundle, ValidationIssue } from '@republika/shared';

function readJson(filePath: string, relativePath: string, issues: ValidationIssue[]): unknown {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  } catch (error) {
    issues.push({
      severity: 'error',
      code: 'JSON_INVALID',
      path: relativePath,
      message: error instanceof Error ? error.message : 'Berkas JSON tidak dapat dibaca.',
    });
    return null;
  }
}

function jsonFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

export interface DiskContentResult {
  readonly raw: RawContentBundle;
  readonly issues: readonly ValidationIssue[];
  readonly fileCount: number;
}

/** Membaca konten dari disk untuk CLI penulis konten, bukan untuk runtime aplikasi. */
export function readContentFromDisk(contentDirectory: string): DiskContentResult {
  const issues: ValidationIssue[] = [];
  let fileCount = 0;

  const readRequired = (relativePath: string): unknown => {
    fileCount += 1;
    return readJson(join(contentDirectory, relativePath), relativePath, issues);
  };

  const readDirectory = (relativeDirectory: string, prefix: string): unknown[] => {
    const directory = join(contentDirectory, relativeDirectory);
    let files: string[];
    try {
      files = jsonFiles(directory);
    } catch (error) {
      issues.push({
        severity: 'error',
        code: 'DIRECTORY_MISSING',
        path: relativeDirectory,
        message: error instanceof Error ? error.message : 'Folder konten tidak ditemukan.',
      });
      return [];
    }
    return files.map((file) => {
      fileCount += 1;
      return readJson(join(directory, file), `${prefix}${file}`, issues);
    });
  };

  const scenario = readRequired('scenario.json');
  const baseline = readRequired('baseline.json');
  const ministries = readRequired('ministries.json');
  const archetypes = readRequired('archetypes.json');
  const factions = readDirectory(join('factions'), 'factions/');
  const policies = readDirectory(join('policies'), 'policies/');
  const events = readDirectory(join('events'), 'events/');

  return {
    raw: { scenario, baseline, ministries, archetypes, factions, policies, events },
    issues,
    fileCount,
  };
}
