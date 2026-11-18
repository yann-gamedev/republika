import type { LedgerEntry } from '@republika/shared';

import { compactLedgerEntry, isObject } from '../compact.js';

/**
 * Format save v1 → v2 (contoh migrasi nyata):
 * - menambah `playTimeSeconds` dengan nilai 0 (lama bermain belum tercatat di v1);
 * - ledger di disk menjadi ringkas (`id` dan `after` dibuang bila bisa dihitung ulang).
 * Murni: menerima dan mengembalikan JSON mentah, tanpa I/O.
 */
export function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  const history = isObject(raw.history) ? raw.history : {};
  const compact = (entry: unknown) =>
    isObject(entry) && typeof entry.turn === 'number' && typeof entry.order === 'number'
      ? compactLedgerEntry(entry as unknown as LedgerEntry)
      : entry;
  const reports = Array.isArray(history.reports)
    ? history.reports.map((report) =>
        isObject(report) && Array.isArray(report.ledger)
          ? { ...report, ledger: report.ledger.map(compact) }
          : report,
      )
    : [];
  return {
    ...raw,
    saveFormatVersion: 2,
    playTimeSeconds: typeof raw.playTimeSeconds === 'number' ? raw.playTimeSeconds : 0,
    history: {
      ...history,
      reports,
      ledger: Array.isArray(history.ledger) ? history.ledger.map(compact) : [],
    },
  };
}
