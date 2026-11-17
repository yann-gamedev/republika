import { MemoryStorage } from './MemoryStorage';
import { TauriFileStorage } from './TauriFileStorage';
import { isTauriRuntime } from './runtime';
import type { SaveStorage } from './SaveStorage';

export { MemoryStorage } from './MemoryStorage';
export { TauriFileStorage } from './TauriFileStorage';
export { isTauriRuntime, quitApplication, setApplicationFullscreen } from './runtime';
export type { SaveStorage, SaveStorageKind } from './SaveStorage';

export function createSaveStorage(): SaveStorage {
  return isTauriRuntime() ? new TauriFileStorage() : new MemoryStorage();
}

export const saveStorage = createSaveStorage();
