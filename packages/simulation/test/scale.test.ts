import { describe, expect, it } from 'vitest';

import type {
  EventDefinition,
  GameDefinitions,
  GameState,
  PolicyDefinition,
} from '@republika/shared';

import { applyCommand } from '../src/core/commands.js';
import { createInitialState } from '../src/core/initialState.js';
import { resolveTurn } from '../src/core/resolveTurn.js';
import { defs, respondAll } from './helpers.js';

function event(id: string, patch: Partial<EventDefinition>): EventDefinition {
  const base = defs.events[0];
  if (base === undefined) throw new Error('fixture tanpa event');
  return { ...base, id, uniquePerCampaign: true, cooldownTurns: 0, ...patch };
}

describe('rantai event via flag', () => {
  // A selalu muncul pertama (bobot besar) dan opsinya men-set flag; B hanya eligible bila flag ada.
  const chainDefs: GameDefinitions = {
    ...defs,
    events: [
      event('EVT-CHAIN-A', {
        triggerWeight: 1000,
        eligibility: [],
        choices: [
          {
            id: 'A',
            label: 'Mulai rantai',
            neutral: true,
            effects: [{ type: 'SET_FLAG', flag: 'FX_CHAIN_STARTED', reasonCode: 'CHAIN_START' }],
          },
        ],
      }),
      event('EVT-CHAIN-B', {
        triggerWeight: 1,
        eligibility: [{ type: 'FLAG_SET', flag: 'FX_CHAIN_STARTED' }],
        choices: [{ id: 'A', label: 'Lanjutan rantai', neutral: true, effects: [] }],
      }),
    ],
  };

  it('event A men-set flag → event B muncul pada kuartal berikutnya', () => {
    let state = createInitialState(chainDefs.scenario, chainDefs, {
      presidentName: 'Sari Wening',
      seed: 'rantai',
    });
    const arrivals: string[][] = [];
    for (let quarter = 1; quarter <= 3; quarter += 1) {
      for (const response of respondAll(state, () => 'A', `q${quarter}`)) {
        state = applyCommand(state, response, chainDefs).state;
      }
      const result = resolveTurn(
        state,
        { type: 'END_QUARTER', commandId: `e${quarter}` },
        chainDefs,
      );
      if (!result.ok) throw new Error(result.error.code);
      arrivals.push(result.report.nextEventIds);
      state = result.state;
    }
    // K1 menarik A (B belum eligible); K2 menjawab A → flag di-set → K2 menarik B.
    expect(arrivals[0]).toEqual(['EVT-CHAIN-A']);
    expect(state.flags).toContain('FX_CHAIN_STARTED');
    expect(arrivals[1]).toEqual(['EVT-CHAIN-B']);
    expect(state.eventsFired).toEqual(['EVT-CHAIN-A', 'EVT-CHAIN-B']);
  });
});

describe('skala konten MVP tanpa asumsi jumlah', () => {
  it('12 kebijakan dan 15 event berjalan 20 kuartal dengan konflik', () => {
    const template = defs.policies.find((policy) => policy.id === 'POL-SOCIAL-FX-001');
    const eventTemplate = defs.events[0];
    if (template === undefined || eventTemplate === undefined) throw new Error('fixture kurang');
    const policies: PolicyDefinition[] = Array.from({ length: 12 }, (_, index) => ({
      ...template,
      id: `POL-SCALE-${String(index + 1).padStart(3, '0')}`,
      needsVote: index % 2 === 0,
      requirements: [],
      // Setiap kebijakan genap berkonflik dengan pasangan ganjilnya.
      conflicts: index % 2 === 0 ? [`POL-SCALE-${String(index + 2).padStart(3, '0')}`] : [],
    }));
    const events: EventDefinition[] = Array.from({ length: 15 }, (_, index) => ({
      ...eventTemplate,
      id: `EVT-SCALE-${String(index + 1).padStart(3, '0')}`,
      cooldownTurns: index % 3,
      uniquePerCampaign: index % 4 === 0,
    }));
    const big: GameDefinitions = {
      ...defs,
      scenario: { ...defs.scenario, maxTurns: 20, maxEventsPerQuarter: 2 },
      policies,
      events,
    };
    let state: GameState = createInitialState(big.scenario, big, {
      presidentName: 'Sari Wening',
      seed: 'skala',
    });
    const seen = new Set<string>();
    for (let quarter = 1; quarter <= 20; quarter += 1) {
      for (const response of respondAll(state, () => 'B', `q${quarter}`)) {
        state = applyCommand(state, response, big).state;
      }
      // Ajukan pasangan kebijakan; yang kedua harus ditolak karena konflik.
      const pair = (quarter % 6) * 2;
      const first = applyCommand(
        state,
        { type: 'ENACT_POLICY', commandId: `a${quarter}`, policyId: policies[pair]?.id ?? '' },
        big,
      );
      state = first.state;
      if (first.error === undefined) {
        const second = applyCommand(
          state,
          {
            type: 'ENACT_POLICY',
            commandId: `b${quarter}`,
            policyId: policies[pair + 1]?.id ?? '',
          },
          big,
        );
        expect(second.error?.code).toBe('CONFLICT');
      }
      const result = resolveTurn(state, { type: 'END_QUARTER', commandId: `e${quarter}` }, big);
      if (!result.ok) throw new Error(result.error.code);
      expect(result.report.nextEventIds.length).toBeLessThanOrEqual(2);
      result.report.nextEventIds.forEach((id) => seen.add(id));
      state = result.state;
    }
    expect(state.status).toBe('completed');
    expect(seen.size).toBeGreaterThan(5);
  });
});
