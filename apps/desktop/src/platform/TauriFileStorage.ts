import { invoke } from '@tauri-apps/api/core';

import { FileBackedStorage } from './FileBackedStorage';
import type { FilePort } from './SaveStorage';

/**
 * Port file Tauri: memanggil tiga command Rust di `src-tauri/src/main.rs`.
 * Path relatif terhadap `Documents/REPUBLIKA/`; Rust menolak traversal.
 */
class TauriFilePort implements FilePort {
  readonly kind = 'tauri' as const;

  async ensureDirs(_relativeDirs: readonly string[]): Promise<void> {
    // Rust membuat saves/ dan logs/ saat app dibuka; list_saves memastikan saves/ ada.
    await invoke<string[]>('list_saves');
  }

  async readText(relativePath: string): Promise<string | null> {
    return invoke<string | null>('read_text', { path: relativePath });
  }

  async writeTextAtomic(relativePath: string, contents: string): Promise<void> {
    await invoke('save_atomic', { path: relativePath, contents });
  }

  async rename(fromRelative: string, toRelative: string): Promise<void> {
    await invoke('rename_file', { from: fromRelative, to: toRelative });
  }

  async listSaveFiles(): Promise<string[]> {
    return invoke<string[]>('list_saves');
  }
}

export class TauriFileStorage extends FileBackedStorage {
  constructor() {
    super(new TauriFilePort());
  }
}
