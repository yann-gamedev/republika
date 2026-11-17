import { describe, expect, it } from 'vitest';

import type { EffectRule, GameState } from '@republika/shared';

import { cloneState } from '../src/core/clone.js';
import { indexDefinitions } from '../src/core/definitions.js';
import { Ledger } from '../src/core/ledger.js';
import {
  applyEffectNow,
  effectTiming,
  indicatorMultiplier,
  ministryMultiplier,
  type EffectSource,
} from '../src/policies/effects.js';
import { FACTION_PEOPLE, FACTION_REGION, FACTION_TECH, defs, newState } from './helpers.js';

const index = indexDefinitions(defs);
const EVENT_SOURCE: EffectSource = { sourceType: 'EVENT', sourceId: 'EVT-FX-001' };

function run(
  effect: EffectRule,
  source: EffectSource = EVENT_SOURCE,
  start: GameState = newState(),
) {
  const work = cloneState(start);
  const ledger = new Ledger(start.turn);
  applyEffectNow(work, effect, source, { snapshot: start, index, ledger });
  return { work, entries: ledger.entries };
}

function withMinistry(state: GameState, ministryId: string, effectiveness: number): GameState {
  return {
    ...state,
    ministries: state.ministries.map((ministry) =>
      ministry.ministryId === ministryId ? { ...ministry, effectiveness } : ministry,
    ),
  };
}

describe('applyEffectNow — tiap tipe efek', () => {
  it('MODIFY_INDICATOR mencatat before/delta/after', () => {
    const { work, entries } = run({
      type: 'MODIFY_INDICATOR',
      target: 'approval',
      deltaTenths: -30,
      timing: 'IMMEDIATE',
      reasonCode: 'TEST_DROP',
    });
    expect(work.indicators.approval).toBe(550);
    expect(entries).toEqual([
      {
        id: 'T01-0000',
        turn: 1,
        order: 0,
        sourceType: 'EVENT',
        sourceId: 'EVT-FX-001',
        kind: 'INDICATOR',
        reasonCode: 'TEST_DROP',
        target: 'approval',
        unit: 'tenths',
        before: 580,
        delta: -30,
        after: 550,
      },
    ]);
  });

  it('MODIFY_TREASURY dalam miliar', () => {
    const { work, entries } = run({
      type: 'MODIFY_TREASURY',
      deltaBillion: -4_000,
      reasonCode: 'TEST_COST',
    });
    expect(work.treasuryBillion).toBe(16_000);
    expect(entries[0]).toMatchObject({
      kind: 'TREASURY',
      unit: 'billion',
      before: 20_000,
      after: 16_000,
    });
  });

  it('CHANGE_FACTION_SUPPORT per ideologyTag diterapkan ke fraksi terurut ID', () => {
    const { work, entries } = run({
      type: 'CHANGE_FACTION_SUPPORT',
      target: { kind: 'ideologyTag', ideologyTag: 'populis' },
      deltaTenths: -50,
      reasonCode: 'TEST_TAG',
    });
    expect(entries.map((entry) => entry.target)).toEqual([FACTION_PEOPLE, FACTION_REGION]);
    expect(entries.map((entry) => entry.order)).toEqual([0, 1]);
    expect(work.factions.find((f) => f.factionId === FACTION_TECH)?.supportTenths).toBe(550);
    expect(work.factions.find((f) => f.factionId === FACTION_PEOPLE)?.supportTenths).toBe(430);
  });

  it('CHANGE_FACTION_SUPPORT per factionId', () => {
    const { entries } = run({
      type: 'CHANGE_FACTION_SUPPORT',
      target: { kind: 'faction', factionId: FACTION_TECH },
      deltaTenths: 20,
      reasonCode: 'TEST_ONE',
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ target: FACTION_TECH, before: 550, after: 570 });
  });

  it('CHANGE_FACTION_SUPPORT ke fraksi yang tidak ada di state tidak mengubah apa pun', () => {
    const start = { ...newState(), factions: [] };
    const { entries } = run(
      {
        type: 'CHANGE_FACTION_SUPPORT',
        target: { kind: 'faction', factionId: FACTION_TECH },
        deltaTenths: 20,
        reasonCode: 'TEST_ONE',
      },
      EVENT_SOURCE,
      start,
    );
    expect(entries).toEqual([]);
  });

  it('MODIFY_MINISTRY_EFFECTIVENESS dalam poin', () => {
    const { work, entries } = run({
      type: 'MODIFY_MINISTRY_EFFECTIVENESS',
      ministryId: 'MIN-FX-ENERGY',
      delta: 2,
      reasonCode: 'TEST_MIN',
    });
    expect(work.ministries.find((m) => m.ministryId === 'MIN-FX-ENERGY')?.effectiveness).toBe(57);
    expect(entries[0]).toMatchObject({ kind: 'MINISTRY', unit: 'points', delta: 2 });
    expect(
      run({
        type: 'MODIFY_MINISTRY_EFFECTIVENESS',
        ministryId: 'MIN-NOPE-X',
        delta: 2,
        reasonCode: 'TEST_MIN',
      }).entries,
    ).toEqual([]);
  });

  it('SET_FLAG dan CLEAR_FLAG idempoten', () => {
    const set = run({ type: 'SET_FLAG', flag: 'FX_TEST', reasonCode: 'TEST_SET' });
    expect(set.work.flags).toEqual(['FX_TEST']);
    expect(set.entries[0]).toMatchObject({ kind: 'FLAG', before: 0, after: 1 });
    const again = run(
      { type: 'SET_FLAG', flag: 'FX_TEST', reasonCode: 'TEST_SET' },
      EVENT_SOURCE,
      set.work,
    );
    expect(again.entries).toEqual([]);
    const clear = run(
      { type: 'CLEAR_FLAG', flag: 'FX_TEST', reasonCode: 'TEST_CLEAR' },
      EVENT_SOURCE,
      set.work,
    );
    expect(clear.work.flags).toEqual([]);
    expect(clear.entries[0]).toMatchObject({ before: 1, delta: -1, after: 0 });
    expect(run({ type: 'CLEAR_FLAG', flag: 'FX_TEST', reasonCode: 'TEST_CLEAR' }).entries).toEqual(
      [],
    );
  });

  it('effectTiming: hanya indikator yang punya timing', () => {
    expect(effectTiming({ type: 'MODIFY_TREASURY', deltaBillion: 1, reasonCode: 'TEST_X' })).toBe(
      'IMMEDIATE',
    );
    expect(
      effectTiming({
        type: 'MODIFY_INDICATOR',
        target: 'trust',
        deltaTenths: 1,
        timing: 'PER_TURN',
        reasonCode: 'TEST_X',
      }),
    ).toBe('PER_TURN');
  });
});

describe('pengali kementerian (AGENT §5.6)', () => {
  const effect: EffectRule = {
    type: 'MODIFY_INDICATOR',
    target: 'welfare',
    deltaTenths: 40,
    timing: 'IMMEDIATE',
    reasonCode: 'TEST_SOCIAL',
  };
  const policySource: EffectSource = {
    sourceType: 'POLICY',
    sourceId: 'POL-SOCIAL-FX-001',
    category: 'SOCIAL',
  };

  it.each([
    [40, 0.8, 32],
    [65, 1.0, 40],
    [90, 1.2, 48],
  ])('eff %i → pengali %f → delta %i', (effectiveness, multiplier, expected) => {
    expect(ministryMultiplier(effectiveness)).toBeCloseTo(multiplier, 12);
    const start = withMinistry(newState(), 'MIN-FX-SOCIAL', effectiveness);
    expect(run(effect, policySource, start).entries[0]?.delta).toBe(expected);
  });

  it('membulatkan setelah pengali (half away from zero)', () => {
    // eff 50 → (60+50)/125 = 0,88. 0,5 × 0,88 = 0,44 → 0,4; −2,5 × 0,88 = −2,2.
    const start = withMinistry(newState(), 'MIN-FX-SOCIAL', 50);
    expect(run({ ...effect, deltaTenths: 5 }, policySource, start).entries[0]?.delta).toBe(4);
    expect(run({ ...effect, deltaTenths: -25 }, policySource, start).entries[0]?.delta).toBe(-22);
  });

  it('tidak berlaku untuk sumber EVENT maupun efek non-indikator', () => {
    const start = withMinistry(newState(), 'MIN-FX-SOCIAL', 90);
    expect(run(effect, EVENT_SOURCE, start).entries[0]?.delta).toBe(40);
    const treasury = run(
      { type: 'MODIFY_TREASURY', deltaBillion: -6_000, reasonCode: 'TEST_COST' },
      policySource,
      start,
    );
    expect(treasury.entries[0]?.delta).toBe(-6_000);
  });

  it('kategori tanpa kementerian atau kementerian hilang dari state → pengali 1', () => {
    const noMinistry = { ...newState(), ministries: [] };
    expect(indicatorMultiplier('welfare', policySource, noMinistry, index)).toBe(1);
    const otherIndex = indexDefinitions({ ...defs, ministries: [] });
    expect(indicatorMultiplier('welfare', policySource, newState(), otherIndex)).toBe(1);
  });
});

describe('modifier bersyarat', () => {
  const source: EffectSource = {
    sourceType: 'POLICY',
    sourceId: 'POL-ENERGY-FX-001',
    category: 'ENERGY',
    modifiers: [
      {
        when: [{ type: 'INDICATOR_AT_LEAST', target: 'inflationPct', valueTenths: 50 }],
        appliesTo: 'approval',
        multiplier: 1.5,
      },
    ],
  };
  const approvalDrop: EffectRule = {
    type: 'MODIFY_INDICATOR',
    target: 'approval',
    deltaTenths: -40,
    timing: 'IMMEDIATE',
    reasonCode: 'TEST_FUEL',
  };

  it('dievaluasi terhadap snapshot awal giliran, bukan state kerja', () => {
    // Energi eff 65 → pengali kementerian 1,0 agar hanya modifier yang diuji.
    const snapshot = withMinistry(newState(), 'MIN-FX-ENERGY', 65);
    const work = cloneState(snapshot);
    work.indicators.inflationPct = 80; // state kerja memenuhi syarat, snapshot tidak (3,4)
    const ledger = new Ledger(1);
    applyEffectNow(work, approvalDrop, source, { snapshot, index, ledger });
    expect(ledger.entries[0]?.delta).toBe(-40);

    const hotSnapshot = { ...snapshot, indicators: { ...snapshot.indicators, inflationPct: 50 } };
    const work2 = cloneState(newState());
    const ledger2 = new Ledger(1);
    applyEffectNow(work2, approvalDrop, source, { snapshot: hotSnapshot, index, ledger: ledger2 });
    expect(ledger2.entries[0]?.delta).toBe(-60);
  });

  it('hanya berlaku pada indikator appliesTo', () => {
    const snapshot = withMinistry(
      { ...newState(), indicators: { ...newState().indicators, inflationPct: 60 } },
      'MIN-FX-ENERGY',
      65,
    );
    expect(indicatorMultiplier('trust', source, snapshot, index)).toBe(1);
    expect(indicatorMultiplier('approval', source, snapshot, index)).toBe(1.5);
  });
});
