import type { GameState, PolicyDefinition } from '@republika/shared';

import type { Ledger } from '../core/ledger.js';

/**
 * Mengaktifkan kebijakan (setelah lolos voting atau tanpa voting). Efek dan
 * biaya belum diterapkan di sini; itu langkah 5–7 AGENT §5.10.
 */
export function activatePolicy(work: GameState, policy: PolicyDefinition, ledger: Ledger): void {
  work.activePolicies = [
    ...work.activePolicies,
    {
      policyId: policy.id,
      enactedTurn: work.turn,
      remainingTurns: policy.durationTurns,
      perTurnCostBillion: policy.perTurnCostBillion,
      lastTickedTurn: 0,
    },
  ];
  work.campaignStats.policiesEnacted += 1;
  work.campaignStats.policiesByCategory[policy.category] += 1;
  ledger.push({
    kind: 'POLICY',
    sourceType: 'POLICY',
    sourceId: policy.id,
    reasonCode: 'POLICY_ENACTED',
    target: policy.id,
  });
}
