/** Delapan indikator kampanye. Semua nilai runtime disimpan dalam persepuluhan (fixed-point x10). */
export const INDICATOR_KEYS = [
  'approval',
  'stability',
  'fiscalHealth',
  'growthPct',
  'inflationPct',
  'unemploymentPct',
  'welfare',
  'trust',
] as const;

export type IndicatorKey = (typeof INDICATOR_KEYS)[number];

export interface IndicatorDomain {
  /** Batas bawah dalam satuan tampilan (bukan persepuluhan). */
  readonly min: number;
  /** Batas atas dalam satuan tampilan (bukan persepuluhan). */
  readonly max: number;
  readonly unit: 'index' | 'percent';
  readonly label: string;
  readonly shortLabel: string;
}

export const INDICATOR_DOMAINS: Record<IndicatorKey, IndicatorDomain> = {
  approval: {
    min: 0,
    max: 100,
    unit: 'index',
    label: 'Persetujuan Publik',
    shortLabel: 'Persetujuan',
  },
  stability: {
    min: 0,
    max: 100,
    unit: 'index',
    label: 'Stabilitas Politik',
    shortLabel: 'Stabilitas',
  },
  fiscalHealth: {
    min: 0,
    max: 100,
    unit: 'index',
    label: 'Kesehatan Fiskal',
    shortLabel: 'Fiskal',
  },
  growthPct: {
    min: -10,
    max: 15,
    unit: 'percent',
    label: 'Pertumbuhan Ekonomi',
    shortLabel: 'Pertumbuhan',
  },
  inflationPct: {
    min: -5,
    max: 50,
    unit: 'percent',
    label: 'Inflasi',
    shortLabel: 'Inflasi',
  },
  unemploymentPct: {
    min: 0,
    max: 30,
    unit: 'percent',
    label: 'Pengangguran',
    shortLabel: 'Pengangguran',
  },
  welfare: {
    min: 0,
    max: 100,
    unit: 'index',
    label: 'Kesejahteraan',
    shortLabel: 'Kesejahteraan',
  },
  trust: {
    min: 0,
    max: 100,
    unit: 'index',
    label: 'Kepercayaan Publik',
    shortLabel: 'Kepercayaan',
  },
};

export function isIndicatorKey(value: string): value is IndicatorKey {
  return (INDICATOR_KEYS as readonly string[]).includes(value);
}
