import type { PortraitLook } from '@/ui/Portrait';

/**
 * Tampilan menteri sementara untuk UI v2 (TAHAP-6 §6A.5, K7). Nama dan partai
 * masih PLACEHOLDER sampai pemilik menulis konten menteri di
 * `packages/game-data/content/` (Tahap 6B.1). Data ini kosmetik: tidak masuk
 * `GameState` dan tidak dibaca engine.
 */
export interface MinisterLook {
  readonly name: string;
  readonly factionId: string | null;
  readonly look: PortraitLook;
}

const BAND = '#2A2C44';

export const CABINET_LOOKS: Readonly<Record<string, MinisterLook>> = {
  'MIN-PLACEHOLDER-FISCAL': {
    name: 'PLACEHOLDER Menteri Keuangan',
    factionId: 'FAC-CAKRAWALA',
    look: {
      head: 'rambut',
      skin: '#C09078',
      suit: '#181830',
      accent: '#C9A227',
      bg: BAND,
      glasses: true,
    },
  },
  'MIN-PLACEHOLDER-SOCIAL': {
    name: 'PLACEHOLDER Menteri Sosial',
    factionId: 'FAC-SUARA-JELATA',
    look: { head: 'hijab', skin: '#A87860', suit: '#3A3C56', accent: '#784848', bg: BAND },
  },
  'MIN-PLACEHOLDER-ENERGY': {
    name: 'PLACEHOLDER Menteri Energi',
    factionId: 'FAC-TUNAS-LESTARI',
    look: { head: 'peci', skin: '#B08068', suit: '#181A1F', accent: '#C03018', bg: BAND },
  },
  'MIN-PLACEHOLDER-GOVERNANCE': {
    name: 'PLACEHOLDER Menteri Dalam Negeri',
    factionId: 'FAC-MADANI',
    look: { head: 'uban', skin: '#C09078', suit: '#22243A', accent: '#C9A227', bg: BAND },
  },
};

const FALLBACK: MinisterLook = {
  name: 'PLACEHOLDER Menteri',
  factionId: null,
  look: { head: 'botak', skin: '#C09078', suit: '#181A1F', accent: '#909090', bg: BAND },
};

export function ministerLook(ministryId: string): MinisterLook {
  return CABINET_LOOKS[ministryId] ?? FALLBACK;
}
