import {
  INDICATOR_KEYS,
  billionToTrillion,
  fromTenths,
  parseArchetypeStat,
  type ArchetypeCondition,
  type ArchetypeDefinition,
  type GameState,
} from '@republika/shared';

import { compareIds } from '../core/order.js';

/**
 * Langkah 12: mencatat nilai akhir kuartal ke statistik kampanye (jumlah untuk
 * rata-rata, serta minimum/maksimum yang sudah berisi nilai awal kampanye).
 */
export function accumulateIndicatorStats(work: GameState): void {
  const stats = work.campaignStats;
  stats.quartersPlayed += 1;
  for (const key of INDICATOR_KEYS) {
    const value = work.indicators[key];
    stats.indicatorSums[key] += value;
    stats.indicatorMin[key] = Math.min(stats.indicatorMin[key], value);
    stats.indicatorMax[key] = Math.max(stats.indicatorMax[key], value);
  }
}

/**
 * Nilai satu statistik arketipe dalam satuan tampilan (indikator 0..100 atau
 * persen; kas/total dalam triliun). `null` bila nama tidak dikenal.
 */
export function archetypeStatValue(state: GameState, stat: string): number | null {
  const parsed = parseArchetypeStat(stat);
  if (parsed === null) return null;
  const stats = state.campaignStats;
  switch (parsed.kind) {
    case 'indicator': {
      if (parsed.agg === 'final') return fromTenths(state.indicators[parsed.key]);
      if (parsed.agg === 'min') return fromTenths(stats.indicatorMin[parsed.key]);
      if (parsed.agg === 'max') return fromTenths(stats.indicatorMax[parsed.key]);
      // Rata-rata nilai akhir tiap kuartal; sebelum kuartal pertama = nilai sekarang.
      return stats.quartersPlayed === 0
        ? fromTenths(state.indicators[parsed.key])
        : fromTenths(stats.indicatorSums[parsed.key] / stats.quartersPlayed);
    }
    case 'treasury':
      return billionToTrillion(state.treasuryBillion);
    case 'count':
      switch (parsed.key) {
        case 'policiesEnacted':
          return stats.policiesEnacted;
        case 'votesHeld':
          return stats.votesHeld;
        case 'votesFailed':
          return stats.votesFailed;
        case 'votesPassed':
          return stats.votesHeld - stats.votesFailed;
        case 'lobbies':
          return stats.lobbies;
        case 'eventsResolved':
          return stats.eventsResolved;
        default:
          return stats.policiesByCategory[parsed.key];
      }
    case 'total':
      return billionToTrillion(
        parsed.key === 'deficit' ? stats.totalDeficitBillion : stats.totalPolicySpendingBillion,
      );
  }
}

export function conditionHolds(state: GameState, condition: ArchetypeCondition): boolean {
  const value = archetypeStatValue(state, condition.stat);
  if (value === null) return false;
  switch (condition.op) {
    case '>=':
      return value >= condition.value;
    case '>':
      return value > condition.value;
    case '<=':
      return value <= condition.value;
    case '<':
      return value < condition.value;
    case '==':
      return value === condition.value;
  }
}

/**
 * Arketipe pertama yang semua syaratnya terpenuhi, diurut prioritas menurun
 * lalu ID. Arketipe tanpa syarat (fallback "Pemerintahan Seimbang") selalu
 * cocok, sehingga dipakai bila tidak ada yang lain.
 */
export function evaluateArchetype(
  state: GameState,
  archetypes: readonly ArchetypeDefinition[],
): ArchetypeDefinition | undefined {
  const ordered = [...archetypes].sort((a, b) => b.priority - a.priority || compareIds(a.id, b.id));
  return ordered.find((archetype) =>
    archetype.conditions.every((condition) => conditionHolds(state, condition)),
  );
}
