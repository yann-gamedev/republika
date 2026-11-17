import {
  fromTenths,
  type BaselineParams,
  type GameState,
  type IndicatorKey,
} from '@republika/shared';

import type { DefinitionIndex } from '../core/definitions.js';
import type { Ledger } from '../core/ledger.js';
import { roundTenths } from '../core/math.js';
import type { TickedPolicy } from '../policies/lifecycle.js';

function pushIndicator(
  work: GameState,
  ledger: Ledger,
  target: IndicatorKey,
  delta: number,
  reasonCode: string,
): void {
  if (delta === 0) return;
  const before = work.indicators[target];
  work.indicators[target] = before + delta;
  ledger.push({
    kind: 'INDICATOR',
    sourceType: 'BASELINE',
    reasonCode,
    target,
    unit: 'tenths',
    before,
    delta,
    after: work.indicators[target],
  });
}

function pushTreasury(
  work: GameState,
  ledger: Ledger,
  delta: number,
  reasonCode: string,
  source: { readonly sourceType: 'BASELINE' | 'POLICY'; readonly sourceId?: string },
): void {
  if (delta === 0) return;
  const before = work.treasuryBillion;
  work.treasuryBillion = before + delta;
  ledger.push({
    kind: 'TREASURY',
    ...source,
    reasonCode,
    target: 'treasury',
    unit: 'billion',
    before,
    delta,
    after: work.treasuryBillion,
  });
}

/**
 * Langkah 8: dinamika dasar AGENT §5.9. Semua rumus indikator membaca nilai
 * pada awal langkah baseline (setelah efek kebijakan), lalu diterapkan
 * berurutan: inflasi, pengangguran, persetujuan, pertumbuhan, kas, penalti
 * kas negatif, dan reversi dukungan fraksi.
 */
export function applyBaseline(
  work: GameState,
  params: BaselineParams,
  ticked: readonly TickedPolicy[],
  index: DefinitionIndex,
  ledger: Ledger,
): void {
  const start = { ...work.indicators };

  pushIndicator(
    work,
    ledger,
    'inflationPct',
    roundTenths(
      fromTenths(params.inflationTargetTenths - start.inflationPct) * params.inflationReversion,
    ),
    'BASELINE_INFLATION_REVERSION',
  );
  pushIndicator(
    work,
    ledger,
    'unemploymentPct',
    roundTenths(
      -params.okunCoefficient * fromTenths(start.growthPct - params.okunNeutralGrowthTenths),
    ),
    'BASELINE_OKUN',
  );
  pushIndicator(
    work,
    ledger,
    'approval',
    roundTenths(
      fromTenths(params.approvalAnchorTenths - start.approval) * params.approvalReversion,
    ),
    'BASELINE_APPROVAL_REVERSION',
  );
  pushIndicator(
    work,
    ledger,
    'growthPct',
    roundTenths(fromTenths(params.growthTargetTenths - start.growthPct) * params.growthReversion),
    'BASELINE_GROWTH_REVERSION',
  );

  pushTreasury(work, ledger, params.baseRevenueBillion, 'BASELINE_REVENUE', {
    sourceType: 'BASELINE',
  });
  pushTreasury(work, ledger, -params.baseSpendingBillion, 'BASELINE_SPENDING', {
    sourceType: 'BASELINE',
  });
  for (const policy of ticked) {
    if (policy.perTurnCostBillion === 0) continue;
    pushTreasury(work, ledger, -policy.perTurnCostBillion, 'POLICY_UPKEEP', {
      sourceType: 'POLICY',
      sourceId: policy.policyId,
    });
    work.campaignStats.totalPolicySpendingBillion += policy.perTurnCostBillion;
  }

  if (work.treasuryBillion < 0) {
    pushIndicator(
      work,
      ledger,
      'fiscalHealth',
      -params.negativeTreasuryFiscalHealthPenaltyTenths,
      'NEGATIVE_TREASURY',
    );
  }

  for (const faction of index.factionsSorted) {
    const state = work.factions.find((item) => item.factionId === faction.id);
    if (state === undefined) continue;
    const delta = roundTenths(
      fromTenths(faction.baseSupportTenths - state.supportTenths) * params.factionSupportReversion,
    );
    if (delta === 0) continue;
    const before = state.supportTenths;
    state.supportTenths = before + delta;
    ledger.push({
      kind: 'FACTION',
      sourceType: 'BASELINE',
      reasonCode: 'BASELINE_SUPPORT_REVERSION',
      target: faction.id,
      unit: 'tenths',
      before,
      delta,
      after: state.supportTenths,
    });
  }
}
