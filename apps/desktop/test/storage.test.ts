import { describe, expect, it } from 'vitest';

import { APP_VERSION, SAVE_FORMAT_VERSION, saveFileSchema, type SaveFile } from '@republika/shared';

import { MemoryStorage } from '../src/platform/MemoryStorage';
import { createMockHistory } from '../src/features/mock/mockHistory';
import { mockContentHash, mockGameState } from '../src/features/mock/mockState';
import { validateInauguration } from '../src/features/inauguration/validation';

function createSave(): SaveFile {
  return saveFileSchema.parse({
    saveFormatVersion: SAVE_FORMAT_VERSION,
    appVersion: APP_VERSION,
    rulesetVersion: mockGameState.rulesetVersion,
    contentHash: mockContentHash,
    savedAt: '2026-01-01T00:00:00.000Z',
    label: 'Kampanye contoh',
    state: mockGameState,
    history: {
      reports: createMockHistory(mockGameState.presidentName),
      ledger: [],
    },
  });
}

describe('MemoryStorage', () => {
  it('menulis, membaca, dan mendaftar save tanpa berbagi referensi', async () => {
    const storage = new MemoryStorage();
    const save = createSave();

    await storage.writeSave('slot-1', save);
    const read = await storage.readSave('slot-1');
    expect(read).toEqual({ status: 'ok', save });

    if (read.status !== 'ok') throw new Error('Save seharusnya ada.');
    read.save.label = 'Diubah di memori';
    const again = await storage.readSave('slot-1');
    expect(again.status === 'ok' ? again.save.label : null).toBe('Kampanye contoh');

    const slots = await storage.listSlots();
    expect(slots).toHaveLength(1);
    expect(slots[0]?.slot).toBe('slot-1');
    expect(slots[0]?.turn).toBe(mockGameState.turn);
  });

  it('menyimpan pengaturan dan mengembalikan null untuk slot kosong', async () => {
    const storage = new MemoryStorage();
    expect(await storage.readSave('slot-2')).toEqual({ status: 'missing' });
    expect(await storage.readSettings()).toBeNull();

    const settings = {
      uiScale: 110 as const,
      fullscreen: false,
      lastRunAppVersion: APP_VERSION,
      askedAboutPreviousVersion: false,
    };
    await storage.writeSettings(settings);
    expect(await storage.readSettings()).toEqual(settings);
  });
});

describe('validasi pelantikan', () => {
  it('menerima nama valid dan memangkas spasi di pemanggil', () => {
    expect(validateInauguration({ presidentName: 'Arunika', cabinetName: '' })).toEqual({});
  });

  it('menolak nama kosong, terlalu pendek, dan karakter kontrol', () => {
    expect(validateInauguration({ presidentName: '   ', cabinetName: '' })).toHaveProperty(
      'presidentName',
    );
    expect(validateInauguration({ presidentName: 'A', cabinetName: '' })).toHaveProperty(
      'presidentName',
    );
    expect(validateInauguration({ presidentName: 'An\u0000i', cabinetName: '' })).toHaveProperty(
      'presidentName',
    );
  });

  it('menolak nama kabinet lebih dari empat puluh karakter', () => {
    expect(
      validateInauguration({ presidentName: 'Arunika', cabinetName: 'x'.repeat(41) }),
    ).toHaveProperty('cabinetName');
  });
});
