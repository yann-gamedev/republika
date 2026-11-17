import { FileBackedStorage } from './FileBackedStorage';
import type { FilePort } from './SaveStorage';

/** Port file di memori untuk dev browser dan test. Tidak menyentuh disk. */
export class MemoryFilePort implements FilePort {
  readonly kind = 'memory' as const;
  readonly files = new Map<string, string>();

  async ensureDirs(_relativeDirs: readonly string[]): Promise<void> {
    // Memori tidak punya folder.
  }

  async readText(relativePath: string): Promise<string | null> {
    return this.files.get(relativePath) ?? null;
  }

  async writeTextAtomic(relativePath: string, contents: string): Promise<void> {
    this.files.set(relativePath, contents);
  }
}

/** Penyimpanan in-memory (dev browser dan test) dengan perilaku sama seperti versi file. */
export class MemoryStorage extends FileBackedStorage {
  readonly memory: MemoryFilePort;

  constructor(port: MemoryFilePort = new MemoryFilePort()) {
    super(port);
    this.memory = port;
  }
}
