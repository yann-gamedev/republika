import { describe, expect, it } from 'vitest';

import { ARCHETYPE_STAT_NAMES, parseArchetypeStat, type GameState } from '@republika/shared';

import { cloneState } from '../src/core/clone.js';
import {
  accumulateIndicatorStats,
  archetypeStatValue,
  evaluateArchetype,
} from '../src/report/archetype.js';
import { chronology, topDecisions } from '../src/report/finalSummary.js';
import { defs, newState } from './helpers.js';
import { runScript } from './scenario.js';

/** State "netral" yang tidak memicu arketipe mana pun selain fallback. */
function neutral(): GameState {
  const state = cloneState(newState());
  state.indicators.fiscalHealth = 500;
  state.indicators.approval = 500;
  state.indicators.trust = 500;
  state.treasuryBillion = 5_000;
  state.campaignStats.quartersPlayed = 0;
  return state;
}

describe('evaluateArchetype — tiap aturan fixture punya state pemicu', () => {
  const cases: Array<[string, (state: GameState) => void]> = [
    [
      'ARC-FX-AUSTERITY',
      (state) => {
        state.indicators.fiscalHealth = 650;
        state.treasuryBillion = 25_000;
      },
    ],
    [
      'ARC-FX-POPULIST',
      (state) => {
        state.campaignStats.quartersPlayed = 2;
        state.campaignStats.indicatorSums.approval = 1_200; // rata-rata 60
        state.campaignStats.policiesByCategory.SOCIAL = 1;
      },
    ],
    [
      'ARC-FX-NEGOTIATOR',
      (state) => {
        state.campaignStats.lobbies = 3;
        state.campaignStats.votesFailed = 1;
        state.campaignStats.votesHeld = 4;
      },
    ],
    [
      'ARC-FX-CRISIS',
      (state) => {
        state.campaignStats.indicatorMin.trust = 400;
        state.campaignStats.totalDeficitBillion = 12_000;
      },
    ],
  ];

  it.each(cases)('%s', (id, setup) => {
    const state = neutral();
    setup(state);
    expect(evaluateArchetype(state, defs.archetypes)?.id).toBe(id);
  });

  it('fallback dipakai bila tidak ada aturan yang cocok', () => {
    expect(evaluateArchetype(neutral(), defs.archetypes)?.id).toBe('ARC-FX-FALLBACK');
  });

  it('prioritas lebih tinggi menang bila beberapa aturan cocok', () => {
    const state = neutral();
    state.indicators.fiscalHealth = 650;
    state.treasuryBillion = 25_000;
    state.campaignStats.lobbies = 5;
    expect(evaluateArchetype(state, defs.archetypes)?.id).toBe('ARC-FX-AUSTERITY');
  });

  it('tanpa arketipe → undefined', () => {
    expect(evaluateArchetype(neutral(), [])).toBeUndefined();
  });
});

describe('statistik kampanye', () => {
  it('accumulateIndicatorStats menghitung jumlah, min, dan max', () => {
    const state = cloneState(newState());
    state.indicators.approval = 700;
    accumulateIndicatorStats(state);
    state.indicators.approval = 300;
    accumulateIndicatorStats(state);
    expect(state.campaignStats.quartersPlayed).toBe(2);
    expect(archetypeStatValue(state, 'avg.approval')).toBe(50);
    expect(archetypeStatValue(state, 'min.approval')).toBe(30);
    expect(archetypeStatValue(state, 'max.approval')).toBe(70);
    expect(archetypeStatValue(state, 'final.approval')).toBe(30);
  });

  it('semua nama statistik yang sah bisa dihitung; nama tak dikenal → null', () => {
    const state = newState();
    for (const stat of ARCHETYPE_STAT_NAMES) {
      expect(parseArchetypeStat(stat)).not.toBeNull();
      expect(typeof archetypeStatValue(state, stat)).toBe('number');
    }
    expect(archetypeStatValue(state, 'avg.tidakAda')).toBeNull();
    expect(archetypeStatValue(state, 'count.apaSaja')).toBeNull();
    expect(archetypeStatValue(state, 'final.approval.lagi')).toBeNull();
    expect(archetypeStatValue(state, 'avg.approval')).toBe(58);
  });

  it('kampanye fixture selesai dengan arketipe dan statistik terisi', () => {
    const run = runScript();
    const final = run.states.at(-1);
    expect(final?.status).toBe('completed');
    expect(final?.archetypeId).toBeDefined();
    expect(final?.campaignStats.quartersPlayed).toBe(4);
  });
});

describe('ringkasan akhir', () => {
  const run = runScript();

  it('5 keputusan paling berdampak, terurut menurun, hanya dari kebijakan dan event', () => {
    const top = topDecisions(run.reports);
    expect(top.length).toBeGreaterThan(0);
    expect(top.length).toBeLessThanOrEqual(5);
    for (let index = 1; index < top.length; index += 1) {
      expect(top[index - 1]?.normalizedImpact ?? 0).toBeGreaterThanOrEqual(
        top[index]?.normalizedImpact ?? 0,
      );
    }
    expect(top.every((item) => item.sourceType === 'POLICY' || item.sourceType === 'EVENT')).toBe(
      true,
    );
    expect(topDecisions(run.reports, 1)).toHaveLength(1);
    expect(topDecisions([])).toEqual([]);
  });

  it('kronologi berisi satu entri per kuartal', () => {
    const entries = chronology(run.reports);
    expect(entries.map((entry) => entry.turn)).toEqual([1, 2, 3, 4]);
    expect(entries[0]?.policiesFailed).toEqual(['POL-FISCAL-FX-001']);
  });
});
