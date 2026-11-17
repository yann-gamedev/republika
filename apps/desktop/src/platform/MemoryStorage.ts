import type { SaveFile, SaveSlotId, SaveSlotInfo, Settings } from '@republika/shared';

import type { SaveStorage } from './SaveStorage';

/** Penyimpanan in-memory untuk dev browser dan test. Tidak menyentuh disk. */
export class MemoryStorage implements SaveStorage {
  readonly kind = 'memory' as const;

  private readonly saves = new Map<SaveSlotId, SaveFile>();
  private settings: Settings | null = null;

  async listSlots(): Promise<readonly SaveSlotInfo[]> {
    return [...this.saves.entries()]
      .map(([slot, save]) => ({
        slot,
        label: save.label,
        savedAt: save.savedAt,
        turn: save.state.turn,
        presidentName: save.state.presidentName,
        rulesetVersion: save.rulesetVersion,
        hasBackup: false,
        isCorrupt: false,
      }))
      .sort((left, right) => left.slot.localeCompare(right.slot));
  }

  async readSave(slot: SaveSlotId): Promise<SaveFile | null> {
    const save = this.saves.get(slot);
    return save === undefined ? null : structuredClone(save);
  }

  async writeSave(slot: SaveSlotId, save: SaveFile): Promise<void> {
    this.saves.set(slot, structuredClone(save));
  }

  async readSettings(): Promise<Settings | null> {
    return this.settings === null ? null : structuredClone(this.settings);
  }

  async writeSettings(settings: Settings): Promise<void> {
    this.settings = structuredClone(settings);
  }
}
