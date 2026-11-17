import { INDICATOR_KEYS, isIndicatorKey, type IndicatorKey } from './indicators.js';

/** Nama hitungan yang bisa dipakai di `count.<nama>` pada archetypes.json. */
export const ARCHETYPE_COUNT_STATS = [
  'policiesEnacted',
  'FISCAL',
  'SOCIAL',
  'ENERGY',
  'GOVERNANCE',
  'votesHeld',
  'votesPassed',
  'votesFailed',
  'lobbies',
  'eventsResolved',
] as const;

/** Nama total (dalam triliun) untuk `total.<nama>`. */
export const ARCHETYPE_TOTAL_STATS = ['deficit', 'policySpending'] as const;

export type ArchetypeStat =
  | {
      readonly kind: 'indicator';
      readonly agg: 'final' | 'avg' | 'min' | 'max';
      readonly key: IndicatorKey;
    }
  | { readonly kind: 'treasury' }
  | { readonly kind: 'count'; readonly key: (typeof ARCHETYPE_COUNT_STATS)[number] }
  | { readonly kind: 'total'; readonly key: (typeof ARCHETYPE_TOTAL_STATS)[number] };

/**
 * Mengurai nama statistik arketipe. Satuan tampilan: indikator 0..100/persen,
 * kas dan total dalam triliun. Nama tak dikenal → `null`.
 */
export function parseArchetypeStat(stat: string): ArchetypeStat | null {
  const [prefix, name, ...rest] = stat.split('.');
  if (name === undefined || rest.length > 0) return null;
  if (prefix === 'final' && name === 'treasury') return { kind: 'treasury' };
  if (
    (prefix === 'final' || prefix === 'avg' || prefix === 'min' || prefix === 'max') &&
    isIndicatorKey(name)
  ) {
    return { kind: 'indicator', agg: prefix, key: name };
  }
  if (prefix === 'count') {
    const key = ARCHETYPE_COUNT_STATS.find((item) => item === name);
    return key === undefined ? null : { kind: 'count', key };
  }
  if (prefix === 'total') {
    const key = ARCHETYPE_TOTAL_STATS.find((item) => item === name);
    return key === undefined ? null : { kind: 'total', key };
  }
  return null;
}

/** Semua nama statistik yang sah (untuk dokumentasi dan pesan error). */
export const ARCHETYPE_STAT_NAMES: readonly string[] = [
  ...(['final', 'avg', 'min', 'max'] as const).flatMap((agg) =>
    INDICATOR_KEYS.map((key) => `${agg}.${key}`),
  ),
  'final.treasury',
  ...ARCHETYPE_COUNT_STATS.map((key) => `count.${key}`),
  ...ARCHETYPE_TOTAL_STATS.map((key) => `total.${key}`),
];
