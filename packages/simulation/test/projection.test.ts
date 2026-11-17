import { describe, expect, it } from 'vitest';

import { projectPolicy } from '../src/policies/projection.js';
import { POLICY_ENERGY, POLICY_FISCAL, POLICY_SOCIAL, defs, newState } from './helpers.js';

describe('projectPolicy', () => {
  it('rentang 75–125% dan arah, PER_TURN dikali durasi', () => {
    const projection = projectPolicy(newState(), POLICY_SOCIAL, defs);
    // Kementerian Sosial eff 60 → pengali (60+60)/125 = 0,96.
    const byKey = Object.fromEntries(projection.indicators.map((item) => [item.indicator, item]));
    // Persetujuan +4,0 × 0,96 = 3,84 → 3,8
    expect(byKey.approval).toEqual({
      indicator: 'approval',
      expectedTenths: 38,
      minTenths: 29, // 3,8 × 0,75 = 2,85 → 2,9
      maxTenths: 48, // 3,8 × 1,25 = 4,75 → 4,8
      direction: 'up',
    });
    // Kesejahteraan +2,0 × 0,96 = 1,9 per kuartal × 3 kuartal = 5,7
    expect(byKey.welfare?.expectedTenths).toBe(57);
    expect(projection.indicators.map((item) => item.indicator)).toEqual([
      'approval',
      'inflationPct',
      'welfare',
    ]);
  });

  it('biaya kas pasti tanpa rentang', () => {
    const projection = projectPolicy(newState(), POLICY_SOCIAL, defs);
    expect(projection.upfrontCostBillion).toBe(6_000);
    expect(projection.perTurnCostBillion).toBe(2_000);
    expect(projection.totalCostBillion).toBe(12_000);
    expect(projection.treasuryEffectBillion).toBe(0);
    expect(projectPolicy(newState(), POLICY_ENERGY, defs).treasuryEffectBillion).toBe(8_000);
  });

  it('nilai negatif: min ≤ max dan arah turun', () => {
    const projection = projectPolicy(newState(), POLICY_FISCAL, defs);
    const approval = projection.indicators.find((item) => item.indicator === 'approval');
    // Pajak −3,0 × (60+65)/125 = −3,0 → rentang −3,8 … −2,3
    expect(approval).toMatchObject({
      expectedTenths: -30,
      minTenths: -38,
      maxTenths: -23,
      direction: 'down',
    });
  });

  it('modifier dari state saat ini ikut dihitung', () => {
    const hot = { ...newState(), indicators: { ...newState().indicators, inflationPct: 60 } };
    const calm = projectPolicy(newState(), POLICY_ENERGY, defs).indicators.find(
      (item) => item.indicator === 'approval',
    );
    const heated = projectPolicy(hot, POLICY_ENERGY, defs).indicators.find(
      (item) => item.indicator === 'approval',
    );
    expect(calm?.expectedTenths).toBe(-37); // −4 × 0,92
    expect(heated?.expectedTenths).toBe(-55); // −4 × 0,92 × 1,5 = −5,52
  });

  it('prediksi voting hanya untuk kebijakan yang butuh voting', () => {
    expect(projectPolicy(newState(), POLICY_ENERGY, defs).vote).toBeNull();
    expect(projectPolicy(newState(), POLICY_SOCIAL, defs).vote?.yesSeats).toBe(70);
  });

  it('murni: hasil sama untuk input sama dan menolak kebijakan tak dikenal', () => {
    const state = newState();
    expect(projectPolicy(state, POLICY_ENERGY, defs)).toEqual(
      projectPolicy(state, POLICY_ENERGY, defs),
    );
    expect(() => projectPolicy(state, 'POL-NOPE-001', defs)).toThrow();
  });

  it('delta nol menghasilkan arah none', () => {
    const zeroDefs = {
      ...defs,
      policies: defs.policies.map((policy) =>
        policy.id === POLICY_FISCAL
          ? {
              ...policy,
              effects: [
                {
                  type: 'MODIFY_INDICATOR' as const,
                  target: 'trust' as const,
                  deltaTenths: 0,
                  timing: 'IMMEDIATE' as const,
                  reasonCode: 'TEST_ZERO',
                },
                { type: 'SET_FLAG' as const, flag: 'FX_ZERO', reasonCode: 'TEST_ZERO' },
              ],
            }
          : policy,
      ),
    };
    expect(projectPolicy(newState(), POLICY_FISCAL, zeroDefs).indicators).toEqual([
      { indicator: 'trust', expectedTenths: 0, minTenths: 0, maxTenths: 0, direction: 'none' },
    ]);
  });
});
