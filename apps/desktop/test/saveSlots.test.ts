import { describe, expect, it } from 'vitest';

import { hashState } from '@republika/simulation';

import { contentHash, definitions } from '../src/content/gameContent';
import { MemoryStorage } from '../src/platform/MemoryStorage';
import { GameController } from '../src/store/gameController';
import { createGameStore } from '../src/store/gameStore';

function setup(storage = new MemoryStorage()) {
  const store = createGameStore();
  let counter = 0;
  let clock = 0;
  const controller = new GameController({
    storage,
    definitions,
    contentHash,
    now: () => new Date(Date.UTC(2031, 0, 1, 0, 0, clock++)).toISOString(),
    createSeed: () => 'seed-slot',
    createCommandId: () => `cmd-${++counter}`,
    store,
  });
  return { controller, store, storage };
}

async function playQuarters(controller: GameController, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    for (const pending of controller.state?.pendingEvents ?? []) {
      const event = definitions.events.find((item) => item.id === pending.eventId);
      const choice = event?.choices.find((item) => item.neutral) ?? event?.choices[0];
      controller.dispatch({
        type: 'RESPOND_EVENT',
        commandId: controller.newCommandId(),
        eventId: pending.eventId,
        choiceId: choice?.id ?? 'A',
      });
    }
    expect((await controller.endQuarter()).ok).toBe(true);
  }
}

describe('slot manual', () => {
  it('simpan → main 2 kuartal → muat slot: hash state sama dan slot lain tidak berubah', async () => {
    const { controller, store, storage } = setup();
    await controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: 'Kabinet Uji' });
    await playQuarters(controller, 1);
    await controller.saveToSlot('slot-2', 'Pembanding');
    expect((await controller.saveToSlot('slot-1')).ok).toBe(true);
    const savedHash = hashState(store.getState().state);
    const otherBefore = storage.memory.files.get('saves/slot-2.json');

    await playQuarters(controller, 2);
    expect(hashState(store.getState().state)).not.toBe(savedHash);

    expect(await controller.loadSlot('slot-1')).toEqual({ status: 'loaded' });
    expect(hashState(store.getState().state)).toBe(savedHash);
    expect(storage.memory.files.get('saves/slot-2.json')).toBe(otherBefore);

    // Autosave mengikuti titik yang dimuat, jadi riwayat dan "Lanjutkan" konsisten.
    const history = await controller.loadHistory();
    expect(history.reports.map((report) => report.turn)).toEqual([1]);
    const autosave = await storage.readSave('autosave');
    expect(autosave.status === 'ok' ? hashState(autosave.save.state) : null).toBe(savedHash);
  });

  it('label bawaan, info slot, ganti nama, dan hapus ke trash', async () => {
    const { controller, storage } = setup();
    await controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: 'Kabinet Uji' });
    await controller.saveToSlot('slot-3');
    let slots = await controller.listSlots();
    const info = slots.find((slot) => slot.slot === 'slot-3');
    expect(info).toMatchObject({
      label: 'Presiden Sari Wening — Kabinet Uji — Kuartal 1',
      appVersion: expect.any(String),
      turn: 1,
      cabinetName: 'Kabinet Uji',
      summary: {
        approval: expect.any(Number),
        fiscalHealth: expect.any(Number),
        trust: expect.any(Number),
      },
    });

    expect((await controller.renameSlot('slot-3', '  Sebelum reformasi  ')).ok).toBe(true);
    slots = await controller.listSlots();
    expect(slots.find((slot) => slot.slot === 'slot-3')?.label).toBe('Sebelum reformasi');
    expect((await controller.renameSlot('slot-3', '   ')).ok).toBe(false);

    expect((await controller.deleteSlot('slot-3')).ok).toBe(true);
    slots = await controller.listSlots();
    expect(slots.some((slot) => slot.slot === 'slot-3')).toBe(false);
    const trashed = [...storage.memory.files.keys()].filter((key) =>
      key.startsWith('saves/trash/'),
    );
    expect(trashed).toHaveLength(1);
    expect(trashed[0]).toMatch(/^saves\/trash\/slot-3-.+\.json$/u);
  });

  it('perubahan belum tersimpan terdeteksi setelah keputusan kuartal ini', async () => {
    const { controller } = setup();
    await controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: '' });
    expect(controller.hasUnsavedChanges()).toBe(false);
    controller.dispatch({
      type: 'LOBBY_FACTION',
      commandId: controller.newCommandId(),
      factionId: definitions.factions[0]?.id ?? '',
    });
    expect(controller.hasUnsavedChanges()).toBe(true);
  });

  it('slot kosong atau rusak tidak bisa dimuat dan tidak mengubah state', async () => {
    const { controller, store, storage } = setup();
    await controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: '' });
    const before = store.getState().state;
    expect(await controller.loadSlot('slot-4')).toEqual({ status: 'missing' });
    storage.memory.files.set('saves/slot-5.json', '{rusak');
    expect((await controller.loadSlot('slot-5')).status).toBe('corrupt');
    expect(store.getState().state).toBe(before);
    expect((await controller.listSlots()).find((slot) => slot.slot === 'slot-5')?.isCorrupt).toBe(
      true,
    );
  });
});
