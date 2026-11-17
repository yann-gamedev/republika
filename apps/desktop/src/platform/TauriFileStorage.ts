import type { SaveFile, SaveSlotId, SaveSlotInfo, Settings } from '@republika/shared';

import { copy } from '@/copy/id';

import type { SaveStorage } from './SaveStorage';

/**
 * Stub untuk Tahap 1. Command Rust `save_atomic` dan pembacaan folder
 * Documents/REPUBLIKA diisi pada Tahap 3.
 */
export class TauriFileStorage implements SaveStorage {
  readonly kind = 'tauri' as const;

  async listSlots(): Promise<readonly SaveSlotInfo[]> {
    throw new Error(copy.errors.storageUnavailable);
  }

  async readSave(_slot: SaveSlotId): Promise<SaveFile | null> {
    throw new Error(copy.errors.storageUnavailable);
  }

  async writeSave(_slot: SaveSlotId, _save: SaveFile): Promise<void> {
    throw new Error(copy.errors.storageUnavailable);
  }

  async readSettings(): Promise<Settings | null> {
    throw new Error(copy.errors.storageUnavailable);
  }

  async writeSettings(_settings: Settings): Promise<void> {
    throw new Error(copy.errors.storageUnavailable);
  }
}
