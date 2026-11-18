import { SAVE_FORMAT_VERSION, saveFileSchema, settingsSchema } from '@republika/shared';
import { describe, expect, it } from 'vitest';

import { createGameState } from './helpers.js';

function createSaveFile() {
  return {
    saveFormatVersion: SAVE_FORMAT_VERSION,
    appVersion: '0.1.0',
    rulesetVersion: 1,
    contentHash: '3ed0ca9655c713e270679edefd96e843aee0b1e021f0530ffec91b6ad3fe200c',
    savedAt: '2026-11-17T12:00:00.000Z',
    label: 'Kuartal 1',
    playTimeSeconds: 0,
    state: createGameState(),
    history: { reports: [], ledger: [] },
  };
}

describe('saveFileSchema', () => {
  it('menerima save valid', () => {
    expect(saveFileSchema.safeParse(createSaveFile()).success).toBe(true);
  });

  it('menolak rulesetVersion yang tidak cocok dengan state', () => {
    const save = createSaveFile();
    save.rulesetVersion = 2;
    const result = saveFileSchema.safeParse(save);
    expect(result.success).toBe(false);
  });

  it('menolak tanggal bukan ISO', () => {
    const save = createSaveFile();
    save.savedAt = 'kemarin';
    expect(saveFileSchema.safeParse(save).success).toBe(false);
  });
});

describe('settingsSchema', () => {
  it('mengisi default dan menerima skala UI sah', () => {
    expect(settingsSchema.parse({})).toEqual({
      uiScale: 100,
      fullscreen: false,
      lastRunAppVersion: '0.1.0',
      askedAboutPreviousVersion: false,
    });
  });

  it('menolak skala UI di luar daftar', () => {
    expect(settingsSchema.safeParse({ uiScale: 120 }).success).toBe(false);
  });
});
