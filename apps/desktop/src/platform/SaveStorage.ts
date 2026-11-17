import type { SaveFile, SaveSlotId, SaveSlotInfo, Settings } from '@republika/shared';

export type SaveStorageKind = 'memory' | 'tauri';

/**
 * Satu-satunya pintu akses file untuk UI (AGENT.md §4.4). Implementasi Tauri
 * diisi pada Tahap 3; versi web dan test memakai MemoryStorage.
 */
export interface SaveStorage {
  readonly kind: SaveStorageKind;

  listSlots(): Promise<readonly SaveSlotInfo[]>;
  readSave(slot: SaveSlotId): Promise<SaveFile | null>;
  writeSave(slot: SaveSlotId, save: SaveFile): Promise<void>;

  readSettings(): Promise<Settings | null>;
  writeSettings(settings: Settings): Promise<void>;
}
