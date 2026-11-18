import { SAVE_FORMAT_VERSION, saveFileSchema, type SaveFile } from '@republika/shared';

import { expandFromDisk, isObject } from './compact.js';
import { migrateV1ToV2 } from './migrations/v1ToV2.js';

type Migrator = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Rantai migrator format save: kunci = versi asal, hasil = versi asal + 1.
 * Setiap migrator baru WAJIB punya test dengan contoh file lama di
 * `test/fixtures/saves/` (lihat docs/RELEASE.md).
 */
export const SAVE_MIGRATORS: Readonly<Record<number, Migrator>> = {
  1: migrateV1ToV2,
};

export type MigrateSaveError =
  | { readonly code: 'NOT_A_SAVE'; readonly detail: string }
  | { readonly code: 'NEWER_FORMAT'; readonly version: number }
  | { readonly code: 'NO_MIGRATOR'; readonly version: number }
  | { readonly code: 'INVALID'; readonly detail: string };

export type MigrateSaveResult =
  | { readonly ok: true; readonly save: SaveFile; readonly fromFormat: number }
  | { readonly ok: false; readonly error: MigrateSaveError };

/**
 * JSON mentah dari disk (format apa pun yang dikenal) → SaveFile terbaru yang
 * sudah divalidasi Zod. Murni dan tidak pernah melempar exception.
 */
export function migrateSave(raw: unknown): MigrateSaveResult {
  if (!isObject(raw) || typeof raw.saveFormatVersion !== 'number') {
    return { ok: false, error: { code: 'NOT_A_SAVE', detail: 'saveFormatVersion tidak ada.' } };
  }
  const fromFormat = raw.saveFormatVersion;
  if (!Number.isInteger(fromFormat) || fromFormat < 1) {
    return {
      ok: false,
      error: { code: 'NOT_A_SAVE', detail: `saveFormatVersion ${String(fromFormat)}` },
    };
  }
  if (fromFormat > SAVE_FORMAT_VERSION) {
    return { ok: false, error: { code: 'NEWER_FORMAT', version: fromFormat } };
  }
  let current: Record<string, unknown> = raw;
  for (let version = fromFormat; version < SAVE_FORMAT_VERSION; version += 1) {
    const migrator = SAVE_MIGRATORS[version];
    if (migrator === undefined) return { ok: false, error: { code: 'NO_MIGRATOR', version } };
    current = migrator(current);
  }
  const parsed = saveFileSchema.safeParse(expandFromDisk(current));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: {
        code: 'INVALID',
        detail: issue === undefined ? 'invalid' : `${issue.path.join('.')}: ${issue.message}`,
      },
    };
  }
  return { ok: true, save: parsed.data, fromFormat };
}
