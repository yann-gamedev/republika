import { BACKGROUND_NONE } from '@republika/shared';

import { isObject } from '../compact.js';

/**
 * Format save v2 → v3 (Tahap 6B): state mendapat profil presiden, janji,
 * kabinet/pimpinan, kuota reshuffle, dan provinsi. Migrator murni tanpa konten:
 * - latar belakang `BG-NONE`, janji kosong (tidak dinilai di laporan akhir);
 * - kabinet, pimpinan, dan provinsi kosong, lalu diisi dari konten oleh
 *   `migrateRuleset` (ruleset 3 menambah konten 6B), seperti fraksi baru.
 */
export function migrateV2ToV3(raw: Record<string, unknown>): Record<string, unknown> {
  const state = isObject(raw.state) ? raw.state : {};
  return {
    ...raw,
    saveFormatVersion: 3,
    state: {
      ...state,
      president: isObject(state.president)
        ? state.president
        : { honorific: 'Bapak', head: 'peci', backgroundId: BACKGROUND_NONE },
      promiseIds: Array.isArray(state.promiseIds) ? state.promiseIds : [],
      cabinet: isObject(state.cabinet) ? state.cabinet : {},
      leaders: isObject(state.leaders) ? state.leaders : {},
      reshuffleUsedTurn: typeof state.reshuffleUsedTurn === 'number' ? state.reshuffleUsedTurn : 0,
      provinces: isObject(state.provinces) ? state.provinces : {},
    },
  };
}
