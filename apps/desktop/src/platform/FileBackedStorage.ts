import {
  saveFileSchema,
  settingsSchema,
  type SaveFile,
  type SaveSlotId,
  type SaveSlotInfo,
  type Settings,
} from '@republika/shared';

import type { FilePort, SaveReadResult, SaveStorage } from './SaveStorage';

export const SAVE_SLOTS: readonly SaveSlotId[] = [
  'autosave',
  'slot-1',
  'slot-2',
  'slot-3',
  'slot-4',
  'slot-5',
];

export const SAVES_DIR = 'saves';
export const LOGS_DIR = 'logs';
export const SETTINGS_FILE = 'settings.json';

export function savePath(slot: SaveSlotId): string {
  return `${SAVES_DIR}/${slot}.json`;
}

export function backupPath(slot: SaveSlotId): string {
  return `${SAVES_DIR}/${slot}.bak.json`;
}

/** Parse teks save tanpa melempar: JSON rusak dan skema tidak valid dibedakan. */
export function parseSaveText(text: string): SaveReadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return {
      status: 'corrupt',
      reason: 'json',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  const parsed = saveFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: 'corrupt',
      reason: 'schema',
      detail: issue === undefined ? 'invalid' : `${issue.path.join('.')}: ${issue.message}`,
    };
  }
  return { status: 'ok', save: parsed.data };
}

/** Serialisasi save yang stabil (indentasi 2 agar mudah diedit pemain). */
export function serializeSave(save: SaveFile): string {
  return `${JSON.stringify(save, null, 2)}\n`;
}

/**
 * Implementasi `SaveStorage` di atas `FilePort`. Validasi Zod, cadangan
 * autosave, dan daftar slot ditulis sekali di sini untuk semua platform.
 */
export class FileBackedStorage implements SaveStorage {
  readonly kind;
  private readonly port: FilePort;

  constructor(port: FilePort) {
    this.port = port;
    this.kind = port.kind;
  }

  async init(): Promise<void> {
    await this.port.ensureDirs([SAVES_DIR, LOGS_DIR]);
  }

  async listSlots(): Promise<readonly SaveSlotInfo[]> {
    const infos: SaveSlotInfo[] = [];
    for (const slot of SAVE_SLOTS) {
      const text = await this.port.readText(savePath(slot));
      if (text === null) continue;
      const hasBackup =
        slot === 'autosave' && (await this.port.readText(backupPath(slot))) !== null;
      const result = parseSaveText(text);
      if (result.status === 'ok') {
        infos.push({
          slot,
          label: result.save.label,
          savedAt: result.save.savedAt,
          turn: result.save.state.turn,
          presidentName: result.save.state.presidentName,
          rulesetVersion: result.save.rulesetVersion,
          hasBackup,
          isCorrupt: false,
        });
      } else {
        infos.push({
          slot,
          label: slot,
          savedAt: '1970-01-01T00:00:00.000Z',
          turn: 1,
          presidentName: '??',
          rulesetVersion: 1,
          hasBackup,
          isCorrupt: true,
        });
      }
    }
    return infos;
  }

  async readSave(slot: SaveSlotId): Promise<SaveReadResult> {
    return this.readPath(savePath(slot));
  }

  async readBackup(slot: SaveSlotId): Promise<SaveReadResult> {
    return this.readPath(backupPath(slot));
  }

  async writeSave(slot: SaveSlotId, save: SaveFile): Promise<void> {
    const text = serializeSave(saveFileSchema.parse(save));
    if (slot === 'autosave') {
      const previous = await this.port.readText(savePath(slot));
      // Hanya versi lama yang valid yang dijadikan cadangan, agar cadangan bagus
      // tidak tertimpa file rusak.
      if (previous !== null && parseSaveText(previous).status === 'ok') {
        await this.port.writeTextAtomic(backupPath(slot), previous);
      }
    }
    await this.port.writeTextAtomic(savePath(slot), text);
  }

  async readSettings(): Promise<Settings | null> {
    const text = await this.port.readText(SETTINGS_FILE);
    if (text === null) return null;
    try {
      const parsed = settingsSchema.safeParse(JSON.parse(text));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  async writeSettings(settings: Settings): Promise<void> {
    const valid = settingsSchema.parse(settings);
    await this.port.writeTextAtomic(SETTINGS_FILE, `${JSON.stringify(valid, null, 2)}\n`);
  }

  private async readPath(path: string): Promise<SaveReadResult> {
    const text = await this.port.readText(path);
    return text === null ? { status: 'missing' } : parseSaveText(text);
  }
}
