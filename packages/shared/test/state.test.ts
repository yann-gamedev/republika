import { gameCommandSchema, gameStateSchema, presidentNameSchema } from '@republika/shared';
import { describe, expect, it } from 'vitest';

import { createGameState } from './helpers.js';

describe('gameStateSchema', () => {
  it('menerima state valid', () => {
    expect(gameStateSchema.safeParse(createGameState()).success).toBe(true);
  });

  it('menolak indikator di luar domain', () => {
    const state = createGameState();
    state.indicators.approval = 1001;
    const result = gameStateSchema.safeParse(state);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join('.') === 'indicators.approval'),
      ).toBe(true);
    }
  });

  it('menolak AP tersisa melebihi AP per kuartal', () => {
    const state = createGameState();
    state.actionPointsRemaining = 3;
    expect(gameStateSchema.safeParse(state).success).toBe(false);
  });

  it('menolak nama presiden dengan karakter kontrol', () => {
    expect(presidentNameSchema.safeParse('Arunika\u0000').success).toBe(false);
  });
});

describe('gameCommandSchema', () => {
  it('menerima command END_QUARTER', () => {
    expect(gameCommandSchema.safeParse({ type: 'END_QUARTER', commandId: 'cmd-1' }).success).toBe(
      true,
    );
  });

  it('menolak command tanpa commandId', () => {
    expect(gameCommandSchema.safeParse({ type: 'END_QUARTER' }).success).toBe(false);
  });

  it('menerima RESPOND_EVENT dengan biaya 0 AP secara tipe', () => {
    const command = gameCommandSchema.parse({
      type: 'RESPOND_EVENT',
      commandId: 'cmd-2',
      eventId: 'EVT-PLACEHOLDER-001',
      choiceId: 'A',
    });
    expect(command.type).toBe('RESPOND_EVENT');
  });
});
