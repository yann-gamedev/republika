import type { LedgerEntry } from '@republika/shared';

export type LedgerDraft = Omit<LedgerEntry, 'id' | 'turn' | 'order'>;

/**
 * Pencatat ledger satu turn. `order` naik berurutan sesuai urutan penerapan,
 * sehingga ledger bisa diputar ulang untuk merekonstruksi state.
 */
export class Ledger {
  readonly turn: number;
  readonly entries: LedgerEntry[] = [];

  constructor(turn: number) {
    this.turn = turn;
  }

  push(draft: LedgerDraft): LedgerEntry {
    const order = this.entries.length;
    const entry: LedgerEntry = {
      id: `T${String(this.turn).padStart(2, '0')}-${String(order).padStart(4, '0')}`,
      turn: this.turn,
      order,
      ...draft,
    };
    this.entries.push(entry);
    return entry;
  }
}
