import { mkdir, open, readFile, readdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { FilePort } from '../../src/platform/SaveStorage';

/**
 * Port file berbasis Node fs untuk test, meniru `save_atomic` Rust:
 * tulis `*.tmp` → fsync → rename. `crashBeforeRename` mensimulasikan app mati
 * setelah file sementara ditulis sebagian.
 */
export class NodeFilePort implements FilePort {
  readonly kind = 'node' as const;
  crashBeforeRename = false;
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async ensureDirs(relativeDirs: readonly string[]): Promise<void> {
    for (const dir of relativeDirs) await mkdir(join(this.root, dir), { recursive: true });
  }

  async readText(relativePath: string): Promise<string | null> {
    try {
      return await readFile(join(this.root, relativePath), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async rename(fromRelative: string, toRelative: string): Promise<void> {
    const target = join(this.root, toRelative);
    await mkdir(dirname(target), { recursive: true });
    await rename(join(this.root, fromRelative), target);
  }

  async listSaveFiles(): Promise<string[]> {
    try {
      const entries = await readdir(join(this.root, 'saves'), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }

  async writeTextAtomic(relativePath: string, contents: string): Promise<void> {
    const target = join(this.root, relativePath);
    await mkdir(dirname(target), { recursive: true });
    const tmp = target.replace(/\.json$/u, '.tmp');
    const handle = await open(tmp, 'w');
    try {
      if (this.crashBeforeRename) {
        await handle.write(contents.slice(0, Math.floor(contents.length / 2)));
        await handle.sync();
        throw new Error('simulasi: app mati sebelum rename');
      }
      await handle.write(contents);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmp, target);
  }
}
