import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { gameStateSchema, type GameState } from '@republika/shared';

import { applyCommand, validateEndQuarter, type PlayerCommand } from '../src/core/commands.js';
import { COMMAND_ERROR_CODES, COMMAND_ERROR_MESSAGES } from '../src/core/errors.js';
import { createInitialState } from '../src/core/initialState.js';
import { evaluateRequirement } from '../src/core/requirements.js';
import {
  EVENT_FLOOD,
  FACTION_PEOPLE,
  FACTION_TECH,
  POLICY_ENERGY,
  POLICY_FISCAL,
  POLICY_SOCIAL,
  defs,
  newState,
  withPolicies,
} from './helpers.js';

function apply(state: GameState, command: PlayerCommand) {
  return applyCommand(state, command, defs);
}

function ok(state: GameState, command: PlayerCommand): GameState {
  const result = apply(state, command);
  expect(result.error).toBeUndefined();
  return result.state;
}

function withEvent(state: GameState): GameState {
  return {
    ...state,
    pendingEvents: [{ eventId: EVENT_FLOOD, arrivedTurn: state.turn, resolvedChoiceId: null }],
  };
}

describe('createInitialState', () => {
  it('menghasilkan state valid sesuai skenario', () => {
    const state = newState();
    expect(gameStateSchema.safeParse(state).success).toBe(true);
    expect(state.actionPointsRemaining).toBe(2);
    expect(state.treasuryBillion).toBe(20_000);
    expect(state.indicators.approval).toBe(580);
    expect(state.factions.map((faction) => faction.factionId)).toEqual([
      'FAC-FX-01',
      'FAC-FX-02',
      'FAC-FX-03',
    ]);
  });

  it('memvalidasi nama presiden, kabinet, dan seed', () => {
    const base = { presidentName: '  Sari  ', seed: 's' };
    expect(createInitialState(defs.scenario, defs, base).presidentName).toBe('Sari');
    expect(createInitialState(defs.scenario, defs, base).cabinetName).toBeUndefined();
    expect(() =>
      createInitialState(defs.scenario, defs, { ...base, presidentName: 'A' }),
    ).toThrow();
    expect(() => createInitialState(defs.scenario, defs, { ...base, seed: '' })).toThrow();
    expect(() =>
      createInitialState(defs.scenario, defs, { ...base, cabinetName: 'x'.repeat(41) }),
    ).toThrow();
  });
});

describe('applyCommand — sukses', () => {
  it('ENACT_POLICY memesan AP dan masuk pending', () => {
    const state = ok(newState(), {
      type: 'ENACT_POLICY',
      commandId: 'c1',
      policyId: POLICY_FISCAL,
    });
    expect(state.actionPointsRemaining).toBe(1);
    expect(state.pendingCommands).toEqual([
      { type: 'ENACT_POLICY', commandId: 'c1', policyId: POLICY_FISCAL, apCost: 1 },
    ]);
    expect(state.commandIdsThisTurn).toEqual(['c1']);
  });

  it('LOBBY_FACTION memesan 1 AP', () => {
    const state = ok(newState(), {
      type: 'LOBBY_FACTION',
      commandId: 'l1',
      factionId: FACTION_TECH,
    });
    expect(state.actionPointsRemaining).toBe(1);
    expect(state.pendingCommands[0]).toMatchObject({ type: 'LOBBY_FACTION', apCost: 1 });
  });

  it('CANCEL_PENDING mengembalikan AP', () => {
    let state = ok(newState(), { type: 'ENACT_POLICY', commandId: 'c1', policyId: POLICY_FISCAL });
    state = ok(state, { type: 'CANCEL_PENDING', commandId: 'x1', pendingCommandId: 'c1' });
    expect(state.actionPointsRemaining).toBe(2);
    expect(state.pendingCommands).toEqual([]);
  });

  it('RESPOND_EVENT biaya 0 AP dan boleh diganti sebelum akhir kuartal', () => {
    let state = withEvent(newState());
    state = ok(state, {
      type: 'RESPOND_EVENT',
      commandId: 'e1',
      eventId: EVENT_FLOOD,
      choiceId: 'A',
    });
    state = ok(state, {
      type: 'RESPOND_EVENT',
      commandId: 'e2',
      eventId: EVENT_FLOOD,
      choiceId: 'B',
    });
    expect(state.actionPointsRemaining).toBe(2);
    expect(state.pendingEvents[0]?.resolvedChoiceId).toBe('B');
  });

  it('tidak memutasi state masukan', () => {
    const state = newState();
    const snapshot = JSON.stringify(state);
    apply(state, { type: 'ENACT_POLICY', commandId: 'c1', policyId: POLICY_FISCAL });
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('applyCommand — kode error', () => {
  const cases: Array<[string, () => { state: GameState; command: PlayerCommand }]> = [
    [
      'CAMPAIGN_COMPLETED',
      () => ({
        state: { ...newState(), status: 'completed' },
        command: { type: 'ENACT_POLICY', commandId: 'c', policyId: POLICY_FISCAL },
      }),
    ],
    [
      'DUPLICATE_COMMAND',
      () => ({
        state: { ...newState(), commandIdsThisTurn: ['c'] },
        command: { type: 'LOBBY_FACTION', commandId: 'c', factionId: FACTION_TECH },
      }),
    ],
    [
      'UNKNOWN_POLICY',
      () => ({
        state: newState(),
        command: { type: 'ENACT_POLICY', commandId: 'c', policyId: 'POL-NOPE-001' },
      }),
    ],
    [
      'ALREADY_ACTIVE',
      () => ({
        state: {
          ...newState(),
          activePolicies: [
            {
              policyId: POLICY_FISCAL,
              enactedTurn: 1,
              remainingTurns: 2,
              perTurnCostBillion: 0,
              lastTickedTurn: 1,
            },
          ],
        },
        command: { type: 'ENACT_POLICY', commandId: 'c', policyId: POLICY_FISCAL },
      }),
    ],
    [
      'ALREADY_PENDING',
      () => ({
        state: ok(newState(), { type: 'ENACT_POLICY', commandId: 'a', policyId: POLICY_FISCAL }),
        command: { type: 'ENACT_POLICY', commandId: 'c', policyId: POLICY_FISCAL },
      }),
    ],
    [
      'ON_COOLDOWN',
      () => ({
        state: { ...newState(), policyCooldowns: { [POLICY_FISCAL]: 1 } },
        command: { type: 'ENACT_POLICY', commandId: 'c', policyId: POLICY_FISCAL },
      }),
    ],
    [
      'CONFLICT',
      () => ({
        // Energi menyatakan konflik dengan Sosial; arah sebaliknya juga berlaku.
        state: ok(newState(), { type: 'ENACT_POLICY', commandId: 'a', policyId: POLICY_ENERGY }),
        command: { type: 'ENACT_POLICY', commandId: 'c', policyId: POLICY_SOCIAL },
      }),
    ],
    [
      'REQUIREMENT_NOT_MET',
      () => ({
        state: { ...newState(), treasuryBillion: 4_999 },
        command: { type: 'ENACT_POLICY', commandId: 'c', policyId: POLICY_SOCIAL },
      }),
    ],
    [
      'INSUFFICIENT_AP',
      () => ({
        state: { ...newState(), actionPointsRemaining: 0 },
        command: { type: 'ENACT_POLICY', commandId: 'c', policyId: POLICY_FISCAL },
      }),
    ],
    [
      'UNKNOWN_FACTION',
      () => ({
        state: newState(),
        command: { type: 'LOBBY_FACTION', commandId: 'c', factionId: 'FAC-NOPE-01' },
      }),
    ],
    [
      'LOBBY_LIMIT',
      () => ({
        state: ok(newState(), { type: 'LOBBY_FACTION', commandId: 'a', factionId: FACTION_TECH }),
        command: { type: 'LOBBY_FACTION', commandId: 'c', factionId: FACTION_TECH },
      }),
    ],
    [
      'UNKNOWN_EVENT',
      () => ({
        state: newState(),
        command: { type: 'RESPOND_EVENT', commandId: 'c', eventId: EVENT_FLOOD, choiceId: 'A' },
      }),
    ],
    [
      'UNKNOWN_CHOICE',
      () => ({
        state: withEvent(newState()),
        command: { type: 'RESPOND_EVENT', commandId: 'c', eventId: EVENT_FLOOD, choiceId: 'Z' },
      }),
    ],
    [
      'UNKNOWN_PENDING_COMMAND',
      () => ({
        state: newState(),
        command: { type: 'CANCEL_PENDING', commandId: 'c', pendingCommandId: 'none' },
      }),
    ],
  ];

  it.each(cases)('%s', (code, build) => {
    const { state, command } = build();
    const result = apply(state, command);
    expect(result.error?.code).toBe(code);
    expect(result.error?.message).toBe(
      COMMAND_ERROR_MESSAGES[code as keyof typeof COMMAND_ERROR_MESSAGES],
    );
    expect(result.state).toBe(state);
  });

  it('LOBBY_LIMIT juga berlaku bila fraksi sudah tercatat di lobbyThisTurn', () => {
    const state = { ...newState(), lobbyThisTurn: [FACTION_PEOPLE] };
    const result = apply(state, {
      type: 'LOBBY_FACTION',
      commandId: 'c',
      factionId: FACTION_PEOPLE,
    });
    expect(result.error?.code).toBe('LOBBY_LIMIT');
  });

  it('INSUFFICIENT_AP untuk lobi tanpa AP', () => {
    const state = { ...newState(), actionPointsRemaining: 0 };
    const result = apply(state, { type: 'LOBBY_FACTION', commandId: 'c', factionId: FACTION_TECH });
    expect(result.error?.code).toBe('INSUFFICIENT_AP');
  });

  it('konflik arah tulis juga diperiksa (Sosial pending → Energi ditolak)', () => {
    const state = ok(newState(), { type: 'ENACT_POLICY', commandId: 'a', policyId: POLICY_SOCIAL });
    const result = apply(state, { type: 'ENACT_POLICY', commandId: 'c', policyId: POLICY_ENERGY });
    expect(result.error?.code).toBe('CONFLICT');
  });

  it('setiap kode error punya pesan Indonesia', () => {
    for (const code of COMMAND_ERROR_CODES) {
      expect(COMMAND_ERROR_MESSAGES[code].length).toBeGreaterThan(5);
    }
  });
});

describe('validateEndQuarter', () => {
  it('menolak bila ada event belum ditanggapi', () => {
    expect(validateEndQuarter(withEvent(newState()), 'end')?.code).toBe('EVENT_RESPONSE_REQUIRED');
  });

  it('menolak commandId duplikat dan kampanye selesai', () => {
    expect(validateEndQuarter({ ...newState(), commandIdsThisTurn: ['end'] }, 'end')?.code).toBe(
      'DUPLICATE_COMMAND',
    );
    expect(validateEndQuarter({ ...newState(), status: 'completed' }, 'end')?.code).toBe(
      'CAMPAIGN_COMPLETED',
    );
  });

  it('menerima state tanpa event pending', () => {
    expect(validateEndQuarter(newState(), 'end')).toBeNull();
  });
});

describe('evaluateRequirement', () => {
  it('mengevaluasi semua tipe requirement', () => {
    const state: GameState = {
      ...newState(),
      flags: ['FX_FLAG'],
      activePolicies: [
        {
          policyId: POLICY_FISCAL,
          enactedTurn: 1,
          remainingTurns: 1,
          perTurnCostBillion: 0,
          lastTickedTurn: 1,
        },
      ],
    };
    expect(
      evaluateRequirement(state, {
        type: 'INDICATOR_AT_LEAST',
        target: 'approval',
        valueTenths: 580,
      }),
    ).toBe(true);
    expect(
      evaluateRequirement(state, {
        type: 'INDICATOR_AT_LEAST',
        target: 'approval',
        valueTenths: 581,
      }),
    ).toBe(false);
    expect(
      evaluateRequirement(state, {
        type: 'INDICATOR_AT_MOST',
        target: 'approval',
        valueTenths: 580,
      }),
    ).toBe(true);
    expect(
      evaluateRequirement(state, {
        type: 'INDICATOR_AT_MOST',
        target: 'approval',
        valueTenths: 579,
      }),
    ).toBe(false);
    expect(evaluateRequirement(state, { type: 'TREASURY_AT_LEAST', valueBillion: 20_000 })).toBe(
      true,
    );
    expect(evaluateRequirement(state, { type: 'POLICY_ACTIVE', policyId: POLICY_FISCAL })).toBe(
      true,
    );
    expect(evaluateRequirement(state, { type: 'POLICY_NOT_ACTIVE', policyId: POLICY_FISCAL })).toBe(
      false,
    );
    expect(evaluateRequirement(state, { type: 'FLAG_SET', flag: 'FX_FLAG' })).toBe(true);
    expect(evaluateRequirement(state, { type: 'FLAG_NOT_SET', flag: 'FX_FLAG' })).toBe(false);
    expect(evaluateRequirement(state, { type: 'TURN_AT_LEAST', value: 2 })).toBe(false);
  });
});

describe('property: AP selalu dalam batas', () => {
  const policyIds = [POLICY_ENERGY, POLICY_FISCAL, POLICY_SOCIAL, 'POL-NOPE-001'];
  const factionIds = defs.factions.map((faction) => faction.id);
  const commandArb = fc.oneof(
    fc.record({ kind: fc.constant('enact' as const), id: fc.constantFrom(...policyIds) }),
    fc.record({ kind: fc.constant('lobby' as const), id: fc.constantFrom(...factionIds) }),
    fc.record({ kind: fc.constant('cancel' as const), id: fc.nat(10) }),
    fc.record({ kind: fc.constant('respond' as const), id: fc.constantFrom('A', 'B', 'Z') }),
  );

  it('urutan command acak tidak membuat AP negatif atau melebihi batas', () => {
    // Kebijakan dengan AP 2 ikut diuji agar batas tidak hanya diuji dengan biaya 1.
    const heavyDefs = withPolicies((policies) =>
      policies.map((policy) => (policy.id === POLICY_FISCAL ? { ...policy, apCost: 2 } : policy)),
    );
    fc.assert(
      fc.property(fc.array(commandArb, { maxLength: 30 }), (script) => {
        let state = withEvent(newState());
        script.forEach((step, index) => {
          const commandId = `cmd-${index}`;
          let command: PlayerCommand;
          if (step.kind === 'enact')
            command = { type: 'ENACT_POLICY', commandId, policyId: step.id };
          else if (step.kind === 'lobby')
            command = { type: 'LOBBY_FACTION', commandId, factionId: step.id };
          else if (step.kind === 'respond')
            command = { type: 'RESPOND_EVENT', commandId, eventId: EVENT_FLOOD, choiceId: step.id };
          else command = { type: 'CANCEL_PENDING', commandId, pendingCommandId: `cmd-${step.id}` };
          state = applyCommand(state, command, heavyDefs).state;
          expect(state.actionPointsRemaining).toBeGreaterThanOrEqual(0);
          expect(state.actionPointsRemaining).toBeLessThanOrEqual(state.actionPointsPerTurn);
          const reserved = state.pendingCommands.reduce((sum, pending) => sum + pending.apCost, 0);
          expect(reserved + state.actionPointsRemaining).toBe(state.actionPointsPerTurn);
        });
        expect(gameStateSchema.safeParse(state).success).toBe(true);
      }),
    );
  });
});
