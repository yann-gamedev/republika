import type { GameState, Requirement } from '@republika/shared';

/** Mengevaluasi satu requirement terhadap state (read-only). */
export function evaluateRequirement(state: GameState, requirement: Requirement): boolean {
  switch (requirement.type) {
    case 'INDICATOR_AT_LEAST':
      return state.indicators[requirement.target] >= requirement.valueTenths;
    case 'INDICATOR_AT_MOST':
      return state.indicators[requirement.target] <= requirement.valueTenths;
    case 'TREASURY_AT_LEAST':
      return state.treasuryBillion >= requirement.valueBillion;
    case 'POLICY_ACTIVE':
      return state.activePolicies.some((policy) => policy.policyId === requirement.policyId);
    case 'POLICY_NOT_ACTIVE':
      return !state.activePolicies.some((policy) => policy.policyId === requirement.policyId);
    case 'FLAG_SET':
      return state.flags.includes(requirement.flag);
    case 'FLAG_NOT_SET':
      return !state.flags.includes(requirement.flag);
    case 'TURN_AT_LEAST':
      return state.turn >= requirement.value;
    default: {
      const unreachable: never = requirement;
      throw new Error(`Requirement tidak dikenal: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** Semua requirement harus terpenuhi (daftar kosong = terpenuhi). */
export function evaluateAll(state: GameState, requirements: readonly Requirement[]): boolean {
  return requirements.every((requirement) => evaluateRequirement(state, requirement));
}
