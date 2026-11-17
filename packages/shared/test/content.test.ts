import {
  archetypeJsonSchema,
  eventJsonSchema,
  policyJsonSchema,
  presidentNameSchema,
  requirementJsonSchema,
  scenarioJsonSchema,
  type EventJson,
  type PolicyJson,
} from '@republika/shared';
import { describe, expect, it } from 'vitest';

const validPolicy: PolicyJson = {
  id: 'POL-FISCAL-001',
  version: 1,
  name: 'Reformasi Pajak',
  description: 'Contoh kebijakan untuk pengujian schema.',
  category: 'FISCAL',
  apCost: 1,
  fiscalCostTrillion: 1.5,
  perTurnCostTrillion: 0.2,
  needsVote: true,
  durationTurns: 4,
  cooldownTurns: 2,
  requirements: [{ type: 'POLICY_NOT_ACTIVE', policyId: 'POL-SOCIAL-001' }],
  conflicts: [],
  effects: [
    {
      type: 'MODIFY_INDICATOR',
      target: 'approval',
      delta: -2.5,
      timing: 'IMMEDIATE',
      reasonCode: 'TEST_BACKLASH',
    },
  ],
  modifiers: [],
};

const validEvent: EventJson = {
  id: 'EVT-DISASTER-001',
  version: 1,
  title: 'Banjir Besar',
  body: 'Hujan ekstrem merendam tiga provinsi pesisir fiktif.',
  eligibility: [{ type: 'TURN_AT_LEAST', value: 2 }],
  triggerWeight: 10,
  cooldownTurns: 6,
  uniquePerCampaign: false,
  choices: [
    {
      id: 'A',
      label: 'Cairkan dana darurat',
      hint: 'Rakyat terbantu.',
      neutral: false,
      effects: [
        {
          type: 'MODIFY_TREASURY',
          deltaTrillion: -6,
          reasonCode: 'EMERGENCY_FUND',
        },
      ],
    },
    { id: 'B', label: 'Serahkan ke daerah', neutral: true, effects: [] },
  ],
};

describe('schema konten', () => {
  it('menerima kebijakan valid', () => {
    const result = policyJsonSchema.safeParse(validPolicy);
    expect(result.success).toBe(true);
  });

  it('menolak presisi indikator lebih dari 1 desimal', () => {
    const invalid = structuredClone(validPolicy);
    invalid.effects = [
      {
        type: 'MODIFY_INDICATOR',
        target: 'approval',
        delta: -2.55,
        timing: 'IMMEDIATE',
        reasonCode: 'TEST_BACKLASH',
      },
    ];
    const result = policyJsonSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('1 angka desimal'))).toBe(
        true,
      );
    }
  });

  it('menolak presisi kas lebih dari 3 desimal', () => {
    const invalid = salin(validPolicy);
    invalid.fiscalCostTrillion = 1.5001;
    expect(policyJsonSchema.safeParse(invalid).success).toBe(false);
  });

  it('menerima event dengan opsi neutral', () => {
    expect(eventJsonSchema.safeParse(validEvent).success).toBe(true);
  });

  it('menolak event tanpa opsi neutral', () => {
    const invalid = salin(validEvent);
    invalid.choices = invalid.choices.map((choice) => ({ ...choice, neutral: false }));
    const result = eventJsonSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('neutral'))).toBe(true);
    }
  });

  it('menolak requirement dengan nilai indikator di luar domain', () => {
    expect(
      requirementJsonSchema.safeParse({
        type: 'INDICATOR_AT_LEAST',
        target: 'approval',
        value: 120,
      }).success,
    ).toBe(false);
  });

  it('menerima skenario valid dan menolak maxTurns nol', () => {
    const scenario = {
      rulesetVersion: 1,
      maxTurns: 4,
      actionPointsPerTurn: 2,
      maxEventsPerQuarter: 1,
      lobbyCostTrillion: 2,
      lobbySupportBonus: 15,
      startYear: 2031,
      initialIndicators: {
        approval: 58,
        stability: 62,
        fiscalHealth: 55,
        growthPct: 4.8,
        inflationPct: 3.4,
        unemploymentPct: 5.6,
        welfare: 50,
        trust: 52,
      },
      initialTreasuryTrillion: 150,
    };
    expect(scenarioJsonSchema.safeParse(scenario).success).toBe(true);
    expect(scenarioJsonSchema.safeParse({ ...scenario, maxTurns: 0 }).success).toBe(false);
  });

  it('menerima arketipe fallback tanpa kondisi', () => {
    expect(
      archetypeJsonSchema.safeParse({
        id: 'ARC-SEIMBANG',
        version: 1,
        priority: 0,
        name: 'Pemerintahan Seimbang',
        description: 'Tidak ada arah yang dominan.',
        conditions: [],
      }).success,
    ).toBe(true);
  });
});

describe('presidentNameSchema', () => {
  it('memangkas spasi di ujung', () => {
    expect(presidentNameSchema.parse('  Arunika  ')).toBe('Arunika');
  });

  it('menolak nama terlalu pendek', () => {
    expect(presidentNameSchema.safeParse('A').success).toBe(false);
  });
});

function salin<T>(value: T): T {
  return structuredClone(value);
}
