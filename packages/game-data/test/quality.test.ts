import { describe, expect, it } from 'vitest';

import type { EventDefinition, GameDefinitions, PolicyDefinition } from '@republika/shared';

import { sliceFixtureBundle } from '../fixtures/slice/index.js';
import { loadGameDefinitions, qualityWarnings } from '../src/index.js';

const defs = loadGameDefinitions(sliceFixtureBundle).definitions;

function codes(d: GameDefinitions): string[] {
  return qualityWarnings(d).map((item) => `${item.code}@${item.path}`);
}

function withEvent(patch: Partial<EventDefinition>): GameDefinitions {
  const base = defs.events[0];
  if (base === undefined) throw new Error('fixture tanpa event');
  return { ...defs, events: [...defs.events, { ...base, id: 'EVT-UJI-001', ...patch }] };
}

function withPolicy(patch: Partial<PolicyDefinition>): GameDefinitions {
  const base = defs.policies[0];
  if (base === undefined) throw new Error('fixture tanpa kebijakan');
  return { ...defs, policies: [...defs.policies, { ...base, id: 'POL-UJI-001', ...patch }] };
}

describe('qualityWarnings', () => {
  it('jumlah konten di bawah target MVP menjadi peringatan', () => {
    const found = codes(defs);
    expect(found).toContain('CONTENT_BELOW_TARGET@factions');
    expect(found).toContain('CONTENT_BELOW_TARGET@policies');
    expect(found).toContain('CONTENT_BELOW_TARGET@events');
    expect(found).toContain('CONTENT_BELOW_TARGET@archetypes');
    expect(found).toContain('CONTENT_BELOW_TARGET@scenario.maxTurns');
    expect(found).not.toContain('CONTENT_BELOW_TARGET@ministries');
  });

  it('kebijakan tanpa efek negatif diberi peringatan "terlalu dominan?"', () => {
    const d = withPolicy({
      effects: [
        {
          type: 'MODIFY_INDICATOR',
          target: 'approval',
          deltaTenths: 50,
          timing: 'IMMEDIATE',
          reasonCode: 'UJI_BAIK',
        },
        {
          type: 'MODIFY_INDICATOR',
          target: 'inflationPct',
          deltaTenths: -5,
          timing: 'IMMEDIATE',
          reasonCode: 'UJI_BAIK',
        },
      ],
    });
    expect(codes(d)).toContain('POLICY_NO_DOWNSIDE@policies.POL-UJI-001');
    // Fixture asli semuanya punya sisi negatif.
    expect(codes(defs).some((code) => code.startsWith('POLICY_NO_DOWNSIDE'))).toBe(false);
  });

  it('inflasi naik dihitung sebagai sisi negatif', () => {
    const d = withPolicy({
      effects: [
        {
          type: 'MODIFY_INDICATOR',
          target: 'inflationPct',
          deltaTenths: 5,
          timing: 'IMMEDIATE',
          reasonCode: 'UJI_HARGA',
        },
      ],
    });
    expect(codes(d)).not.toContain('POLICY_NO_DOWNSIDE@policies.POL-UJI-001');
  });

  it.each([
    [
      'indikator ≥ dan ≤ bertentangan',
      [
        { type: 'INDICATOR_AT_LEAST' as const, target: 'approval' as const, valueTenths: 600 },
        { type: 'INDICATOR_AT_MOST' as const, target: 'approval' as const, valueTenths: 500 },
      ],
    ],
    [
      'flag ada dan tidak ada',
      [
        { type: 'FLAG_SET' as const, flag: 'FX_SUBSIDY_REFORMED' },
        { type: 'FLAG_NOT_SET' as const, flag: 'FX_SUBSIDY_REFORMED' },
      ],
    ],
    [
      'kebijakan aktif dan tidak aktif',
      [
        { type: 'POLICY_ACTIVE' as const, policyId: 'POL-ENERGY-FX-001' },
        { type: 'POLICY_NOT_ACTIVE' as const, policyId: 'POL-ENERGY-FX-001' },
      ],
    ],
    ['kuartal melewati kampanye', [{ type: 'TURN_AT_LEAST' as const, value: 99 }]],
    ['flag tidak pernah di-set', [{ type: 'FLAG_SET' as const, flag: 'FX_TIDAK_ADA' }]],
  ])('event mustahil muncul: %s', (_label, eligibility) => {
    expect(codes(withEvent({ eligibility }))).toContain(
      'EVENT_NEVER_ELIGIBLE@events.EVT-UJI-001.eligibility',
    );
  });

  it('kebijakan dengan syarat mustahil juga diperingatkan', () => {
    const d = withPolicy({ requirements: [{ type: 'TURN_AT_LEAST', value: 99 }] });
    expect(codes(d)).toContain('POLICY_NEVER_AVAILABLE@policies.POL-UJI-001.requirements');
  });

  it('statistik arketipe tak dikenal diperingatkan', () => {
    const d: GameDefinitions = {
      ...defs,
      archetypes: [
        ...defs.archetypes,
        {
          id: 'ARC-UJI-001',
          version: 1,
          priority: 5,
          name: 'Uji',
          description: '',
          conditions: [{ stat: 'avg.popularitas', op: '>=', value: 1 }],
        },
      ],
    };
    expect(codes(d)).toContain('ARCHETYPE_UNKNOWN_STAT@archetypes.ARC-UJI-001');
    expect(codes(defs).some((code) => code.startsWith('ARCHETYPE_UNKNOWN_STAT'))).toBe(false);
  });

  it('flag di-set tapi tidak pernah dibaca, dan sebaliknya', () => {
    // Fixture: FX_SUBSIDY_REFORMED di-set energi, tidak pernah dibaca.
    expect(codes(defs)).toContain('FLAG_NEVER_READ@flags.FX_SUBSIDY_REFORMED');
    const reader = withEvent({ eligibility: [{ type: 'FLAG_SET', flag: 'FX_SUBSIDY_REFORMED' }] });
    expect(codes(reader)).not.toContain('FLAG_NEVER_READ@flags.FX_SUBSIDY_REFORMED');
    const orphan = withEvent({ eligibility: [{ type: 'FLAG_NOT_SET', flag: 'FX_YATIM' }] });
    expect(codes(orphan)).toContain('FLAG_NEVER_SET@flags.FX_YATIM');
  });

  it('flag provinsi dari engine tidak dianggap mustahil atau yatim', () => {
    for (const flag of ['UNREST_PRV_PAPPEG', 'ASPIRATION_PRV_NTT']) {
      const regional = withEvent({ eligibility: [{ type: 'FLAG_SET', flag }] });
      expect(codes(regional)).not.toContain('EVENT_NEVER_ELIGIBLE@events.EVT-UJI-001.eligibility');
      expect(codes(regional)).not.toContain(`FLAG_NEVER_SET@flags.${flag}`);
    }
  });
});
