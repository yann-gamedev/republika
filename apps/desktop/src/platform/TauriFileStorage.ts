import { copy } from '@/copy/id';

import { FileBackedStorage } from './FileBackedStorage';
import type { FilePort } from './SaveStorage';

/** Port file Tauri. Command Rust `save_atomic`/`read_text` disambungkan pada bagian 3.3. */
class TauriFilePort implements FilePort {
  readonly kind = 'tauri' as const;

  async ensureDirs(_relativeDirs: readonly string[]): Promise<void> {
    throw new Error(copy.errors.storageUnavailable);
  }

  async readText(_relativePath: string): Promise<string | null> {
    throw new Error(copy.errors.storageUnavailable);
  }

  async writeTextAtomic(_relativePath: string, _contents: string): Promise<void> {
    throw new Error(copy.errors.storageUnavailable);
  }
}

export class TauriFileStorage extends FileBackedStorage {
  constructor() {
    super(new TauriFilePort());
  }
}
