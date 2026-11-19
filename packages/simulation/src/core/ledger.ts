import type { LedgerEntry } from '@republika/shared';

export type LedgerDraft = Omit<LedgerEntry, 'id' | 'turn' | 'order'>;

/**
 * Pencatat ledger satu turn. `order` naik berurutan sesuai urutan penerapan,
 * sehingga ledger bisa diputar ulang untuk merekonstruksi state.
 */
export class Ledger {
  readonly turn: number;
  readonly entries: LedgerEntry[] = [];

  /** Awalan ID opsional (mis. `B` untuk ledger pembukaan kampanye) agar tidak bentrok. */
  readonly prefix: string;

  constructor(turn: number, prefix = '') {
    this.turn = turn;
    this.prefix = prefix;
  }

  push(draft: LedgerDraft): LedgerEntry {
    const order = this.entries.length;
    const sequence =
      this.prefix.length === 0
        ? String(order).padStart(4, '0')
        : `${this.prefix}${String(order).padStart(3, '0')}`;
    const entry: LedgerEntry = {
      id: `T${String(this.turn).padStart(2, '0')}-${sequence}`,
      turn: this.turn,
      order,
      ...draft,
    };
    this.entries.push(entry);
    return entry;
  }
}
