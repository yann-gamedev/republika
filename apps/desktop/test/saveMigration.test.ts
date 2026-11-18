import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadGameDefinitions } from '@republika/game-data';
import { sliceFixtureBundle } from '@republika/game-data/fixtures';
import { SAVE_FORMAT_VERSION } from '@republika/shared';

import { MemoryStorage } from '../src/platform/MemoryStorage';
import { GameController } from '../src/store/gameController';
import { createGameStore } from '../src/store/gameStore';

/** Contoh save format v1 beku (dibuat dari engine Tahap 4, kampanye fixture slice). */
const V1_TEXT = readFileSync(
  fileURLToPath(
    new URL('../../../packages/simulation/test/fixtures/saves/save-v1-slice.json', import.meta.url),
  ),
  'utf8',
);
const sliceDefs = loadGameDefinitions(sliceFixtureBundle).definitions;

function setup(storage = new MemoryStorage(), defs = sliceDefs) {
  const store = createGameStore();
  let counter = 0;
  const controller = new GameController({
    storage,
    definitions: defs,
    contentHash: 'fixture-hash',
    now: () => '2031-07-01T00:00:00.000Z',
    createSeed: () => 'seed',
    createCommandId: () => `cmd-${++counter}`,
    store,
  });
  return { controller, store, storage };
}

describe('alur "versi sebelumnya"', () => {
  it('menemukan save lama, mencadangkan file asli, lalu memperbaruinya ke format terbaru', async () => {
    const { controller, storage } = setup();
    storage.memory.files.set('saves/slot-2.json', V1_TEXT);
    // Save format terbaru tidak ikut dipindai.
    await controller.startCampaign({ presidentName: 'Raka Pradipta', cabinetName: '' });

    const old = await controller.findOldSaves();
    expect(old).toEqual([
      { path: 'saves/slot-2.json', appVersion: '0.1.0', fromFormat: 1, fromRuleset: 3 },
    ]);

    const [outcome] = await controller.migrateSaveFiles(old.map((item) => item.path));
    expect(outcome).toMatchObject({
      ok: true,
      targetSlot: 'slot-2',
      backupPath: 'saves/backup-v0.1.0/slot-2.json',
    });
    expect(storage.memory.files.get('saves/backup-v0.1.0/slot-2.json')).toBe(V1_TEXT);
    const migrated = JSON.parse(storage.memory.files.get('saves/slot-2.json') ?? '{}') as {
      saveFormatVersion: number;
      playTimeSeconds: number;
    };
    expect(migrated.saveFormatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(migrated.playTimeSeconds).toBe(0);
    expect(await controller.findOldSaves()).toEqual([]);

    // Hasil migrasi bisa dimuat dan dilanjutkan.
    expect(await controller.loadSlot('slot-2')).toEqual({ status: 'loaded' });
  });

  it('file asli tetap ada di folder backup walau migrasi gagal', async () => {
    const { controller, storage } = setup();
    const broken = '{"saveFormatVersion": 1, "appVersion": "0.0.9", "label": ""}';
    storage.memory.files.set('saves/slot-4.json', broken);
    storage.memory.files.set('saves/imported/rusak.json', 'bukan json');

    const outcomes = await controller.migrateSaveFiles([
      'saves/slot-4.json',
      'saves/imported/rusak.json',
    ]);
    expect(outcomes.map((item) => item.ok)).toEqual([false, false]);
    expect(storage.memory.files.get('saves/backup-v0.0.9/slot-4.json')).toBe(broken);
    expect(storage.memory.files.get('saves/backup-vlama/rusak.json')).toBe('bukan json');
    expect(outcomes[0]?.reason).toBeDefined();
  });

  it('save impor ditaruh di slot manual kosong pertama; slot penuh → gagal dengan alasan', async () => {
    const { controller, storage } = setup();
    storage.memory.files.set('saves/imported/lama.json', V1_TEXT);
    const [first] = await controller.migrateSaveFiles(['saves/imported/lama.json']);
    expect(first).toMatchObject({ ok: true, targetSlot: 'slot-1' });

    for (const slot of ['slot-2', 'slot-3', 'slot-4', 'slot-5']) {
      storage.memory.files.set(
        `saves/${slot}.json`,
        storage.memory.files.get('saves/slot-1.json') ?? '',
      );
    }
    const [full] = await controller.migrateSaveFiles(['saves/imported/lama.json']);
    expect(full?.ok).toBe(false);
  });

  it('ruleset lama dilanjutkan dengan aturan baru dan dicatat', async () => {
    const { controller, storage, store } = setup();
    const older = JSON.parse(V1_TEXT) as {
      rulesetVersion: number;
      state: { rulesetVersion: number };
    };
    older.rulesetVersion = 2;
    older.state.rulesetVersion = 2;
    storage.memory.files.set('saves/autosave.json', JSON.stringify(older));

    const old = await controller.findOldSaves();
    expect(old[0]).toMatchObject({ fromFormat: 1, fromRuleset: 2 });
    const [outcome] = await controller.migrateSaveFiles(['saves/autosave.json']);
    expect(outcome).toMatchObject({ ok: true, targetSlot: 'autosave', continuedWithRuleset: 3 });
    expect(await controller.continueCampaign()).toEqual({ status: 'loaded' });
    expect(store.getState().state?.rulesetMigratedFrom).toBe(2);
  });

  it('lama bermain bertambah antar-save dan dibatasi 30 menit per jeda', async () => {
    const storage = new MemoryStorage();
    let now = Date.UTC(2031, 0, 1);
    const store = createGameStore();
    const controller = new GameController({
      storage,
      definitions: sliceDefs,
      contentHash: 'fixture-hash',
      now: () => new Date(now).toISOString(),
      nowMs: () => now,
      createSeed: () => 'seed',
      createCommandId: () => `cmd-${now}`,
      store,
    });
    await controller.startCampaign({ presidentName: 'Raka Pradipta', cabinetName: '' });
    now += 90_000;
    await controller.saveToSlot('slot-1');
    now += 5 * 60 * 60 * 1000; // AFK 5 jam
    await controller.saveToSlot('slot-2');
    const read = async (slot: 'slot-1' | 'slot-2') => {
      const result = await storage.readSave(slot);
      return result.status === 'ok' ? result.save.playTimeSeconds : -1;
    };
    expect(await read('slot-1')).toBe(90);
    expect(await read('slot-2')).toBe(90 + 30 * 60);
  });
});
