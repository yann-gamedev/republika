import { MemoryStorage } from './MemoryStorage';
import { TauriFileStorage } from './TauriFileStorage';
import { isTauriRuntime } from './runtime';
import type { SaveStorage } from './SaveStorage';

export { createCampaignSeed, createCommandId, nowIso } from './entropy';
export { FileBackedStorage, parseSaveText, serializeSave } from './FileBackedStorage';
export { MemoryFilePort, MemoryStorage } from './MemoryStorage';
export { TauriFileStorage } from './TauriFileStorage';
export { LOG_LOCATION, createLogger, type Logger } from './logger';
export {
  forceCloseWindow,
  onWindowCloseRequested,
  importSaveFile,
  isTauriRuntime,
  openSavesFolder,
  quitApplication,
  setApplicationFullscreen,
} from './runtime';
export type { FilePort, SaveReadResult, SaveStorage, SaveStorageKind } from './SaveStorage';

export function createSaveStorage(): SaveStorage {
  return isTauriRuntime() ? new TauriFileStorage() : new MemoryStorage();
}

export const saveStorage = createSaveStorage();
