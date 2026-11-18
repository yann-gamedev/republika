import { describe, expect, it } from 'vitest';

import { loadGameDefinitions } from '@republika/game-data';
import { sliceFixtureBundle } from '@republika/game-data/fixtures';
import { INDICATOR_KEYS, type IndicatorKey } from '@republika/shared';
import { campaignMetrics, type CampaignMetrics } from '@republika/simulation/test-utils';

import { aggregate, balanceMarkdown, percentile } from '../src/aggregate.js';

const defs = loadGameDefinitions(sliceFixtureBundle).definitions;
const zero = Object.fromEntries(INDICATOR_KEYS.map((key) => [key, 0])) as Record<
  IndicatorKey,
  number
>;

function fake(patch: Partial<CampaignMetrics>): CampaignMetrics {
  return {
    strategy: 'random',
    seed: 's',
    softlock: false,
    quarters: 10,
    finalIndicators: { ...zero, approval: 500 },
    archetype: 'Pemerintahan Seimbang',
    votes: {},
    picks: [],
    eventsSeen: [],
    atBound: zero,
    saveBytes: 1000,
    ...patch,
  };
}

describe('balance Monte Carlo', () => {
  it('persentil nearest-rank', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect([5, 25, 50, 75, 95].map((p) => percentile(values, p))).toEqual([10, 30, 50, 80, 100]);
    expect(Number.isNaN(percentile([], 50))).toBe(true);
  });

  it('bendera: softlock, save > 1 MB, event tak pernah muncul, menempel di batas, voting selalu gagal', () => {
    const metrics = [
      fake({ seed: 'a', softlock: true, softlockReason: 'macet', quarters: 0 }),
      fake({
        seed: 'b',
        saveBytes: 2 * 1024 * 1024,
        atBound: { ...zero, trust: 8 },
        votes: { 'POL-FISCAL-FX-001': [25, 0] },
      }),
    ];
    const summary = aggregate(metrics, defs, ['random']);
    const codes = summary.flags.map((flag) => flag.split(':')[0]);
    expect(codes).toEqual(
      expect.arrayContaining([
        'SOFTLOCK',
        'SAVE_TOO_LARGE',
        'EVENT_NEVER_SEEN',
        'STUCK_AT_BOUND',
        'VOTE_ALWAYS_FAILS',
      ]),
    );
    expect(summary.softlocks).toEqual([{ strategy: 'random', seed: 'a', reason: 'macet' }]);
    expect(summary.neverSeenEvents).toEqual(defs.events.map((event) => event.id).sort());
  });

  it('strategi dominan dan arketipe dominan ditandai', () => {
    const better = {
      ...zero,
      approval: 700,
      stability: 700,
      fiscalHealth: 700,
      welfare: 700,
      trust: 700,
      growthPct: 50,
    };
    const metrics = [
      ...Array.from({ length: 5 }, (_, index) =>
        fake({ strategy: 'welfare', seed: `w${index}`, finalIndicators: better }),
      ),
      ...Array.from({ length: 5 }, (_, index) => fake({ strategy: 'no-op', seed: `n${index}` })),
    ];
    const summary = aggregate(metrics, defs, ['welfare', 'no-op']);
    expect(summary.flags.some((flag) => flag.startsWith('DOMINANT_STRATEGY: welfare'))).toBe(true);
    expect(summary.flags.some((flag) => flag.startsWith('ARCHETYPE_DOMINANT'))).toBe(true);
  });

  it('urutan input (pembagian worker) tidak mengubah laporan', () => {
    const metrics = ['random', 'austerity'].flatMap((strategy) =>
      Array.from({ length: 6 }, (_, index) =>
        campaignMetrics(defs, strategy as 'random' | 'austerity', `uji-${strategy}-${index}`, 6),
      ),
    );
    const forward = balanceMarkdown(aggregate(metrics, defs, ['random', 'austerity']), {
      seed: 'uji',
      turns: 6,
    });
    const reversed = balanceMarkdown(
      aggregate([...metrics].reverse(), defs, ['random', 'austerity']),
      {
        seed: 'uji',
        turns: 6,
      },
    );
    expect(reversed).toBe(forward);
    expect(metrics.every((item) => !item.softlock)).toBe(true);
    expect(forward).toContain('## Tingkat lolos voting per kebijakan');
  });
});
