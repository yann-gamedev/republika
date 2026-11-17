import { describe, expect, it } from 'vitest';

import { POLICY_CATEGORIES } from '@republika/shared';
import { createInitialState, indexDefinitions, indicatorMultiplier } from '@republika/simulation';

import { ministryInfluence } from '../src/app/useGame';
import { definitions } from '../src/content/gameContent';

describe('pengaruh kementerian di UI', () => {
  it('pengali sama persis dengan yang dipakai engine untuk setiap kategori dan effectiveness', () => {
    const base = createInitialState(definitions.scenario, definitions, {
      presidentName: 'Sari Wening',
      seed: 'pengali',
    });
    const index = indexDefinitions(definitions);
    for (const effectiveness of [40, 55, 65, 77, 90]) {
      const state = {
        ...base,
        ministries: base.ministries.map((ministry) => ({ ...ministry, effectiveness })),
      };
      for (const category of POLICY_CATEGORIES) {
        const influence = ministryInfluence(state, category);
        const engine = indicatorMultiplier(
          'approval',
          { sourceType: 'POLICY', sourceId: 'POL-UJI-001', category },
          state,
          index,
        );
        expect(influence?.multiplier).toBe(engine);
      }
    }
  });
});
