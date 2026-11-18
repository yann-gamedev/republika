import type { SaveFile, SaveSlotId, SaveSlotInfo, Settings } from '@republika/shared';

export type SaveStorageKind = 'memory' | 'tauri' | 'node';

/** Hasil membaca satu file save. File rusak tidak pernah melempar exception. */
export type SaveReadResult =
  | { readonly status: 'missing' }
  | { readonly status: 'ok'; readonly save: SaveFile }
  | { readonly status: 'corrupt'; readonly reason: 'json' | 'schema'; readonly detail: string };

/**
 * Satu-satunya pintu akses file untuk UI (AGENT.md §4.4). Semua path relatif
 * terhadap folder `Documents/REPUBLIKA/`.
 */
export interface SaveStorage {
  readonly kind: SaveStorageKind;

  /** Menyiapkan folder `saves/` dan `logs/`. Aman dipanggil berulang. */
  init(): Promise<void>;
  listSlots(): Promise<readonly SaveSlotInfo[]>;
  readSave(slot: SaveSlotId): Promise<SaveReadResult>;
  /** Membaca cadangan (`autosave.bak.json`). Slot lain tidak punya cadangan. */
  readBackup(slot: SaveSlotId): Promise<SaveReadResult>;
  /** Menulis atomik. Untuk autosave, versi valid sebelumnya disalin ke `.bak` dulu. */
  writeSave(slot: SaveSlotId, save: SaveFile): Promise<void>;
  /** Memindahkan slot ke `saves/trash/` (bukan hapus permanen). */
  moveToTrash(slot: SaveSlotId, stamp: string): Promise<void>;

  readSettings(): Promise<Settings | null>;
  writeSettings(settings: Settings): Promise<void>;
}

/**
 * Operasi file mentah yang dibutuhkan `FileBackedStorage`. Implementasi:
 * memori (dev/test), Tauri (rilis), Node fs (test kontrak).
 */
export interface FilePort {
  readonly kind: SaveStorageKind;
  ensureDirs(relativeDirs: readonly string[]): Promise<void>;
  /** `null` bila file tidak ada. */
  readText(relativePath: string): Promise<string | null>;
  /** Tulis ke `*.tmp`, flush, lalu rename — file lama utuh bila gagal di tengah. */
  writeTextAtomic(relativePath: string, contents: string): Promise<void>;
  /** Pindah/ganti nama file di dalam folder data. */
  rename(fromRelative: string, toRelative: string): Promise<void>;
  /** Nama file `.json` langsung di dalam `saves/`. */
  listSaveFiles(): Promise<string[]>;
}
