import type { LoadedGameContent, RawContentBundle, ValidationIssue } from '@republika/shared';

import { rawContentBundle } from './contentBundle.js';
import { parseRawContent } from './parseContent.js';

export class ContentValidationError extends Error {
  readonly issues: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[], warnings: readonly ValidationIssue[]) {
    super(`Konten tidak valid: ${issues.length} kesalahan.`);
    this.name = 'ContentValidationError';
    this.issues = issues;
    this.warnings = warnings;
  }
}

/**
 * Memuat konten yang sudah dibundel saat build, memvalidasi dengan Zod dan
 * aturan lintas-file, lalu mengonversi ke fixed-point.
 */
export function loadGameDefinitions(raw: RawContentBundle = rawContentBundle): LoadedGameContent {
  const result = parseRawContent(raw);
  if (result.definitions === null || result.contentHash === null) {
    throw new ContentValidationError(result.issues, result.warnings);
  }
  return {
    definitions: result.definitions,
    contentHash: result.contentHash,
    warnings: result.warnings,
  };
}
