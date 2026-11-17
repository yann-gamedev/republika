import { INDICATOR_DOMAINS, type GameState, type IndicatorKey } from '@republika/shared';
import {
  applyCommand,
  domainEffectiveness,
  indexDefinitions,
  ministryMultiplier,
  type CommandErrorCode,
  type PlayerCommand,
} from '@republika/simulation';
import type { PolicyCategory } from '@republika/shared';

import { definitions } from '@/content/gameContent';
import { formatIndicator, formatPercentTenths } from '@/format/formatters';
import { useGameStore } from '@/store/gameStore';

/**
 * State kampanye aktif. Hanya dipakai di bawah `GameLayout`, yang mengalihkan
 * ke menu bila belum ada kampanye.
 */
export function useGameState(): GameState {
  const state = useGameStore((store) => store.state);
  if (state === null) throw new Error('GameLayout seharusnya menjaga state kampanye.');
  return state;
}

/**
 * Uji coba command tanpa mengubah state: kode error yang akan muncul bila
 * command dikirim sekarang, atau `null` bila boleh. Dipakai untuk menonaktifkan
 * tombol beserta alasannya, dengan aturan yang persis sama dengan engine.
 */
export function previewCommand(state: GameState, command: PlayerCommand): CommandErrorCode | null {
  return applyCommand(state, command, definitions).error?.code ?? null;
}

export const PREVIEW_COMMAND_ID = '__preview__';

export function displayIndicator(key: IndicatorKey, valueTenths: number): string {
  return INDICATOR_DOMAINS[key].unit === 'percent'
    ? formatPercentTenths(valueTenths)
    : formatIndicator(valueTenths);
}

/** Inflasi dan pengangguran lebih baik bila turun. */
export function isFavourable(key: IndicatorKey, delta: number): boolean {
  if (delta === 0) return false;
  if (key === 'inflationPct' || key === 'unemploymentPct') return delta < 0;
  return delta > 0;
}

/**
 * Kementerian yang memengaruhi kategori kebijakan beserta pengalinya. Nilai
 * diambil dari fungsi engine (`domainEffectiveness`, `ministryMultiplier`),
 * bukan disalin, sehingga selalu sama dengan perhitungan resolusi.
 */
export function ministryInfluence(
  state: GameState,
  category: PolicyCategory,
): { readonly name: string; readonly multiplier: number } | null {
  const index = indexDefinitions(definitions);
  const ministry = index.ministryByCategory.get(category);
  const effectiveness = domainEffectiveness(state, index, category);
  if (ministry === undefined || effectiveness === null) return null;
  return { name: ministry.name, multiplier: ministryMultiplier(effectiveness) };
}
