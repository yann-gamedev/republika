import { describe, expect, it } from 'vitest';

import { createInitialState } from '@republika/simulation';

import { definitions } from '../src/content/gameContent';
import { filterAndSortPolicies } from '../src/features/policies/PoliciesPage';

const state = createInitialState(definitions.scenario, definitions, {
  presidentName: 'Sari Wening',
  seed: 'katalog',
});

describe('katalog kebijakan', () => {
  it('filter kategori dan pencarian tidak peka huruf besar', () => {
    const energy = filterAndSortPolicies(state, definitions.policies, {
      query: '',
      category: 'ENERGY',
      sort: 'category',
    });
    expect(energy.every((policy) => policy.category === 'ENERGY')).toBe(true);
    const first = definitions.policies[0];
    if (first === undefined) throw new Error('konten tanpa kebijakan');
    const found = filterAndSortPolicies(state, definitions.policies, {
      query: first.name.toUpperCase(),
      category: 'ALL',
      sort: 'status',
    });
    expect(found.map((policy) => policy.id)).toContain(first.id);
    expect(
      filterAndSortPolicies(state, definitions.policies, {
        query: 'tidak-ada-yang-cocok',
        category: 'ALL',
        sort: 'status',
      }),
    ).toEqual([]);
  });

  it('urut biaya total menaik dan status menaruh pengajuan di depan', () => {
    const byCost = filterAndSortPolicies(state, definitions.policies, {
      query: '',
      category: 'ALL',
      sort: 'cost',
    });
    const costs = byCost.map(
      (policy) => policy.fiscalCostBillion + policy.perTurnCostBillion * policy.durationTurns,
    );
    expect(costs).toEqual([...costs].sort((a, b) => a - b));

    const target = byCost.at(-1);
    if (target === undefined) throw new Error('konten tanpa kebijakan');
    const withPending = {
      ...state,
      pendingCommands: [
        { type: 'ENACT_POLICY' as const, commandId: 'p', policyId: target.id, apCost: 1 },
      ],
    };
    const byStatus = filterAndSortPolicies(withPending, definitions.policies, {
      query: '',
      category: 'ALL',
      sort: 'status',
    });
    expect(byStatus[0]?.id).toBe(target.id);
  });
});
