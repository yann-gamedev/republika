import type { SaveStorage } from './SaveStorage';

export const LOG_FILE = 'logs/republika.log';
/** Lokasi yang ditampilkan ke pemain untuk dilampirkan di GitHub Issues. */
export const LOG_LOCATION = 'Documents/REPUBLIKA/logs/republika.log';
export const MAX_LOG_BYTES = 1024 * 1024;
/** republika.log + republika.1.log + republika.2.log */
export const LOG_FILES = 3;

export type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  log(level: LogLevel, message: string): Promise<void>;
}

type LogStorage = Pick<SaveStorage, 'readFile' | 'writeFile' | 'renameFile'>;

function rotatedName(index: number): string {
  return index === 0 ? LOG_FILE : LOG_FILE.replace(/\.log$/u, `.${index}.log`);
}

/**
 * Log lokal ringan: hanya error dan durasi, tanpa data jaringan maupun data
 * pribadi. Maksimal 1 MB per file dengan rotasi 3 file. Penulisan diantrekan
 * berurutan dan tidak pernah melempar exception ke pemanggil.
 */
export function createLogger(storage: LogStorage, now: () => string): Logger {
  let queue: Promise<void> = Promise.resolve();

  const write = async (line: string): Promise<void> => {
    const current = (await storage.readFile(LOG_FILE)) ?? '';
    if (current.length > 0 && current.length + line.length > MAX_LOG_BYTES) {
      for (let index = LOG_FILES - 1; index > 0; index -= 1) {
        const source = rotatedName(index - 1);
        if ((await storage.readFile(source)) !== null) {
          await storage.renameFile(source, rotatedName(index));
        }
      }
      await storage.writeFile(LOG_FILE, line);
      return;
    }
    await storage.writeFile(LOG_FILE, current + line);
  };

  return {
    log(level, message) {
      const line = `${now()} ${level.toUpperCase()} ${message.replace(/\s+/gu, ' ').slice(0, 2000)}\n`;
      queue = queue.then(() => write(line)).catch(() => undefined);
      return queue;
    },
  };
}
