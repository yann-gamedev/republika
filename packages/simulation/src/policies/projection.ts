import type { GameDefinitions, GameState, IndicatorKey } from '@republika/shared';

import { indexDefinitions } from '../core/definitions.js';
import { applyMultiplier, roundTenths } from '../core/math.js';
import { compareIds } from '../core/order.js';
import { predictVote, type VotePrediction } from '../politics/voting.js';
import { indicatorMultiplier } from './effects.js';
import { policySource } from './lifecycle.js';

/** Faktor rentang proyeksi AGENT §5.8. */
export const PROJECTION_LOW_FACTOR = 0.75;
export const PROJECTION_HIGH_FACTOR = 1.25;

export interface IndicatorProjection {
  readonly indicator: IndicatorKey;
  /** Perkiraan total perubahan selama masa berlaku (persepuluhan). */
  readonly expectedTenths: number;
  /** Batas bawah dan atas rentang (persepuluhan), min ≤ max. */
  readonly minTenths: number;
  readonly maxTenths: number;
  readonly direction: 'up' | 'down' | 'none';
}

export interface PolicyProjection {
  readonly policyId: string;
  readonly indicators: readonly IndicatorProjection[];
  /** Biaya kas pasti (miliar, positif = pengeluaran). */
  readonly upfrontCostBillion: number;
  readonly perTurnCostBillion: number;
  readonly totalCostBillion: number;
  /** Efek kas langsung dari kebijakan (miliar, positif = pemasukan). */
  readonly treasuryEffectBillion: number;
  readonly durationTurns: number;
  /** Prediksi voting bila kebijakan butuh voting; `null` bila tidak. */
  readonly vote: VotePrediction | null;
}

/**
 * Proyeksi kebijakan AGENT §5.8: arah + rentang [expected × 0,75, expected × 1,25]
 * per indikator, biaya kas pasti. Murni dan tanpa RNG. Pengali kementerian dan
 * modifier dihitung dari state saat ini. PER_TURN dikalikan durasi; DELAYED
 * dihitung sekali. Tidak memperhitungkan baseline atau event.
 */
export function projectPolicy(
  state: GameState,
  policyId: string,
  defs: GameDefinitions,
): PolicyProjection {
  const index = indexDefinitions(defs);
  const policy = index.policies.get(policyId);
  if (policy === undefined) throw new Error(`Kebijakan ${policyId} tidak ditemukan.`);
  const source = policySource(policy);
  const totals = new Map<IndicatorKey, number>();
  let treasuryEffectBillion = 0;

  for (const effect of policy.effects) {
    if (effect.type === 'MODIFY_TREASURY') {
      treasuryEffectBillion += effect.deltaBillion;
      continue;
    }
    if (effect.type !== 'MODIFY_INDICATOR') continue;
    const multiplier = indicatorMultiplier(effect.target, source, state, index);
    const perApplication =
      multiplier === 1 ? effect.deltaTenths : applyMultiplier(effect.deltaTenths, multiplier);
    const applications = effect.timing === 'PER_TURN' ? policy.durationTurns : 1;
    totals.set(effect.target, (totals.get(effect.target) ?? 0) + perApplication * applications);
  }

  const indicators = [...totals.entries()]
    .sort(([a], [b]) => compareIds(a, b))
    .map(([indicator, expectedTenths]): IndicatorProjection => {
      const low = roundTenths((expectedTenths / 10) * PROJECTION_LOW_FACTOR);
      const high = roundTenths((expectedTenths / 10) * PROJECTION_HIGH_FACTOR);
      return {
        indicator,
        expectedTenths,
        minTenths: Math.min(low, high),
        maxTenths: Math.max(low, high),
        direction: expectedTenths > 0 ? 'up' : expectedTenths < 0 ? 'down' : 'none',
      };
    });

  return {
    policyId,
    indicators,
    upfrontCostBillion: policy.fiscalCostBillion,
    perTurnCostBillion: policy.perTurnCostBillion,
    totalCostBillion: policy.fiscalCostBillion + policy.perTurnCostBillion * policy.durationTurns,
    treasuryEffectBillion,
    durationTurns: policy.durationTurns,
    vote: policy.needsVote ? predictVote(state, policyId, defs) : null,
  };
}
