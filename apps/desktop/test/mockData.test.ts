import { describe, expect, it } from 'vitest';

import { GAME_STATE_VERSION, gameStateSchema, turnReportSchema } from '@republika/shared';

import {
  createMockGameState,
  mockContentHash,
  mockDefinitions,
  mockGameState,
} from '../src/features/mock/mockState';
import { createMockHistory } from '../src/features/mock/mockHistory';

describe('data mock Tahap 1', () => {
  it('state mock lolos schema dan memakai versi state yang benar', () => {
    expect(mockGameState.stateVersion).toBe(GAME_STATE_VERSION);
    expect(gameStateSchema.safeParse(mockGameState).success).toBe(true);
  });

  it('nama presiden dan kabinet dari pelantikan masuk ke state', () => {
    const state = createMockGameState('  Arunika Wicaksana  ', '  Kabinet Uji  ');
    expect(state.presidentName).toBe('Arunika Wicaksana');
    expect(state.cabinetName).toBe('Kabinet Uji');
    expect(gameStateSchema.safeParse(state).success).toBe(true);
  });

  it('setiap laporan kuartal mock lolos schema', () => {
    const reports = createMockHistory(mockGameState.presidentName);
    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      expect(turnReportSchema.safeParse(report).success).toBe(true);
    }
  });

  it('total kursi parlemen tepat seratus dan hash konten stabil', () => {
    const seats = mockDefinitions.factions.reduce((total, faction) => total + faction.seats, 0);
    expect(seats).toBe(100);
    expect(mockContentHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
