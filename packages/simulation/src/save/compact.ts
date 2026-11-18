import type { LedgerEntry, SaveFile } from '@republika/shared';

type JsonObject = Record<string, unknown>;

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** ID ledger dapat dihitung ulang dari turn + order (sama dengan `Ledger.push`). */
export function ledgerId(turn: number, order: number): string {
  return `T${String(turn).padStart(2, '0')}-${String(order).padStart(4, '0')}`;
}

/**
 * Bentuk ledger di disk (format v2): field turunan dibuang. `id` dihitung dari
 * turn + order, `after` dari before + delta. `after` tetap disimpan bila tidak
 * konsisten (mis. save hasil edit pemain) agar tidak ada informasi hilang.
 */
export function compactLedgerEntry(entry: LedgerEntry): JsonObject {
  const { id, after, ...rest } = entry;
  const compact: JsonObject = { ...rest };
  if (id !== ledgerId(entry.turn, entry.order)) compact.id = id;
  const derived =
    entry.before !== undefined && entry.delta !== undefined
      ? entry.before + entry.delta
      : undefined;
  if (after !== undefined && after !== derived) compact.after = after;
  return compact;
}

/** Kebalikan `compactLedgerEntry` (bekerja pada JSON mentah sebelum validasi Zod). */
export function expandLedgerEntry(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  const entry: JsonObject = { ...raw };
  if (entry.id === undefined && typeof entry.turn === 'number' && typeof entry.order === 'number') {
    entry.id = ledgerId(entry.turn, entry.order);
  }
  if (
    entry.after === undefined &&
    typeof entry.before === 'number' &&
    typeof entry.delta === 'number'
  ) {
    entry.after = entry.before + entry.delta;
  }
  return entry;
}

function mapLedgers(raw: JsonObject, map: (entry: unknown) => unknown): JsonObject {
  const history = raw.history;
  if (!isObject(history)) return raw;
  const reports = Array.isArray(history.reports)
    ? history.reports.map((report) =>
        isObject(report) && Array.isArray(report.ledger)
          ? { ...report, ledger: report.ledger.map(map) }
          : report,
      )
    : history.reports;
  const ledger = Array.isArray(history.ledger) ? history.ledger.map(map) : history.ledger;
  return { ...raw, history: { ...history, reports, ledger } };
}

/** SaveFile → objek JSON untuk disk (ledger ringkas). */
export function saveToDisk(save: SaveFile): JsonObject {
  return mapLedgers(save as unknown as JsonObject, (entry) =>
    compactLedgerEntry(entry as LedgerEntry),
  );
}

/** Objek JSON dari disk (format terbaru) → bentuk lengkap siap divalidasi Zod. */
export function expandFromDisk(raw: JsonObject): JsonObject {
  return mapLedgers(raw, expandLedgerEntry);
}
