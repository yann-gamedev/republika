import { describe, expect, it } from 'vitest';

import { COMMAND_ERROR_CODES } from '@republika/simulation';
import type { SaveFile } from '@republika/shared';

import { contentHash, definitions } from '../src/content/gameContent';
import { copy } from '../src/copy/id';
import { MemoryStorage } from '../src/platform/MemoryStorage';
import type { SaveStorage } from '../src/platform/SaveStorage';
import { GameController } from '../src/store/gameController';
import { createGameStore } from '../src/store/gameStore';

function setup(storage: SaveStorage = new MemoryStorage()) {
  const store = createGameStore();
  let counter = 0;
  const controller = new GameController({
    storage,
    definitions,
    contentHash,
    now: () => '2031-01-01T00:00:00.000Z',
    createSeed: () => 'seed-uji',
    createCommandId: () => {
      counter += 1;
      return `cmd-${counter}`;
    },
    store,
  });
  return { controller, store, storage };
}

const firstPolicy = [...definitions.policies]
  .sort((a, b) => (a.id < b.id ? -1 : 1))
  .find((policy) => policy.requirements.length === 0);
if (firstPolicy === undefined) throw new Error('Konten butuh kebijakan tanpa syarat.');

async function answerEvents(controller: GameController): Promise<void> {
  for (const pending of controller.state?.pendingEvents ?? []) {
    const event = definitions.events.find((item) => item.id === pending.eventId);
    const choice = event?.choices.find((item) => item.neutral) ?? event?.choices[0];
    if (choice === undefined) throw new Error('Event tanpa opsi.');
    expect(
      controller.dispatch({
        type: 'RESPOND_EVENT',
        commandId: controller.newCommandId(),
        eventId: pending.eventId,
        choiceId: choice.id,
      }).ok,
    ).toBe(true);
  }
}

describe('GameController', () => {
  it('pelantikan → command → akhir kuartal: state, laporan, dan history sesuai', async () => {
    const { controller, store, storage } = setup();
    expect(
      await controller.startCampaign({ presidentName: '  Sari Wening ', cabinetName: '' }),
    ).toEqual({
      ok: true,
    });
    const inaugurated = store.getState().state;
    expect(inaugurated?.presidentName).toBe('Sari Wening');
    expect(inaugurated?.seed).toBe('seed-uji');
    const autosave = await storage.readSave('autosave');
    expect(autosave.status).toBe('ok');
    if (autosave.status === 'ok') {
      expect(autosave.save.history.reports).toEqual([]);
      expect(autosave.save.label).toBe(copy.controller.saveLabel('Sari Wening', 1));
      expect(autosave.save.contentHash).toBe(contentHash);
    }

    const enact = controller.dispatch({
      type: 'ENACT_POLICY',
      commandId: 'enact-1',
      policyId: firstPolicy.id,
    });
    expect(enact.ok).toBe(true);
    expect(store.getState().state?.actionPointsRemaining).toBe(
      definitions.scenario.actionPointsPerTurn - firstPolicy.apCost,
    );

    expect(await controller.endQuarter()).toEqual({ ok: true });
    const after = store.getState();
    expect(after.state?.turn).toBe(2);
    expect(after.lastReport?.turn).toBe(1);
    expect(after.uiStatus).toBe('idle');
    const history = await controller.loadHistory();
    expect(history.reports.map((report) => report.turn)).toEqual([1]);
    // Cadangan berisi autosave sebelumnya (pelantikan).
    const backup = await storage.readBackup('autosave');
    expect(backup.status === 'ok' ? backup.save.state.turn : null).toBe(1);
    expect(backup.status === 'ok' ? backup.save.history.reports.length : null).toBe(0);
  });

  it('command ganda dengan commandId sama tidak berefek dua kali', async () => {
    const { controller, store } = setup();
    await controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: '' });
    const command = {
      type: 'LOBBY_FACTION' as const,
      commandId: 'lobi-1',
      factionId: definitions.factions[0]?.id ?? '',
    };
    expect(controller.dispatch(command).ok).toBe(true);
    const once = store.getState().state;
    const second = controller.dispatch(command);
    expect(second).toEqual({
      ok: false,
      code: 'DUPLICATE_COMMAND',
      message: copy.commandErrors.DUPLICATE_COMMAND,
    });
    expect(store.getState().state).toBe(once);
    expect(store.getState().toast?.tone).toBe('error');
  });

  it('akhir kuartal ditolak dengan pesan Indonesia selama event belum ditanggapi', async () => {
    const { controller, store } = setup();
    await controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: '' });
    store.setState((current) => ({
      state:
        current.state === null
          ? null
          : {
              ...current.state,
              pendingEvents: [
                {
                  eventId: definitions.events[0]?.id ?? '',
                  arrivedTurn: 1,
                  resolvedChoiceId: null,
                },
              ],
            },
    }));
    const result = await controller.endQuarter();
    expect(result).toMatchObject({ ok: false, code: 'EVENT_RESPONSE_REQUIRED' });
    expect(store.getState().state?.turn).toBe(1);
  });

  it('memainkan seluruh kampanye hingga selesai lalu menolak keputusan baru', async () => {
    const { controller, store } = setup();
    await controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: 'Kabinet Uji' });
    for (let quarter = 1; quarter <= definitions.scenario.maxTurns; quarter += 1) {
      await answerEvents(controller);
      expect((await controller.endQuarter()).ok).toBe(true);
    }
    expect(store.getState().state?.status).toBe('completed');
    expect(store.getState().toast?.message).toBe(copy.controller.campaignCompleted);
    expect((await controller.loadHistory()).reports).toHaveLength(definitions.scenario.maxTurns);
    const late = controller.dispatch({
      type: 'ENACT_POLICY',
      commandId: 'late',
      policyId: firstPolicy.id,
    });
    expect(late).toMatchObject({ ok: false, code: 'GAME_COMPLETED' });
  });

  it('Lanjutkan memuat autosave yang sama di sesi baru', async () => {
    const storage = new MemoryStorage();
    const first = setup(storage);
    await first.controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: '' });
    await answerEvents(first.controller);
    await first.controller.endQuarter();
    const saved = first.store.getState().state;

    const second = setup(storage);
    expect(await second.controller.continueCampaign()).toEqual({ status: 'loaded' });
    expect(second.store.getState().state).toEqual(saved);
    expect(second.store.getState().lastReport?.turn).toBe(1);
  });

  it('autosave rusak → tawarkan cadangan, lalu muat dari cadangan', async () => {
    const storage = new MemoryStorage();
    const first = setup(storage);
    await first.controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: '' });
    await answerEvents(first.controller);
    await first.controller.endQuarter();
    storage.memory.files.set('saves/autosave.json', '{"saveFormatVersion": 1, "potong');

    const second = setup(storage);
    expect(await second.controller.continueCampaign()).toEqual({
      status: 'corrupt',
      hasBackup: true,
    });
    expect(second.store.getState().state).toBeNull();
    expect(await second.controller.continueFromBackup()).toEqual({ status: 'loaded' });
    expect(second.store.getState().state?.turn).toBe(1);
  });

  it('tanpa autosave → missing; ruleset berbeda → incompatible', async () => {
    const { controller } = setup();
    expect(await controller.continueCampaign()).toEqual({ status: 'missing' });

    const storage = new MemoryStorage();
    const first = setup(storage);
    await first.controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: '' });
    const read = await storage.readSave('autosave');
    if (read.status !== 'ok') throw new Error('autosave hilang');
    const future: SaveFile = {
      ...read.save,
      rulesetVersion: 99,
      state: { ...read.save.state, rulesetVersion: 99 },
    };
    await storage.writeSave('slot-1', future);
    const loaded = setup(storage).controller.loadFromSave(future);
    expect(loaded.ok).toBe(false);
  });

  it('autosave gagal tidak membatalkan kuartal, tetapi status dan toast memberi tahu', async () => {
    const storage = new MemoryStorage();
    const { controller, store } = setup(storage);
    await controller.startCampaign({ presidentName: 'Sari Wening', cabinetName: '' });
    await answerEvents(controller);
    storage.memory.writeTextAtomic = async () => {
      throw new Error('disk penuh');
    };
    expect((await controller.endQuarter()).ok).toBe(true);
    expect(store.getState().state?.turn).toBe(2);
    expect(store.getState().uiStatus).toBe('saveFailed');
    expect(store.getState().toast).toMatchObject({
      tone: 'error',
      message: copy.controller.autosaveFailed,
    });
  });

  it('nama presiden tidak valid ditolak tanpa exception', async () => {
    const { controller, store } = setup();
    const result = await controller.startCampaign({ presidentName: 'A', cabinetName: '' });
    expect(result.ok).toBe(false);
    expect(store.getState().state).toBeNull();
  });

  it('tanpa kampanye, command dan akhir kuartal ditolak', async () => {
    const { controller } = setup();
    expect(
      controller.dispatch({ type: 'ENACT_POLICY', commandId: 'x', policyId: firstPolicy.id }),
    ).toMatchObject({
      ok: false,
      message: copy.controller.noCampaign,
    });
    expect(await controller.endQuarter()).toMatchObject({ ok: false });
  });

  it('setiap kode error engine punya pesan di copy', () => {
    for (const code of COMMAND_ERROR_CODES) {
      expect(copy.commandErrors[code].length).toBeGreaterThan(5);
    }
  });
});
