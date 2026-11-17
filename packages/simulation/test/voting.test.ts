import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type {
  FactionDefinition,
  GameDefinitions,
  GameState,
  PendingCommand,
} from '@republika/shared';

import { cloneState } from '../src/core/clone.js';
import { Ledger } from '../src/core/ledger.js';
import {
  applyLobbies,
  predictVote,
  resolveVotes,
  VOTE_FAIL_COOLDOWN_TURNS,
} from '../src/politics/voting.js';
import {
  FACTION_PEOPLE,
  FACTION_REGION,
  FACTION_TECH,
  POLICY_ENERGY,
  POLICY_FISCAL,
  POLICY_SOCIAL,
  defs,
  newState,
} from './helpers.js';

function faction(
  id: string,
  seats: number,
  supportTenths: number,
  fiscalPref = 0,
): FactionDefinition {
  return {
    id,
    version: 1,
    name: `Fraksi ${id}`,
    shortName: id.slice(-2),
    seats,
    color: '#000000',
    ideologyTags: ['uji'],
    baseSupportTenths: supportTenths,
    initialSupportTenths: supportTenths,
    policyPreferences: { FISCAL: fiscalPref, SOCIAL: 0, ENERGY: 0, GOVERNANCE: 0 },
    description: '',
  };
}

function twoFactionDefs(yesSeats: number): GameDefinitions {
  return {
    ...defs,
    factions: [faction('FAC-T-01', yesSeats, 500), faction('FAC-T-02', 100 - yesSeats, 499)],
  };
}

function stateFor(d: GameDefinitions): GameState {
  return {
    ...newState(),
    factions: d.factions.map((f) => ({ factionId: f.id, supportTenths: f.initialSupportTenths })),
  };
}

const enact = (policyId: string, commandId = policyId): PendingCommand => ({
  type: 'ENACT_POLICY',
  commandId,
  policyId,
  apCost: 1,
});

describe('predictVote', () => {
  it('tepat 51 kursi lolos, 50 gagal', () => {
    const d51 = twoFactionDefs(51);
    expect(predictVote(stateFor(d51), POLICY_FISCAL, d51).passed).toBe(true);
    const d50 = twoFactionDefs(50);
    const prediction = predictVote(stateFor(d50), POLICY_FISCAL, d50);
    expect(prediction.yesSeats).toBe(50);
    expect(prediction.passed).toBe(false);
  });

  it('skor 50,0 setuju, 49,9 menolak', () => {
    const d = twoFactionDefs(60);
    const byFaction = predictVote(stateFor(d), POLICY_FISCAL, d).byFaction;
    expect(byFaction.map((f) => [f.scoreTenths, f.vote])).toEqual([
      [500, 'FOR'],
      [499, 'AGAINST'],
    ]);
  });

  it('preferensi kategori × 10 masuk ke skor', () => {
    const prediction = predictVote(newState(), POLICY_FISCAL, defs);
    // Teknokrat 55 + 2×10 = 75, Kerakyatan 48 − 10 = 38, Daerah 45 + 0 = 45.
    expect(prediction.byFaction.map((f) => f.scoreTenths)).toEqual([750, 380, 450]);
    expect(prediction.yesSeats).toBe(30);
  });

  it('lobi membalikkan fraksi di ambang batas', () => {
    const before = predictVote(newState(), POLICY_FISCAL, defs);
    expect(before.passed).toBe(false);
    const after = predictVote(newState(), POLICY_FISCAL, defs, { [FACTION_REGION]: 150 });
    expect(after.byFaction.find((f) => f.factionId === FACTION_REGION)?.vote).toBe('FOR');
    expect(after.yesSeats).toBe(62);
    expect(after.passed).toBe(true);
  });

  it('memakai dukungan awal bila fraksi tidak ada di state dan menolak kebijakan tak dikenal', () => {
    const state = { ...newState(), factions: [] };
    expect(predictVote(state, POLICY_SOCIAL, defs).yesSeats).toBe(70);
    expect(() => predictVote(newState(), 'POL-NOPE-001', defs)).toThrow();
  });

  it('property: total kursi selalu 100', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 3, maxLength: 3 }),
        fc.array(fc.integer({ min: 0, max: 300 }), { minLength: 3, maxLength: 3 }),
        fc.constantFrom(POLICY_ENERGY, POLICY_FISCAL, POLICY_SOCIAL),
        (supports, bonuses, policyId) => {
          const state = newState();
          state.factions = state.factions.map((f, i) => ({
            ...f,
            supportTenths: supports[i] ?? 0,
          }));
          const lobby = Object.fromEntries(
            [FACTION_TECH, FACTION_PEOPLE, FACTION_REGION].map((id, i) => [id, bonuses[i] ?? 0]),
          );
          const prediction = predictVote(state, policyId, defs, lobby);
          expect(prediction.yesSeats + prediction.noSeats).toBe(100);
          expect(prediction.passed).toBe(prediction.yesSeats >= 51);
        },
      ),
    );
  });
});

describe('applyLobbies', () => {
  it('memotong kas, mencatat bonus, dan urut factionId', () => {
    const work = cloneState(newState());
    const ledger = new Ledger(1);
    const bonuses = applyLobbies(
      work,
      [
        { type: 'LOBBY_FACTION', commandId: 'b', factionId: FACTION_REGION, apCost: 1 },
        { type: 'LOBBY_FACTION', commandId: 'a', factionId: FACTION_TECH, apCost: 1 },
        enact(POLICY_FISCAL),
      ],
      defs,
      ledger,
    );
    expect(bonuses).toEqual({ [FACTION_TECH]: 150, [FACTION_REGION]: 150 });
    expect(work.treasuryBillion).toBe(16_000);
    expect(work.lobbyThisTurn).toEqual([FACTION_TECH, FACTION_REGION]);
    expect(work.campaignStats.lobbies).toBe(2);
    expect(ledger.entries.map((e) => [e.reasonCode, e.sourceId])).toEqual([
      ['LOBBY_COST', FACTION_TECH],
      ['LOBBY_BONUS', FACTION_TECH],
      ['LOBBY_COST', FACTION_REGION],
      ['LOBBY_BONUS', FACTION_REGION],
    ]);
    // Bonus lobi tidak mengubah dukungan permanen fraksi.
    expect(work.factions).toEqual(newState().factions);
  });
});

describe('resolveVotes', () => {
  it('urut policyId: tanpa voting langsung aktif, lolos aktif, gagal kena penalti', () => {
    const work = cloneState(newState());
    const ledger = new Ledger(1);
    const result = resolveVotes(
      work,
      [enact(POLICY_FISCAL), enact(POLICY_ENERGY), enact(POLICY_SOCIAL)],
      defs,
      {},
      ledger,
    );
    expect(result.passed).toEqual([POLICY_ENERGY, POLICY_SOCIAL]);
    expect(result.failed).toEqual([POLICY_FISCAL]);
    expect(result.outcomes.map((o) => o.policyId)).toEqual([POLICY_FISCAL, POLICY_SOCIAL]);
    expect(work.activePolicies.map((p) => p.policyId)).toEqual([POLICY_ENERGY, POLICY_SOCIAL]);
    expect(work.indicators.trust).toBe(520 - 20);
    expect(work.policyCooldowns).toEqual({ [POLICY_FISCAL]: VOTE_FAIL_COOLDOWN_TURNS });
    expect(work.treasuryBillion).toBe(20_000); // voting gagal tidak memotong kas
    expect(work.campaignStats).toMatchObject({ votesHeld: 2, votesFailed: 1, policiesEnacted: 2 });
    expect(ledger.entries.map((e) => e.reasonCode)).toEqual([
      'POLICY_ENACTED',
      'VOTE_FAILED',
      'VOTE_FAILED',
      'VOTE_PASSED',
      'POLICY_ENACTED',
    ]);
    expect(ledger.entries[2]).toMatchObject({ kind: 'INDICATOR', target: 'trust', delta: -20 });
  });

  it('bonus lobi membuat kebijakan fiskal lolos', () => {
    const work = cloneState(newState());
    const result = resolveVotes(
      work,
      [enact(POLICY_FISCAL)],
      defs,
      { [FACTION_REGION]: 150 },
      new Ledger(1),
    );
    expect(result.passed).toEqual([POLICY_FISCAL]);
  });

  it('pengajuan kebijakan tak dikenal diabaikan', () => {
    const work = cloneState(newState());
    const result = resolveVotes(work, [enact('POL-NOPE-001')], defs, {}, new Ledger(1));
    expect(result.passed).toEqual([]);
    expect(result.failed).toEqual([]);
  });
});
