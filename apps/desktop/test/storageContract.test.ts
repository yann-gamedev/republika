import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { APP_VERSION, SAVE_FORMAT_VERSION, type SaveFile } from '@republika/shared';
import { createInitialState, hashState } from '@republika/simulation';

import { contentHash, definitions } from '../src/content/gameContent';
import { FileBackedStorage } from '../src/platform/FileBackedStorage';
import { MemoryFilePort } from '../src/platform/MemoryStorage';
import type { FilePort } from '../src/platform/SaveStorage';
import { NodeFilePort } from './support/nodeFilePort';

const tempRoots: string[] = [];

afterAll(async () => {
  for (const root of tempRoots) await rm(root, { recursive: true, force: true });
});

function makeSave(turn: number, label = `Kuartal ${turn}`): SaveFile {
  const state = createInitialState(definitions.scenario, definitions, {
    presidentName: 'Sari Wening',
    seed: `kontrak-${turn}`,
  });
  return {
    saveFormatVersion: SAVE_FORMAT_VERSION,
    appVersion: APP_VERSION,
    rulesetVersion: state.rulesetVersion,
    contentHash,
    savedAt: '2031-01-01T00:00:00.000Z',
    label,
    playTimeSeconds: 0,
    state: { ...state, turn: Math.min(turn, state.maxTurns) },
    history: { reports: [], ledger: [] },
  };
}

interface Harness {
  readonly port: FilePort;
  /** Membuat penulisan berikutnya gagal di tengah jalan. */
  readonly crashNextWrite: () => void;
  readonly root?: string;
}

const implementations: Array<[string, () => Promise<Harness>]> = [
  [
    'MemoryStorage',
    async () => {
      const port = new MemoryFilePort();
      const original = port.writeTextAtomic.bind(port);
      let crash = false;
      port.writeTextAtomic = async (path, contents) => {
        if (crash) {
          crash = false;
          throw new Error('simulasi: app mati');
        }
        await original(path, contents);
      };
      return { port, crashNextWrite: () => (crash = true) };
    },
  ],
  [
    'Node fs (pengganti Tauri)',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'republika-kontrak-'));
      tempRoots.push(root);
      const port = new NodeFilePort(root);
      return { port, root, crashNextWrite: () => (port.crashBeforeRename = true) };
    },
  ],
];

describe.each(implementations)('kontrak SaveStorage — %s', (_name, create) => {
  it('tulis-baca bolak-balik identik (hash)', async () => {
    const { port } = await create();
    const storage = new FileBackedStorage(port);
    await storage.init();
    const save = makeSave(2);
    await storage.writeSave('slot-3', save);
    const read = await storage.readSave('slot-3');
    expect(read.status).toBe('ok');
    if (read.status === 'ok') expect(hashState(read.save)).toBe(hashState(save));
    expect((await storage.listSlots()).map((slot) => slot.slot)).toEqual(['slot-3']);
  });

  it('file setengah tertulis tidak merusak save sebelumnya', async () => {
    const harness = await create();
    const storage = new FileBackedStorage(harness.port);
    await storage.init();
    const first = makeSave(1, 'Pertama');
    await storage.writeSave('slot-1', first);
    harness.crashNextWrite();
    await expect(storage.writeSave('slot-1', makeSave(3, 'Kedua'))).rejects.toThrow();
    const read = await storage.readSave('slot-1');
    expect(read.status).toBe('ok');
    if (read.status === 'ok') expect(hashState(read.save)).toBe(hashState(first));
    const slots = await storage.listSlots();
    expect(slots).toHaveLength(1);
    expect(slots[0]?.isCorrupt).toBe(false);
    if (harness.root !== undefined) {
      // File sementara boleh tertinggal, tetapi tidak pernah dibaca sebagai save.
      expect(await readdir(join(harness.root, 'saves'))).toContain('slot-1.tmp');
    }
  });

  it('JSON rusak dan skema tidak valid ditangani tanpa exception', async () => {
    const { port } = await create();
    const storage = new FileBackedStorage(port);
    await storage.init();
    await port.writeTextAtomic('saves/slot-2.json', '{"saveFormatVersion": 1, "potong');
    await port.writeTextAtomic('saves/slot-4.json', JSON.stringify({ saveFormatVersion: 1 }));
    expect(await storage.readSave('slot-2')).toMatchObject({ status: 'corrupt', reason: 'json' });
    expect(await storage.readSave('slot-4')).toMatchObject({ status: 'corrupt', reason: 'schema' });
    expect(await storage.readSave('slot-5')).toEqual({ status: 'missing' });
    const slots = await storage.listSlots();
    expect(slots.map((slot) => [slot.slot, slot.isCorrupt])).toEqual([
      ['slot-2', true],
      ['slot-4', true],
    ]);
  });

  it('autosave menyalin versi valid sebelumnya ke autosave.bak.json', async () => {
    const { port } = await create();
    const storage = new FileBackedStorage(port);
    await storage.init();
    await storage.writeSave('autosave', makeSave(1));
    expect(await storage.readBackup('autosave')).toEqual({ status: 'missing' });
    await storage.writeSave('autosave', makeSave(2));
    const backup = await storage.readBackup('autosave');
    expect(backup.status === 'ok' ? backup.save.label : null).toBe('Kuartal 1');
    expect((await storage.listSlots())[0]).toMatchObject({ slot: 'autosave', hasBackup: true });

    // Autosave rusak tidak boleh menimpa cadangan yang bagus.
    await port.writeTextAtomic('saves/autosave.json', 'bukan json');
    await storage.writeSave('autosave', makeSave(3));
    const stillGood = await storage.readBackup('autosave');
    expect(stillGood.status === 'ok' ? stillGood.save.label : null).toBe('Kuartal 1');
  });

  it('pengaturan bolak-balik; pengaturan rusak dibaca sebagai null', async () => {
    const { port } = await create();
    const storage = new FileBackedStorage(port);
    await storage.init();
    expect(await storage.readSettings()).toBeNull();
    const settings = {
      uiScale: 110 as const,
      fullscreen: true,
      lastRunAppVersion: APP_VERSION,
      askedAboutPreviousVersion: true,
    };
    await storage.writeSettings(settings);
    expect(await storage.readSettings()).toEqual(settings);
    await port.writeTextAtomic('settings.json', '{rusak');
    expect(await storage.readSettings()).toBeNull();
  });

  it('menolak menulis save yang tidak valid', async () => {
    const { port } = await create();
    const storage = new FileBackedStorage(port);
    const invalid = { ...makeSave(1), label: '' };
    await expect(storage.writeSave('slot-1', invalid)).rejects.toThrow();
    expect(await storage.readSave('slot-1')).toEqual({ status: 'missing' });
  });
});

describe('Node fs: init membuat folder', () => {
  it('saves/ dan logs/ dibuat', async () => {
    const root = await mkdtemp(join(tmpdir(), 'republika-init-'));
    tempRoots.push(root);
    await new FileBackedStorage(new NodeFilePort(root)).init();
    expect((await stat(join(root, 'saves'))).isDirectory()).toBe(true);
    expect((await stat(join(root, 'logs'))).isDirectory()).toBe(true);
  });
});
