import {
  INDICATOR_KEYS,
  type GameDefinitions,
  type Indicators,
  type LedgerEntry,
  type PolicyCategory,
  type TurnReport,
  type VoteOutcome,
} from '@republika/shared';

import {
  findPolicyByCategory,
  mockDefinitions,
  mockGameState,
  mockLatestSummary,
  mockPreviousIndicators,
} from './mockState';

const socialPolicy = findPolicyByCategory('SOCIAL');
const fiscalPolicy = findPolicyByCategory('FISCAL');
const energyPolicy = findPolicyByCategory('ENERGY');
const energyMinistry = mockDefinitions.ministries.find((ministry) =>
  ministry.categories.includes('ENERGY'),
);
const floodEvent = mockDefinitions.events[0];
const protestEvent = mockDefinitions.events[1];

const supportByFaction = new Map(
  mockGameState.factions.map((faction) => [faction.factionId, faction.supportTenths]),
);

function factionName(factionId: string): string {
  return mockDefinitions.factions.find((faction) => faction.id === factionId)?.name ?? factionId;
}

function buildVote(policyId: string, category: PolicyCategory): VoteOutcome {
  const factionVotes = mockDefinitions.factions.map((faction) => {
    const supportTenths = supportByFaction.get(faction.id) ?? faction.initialSupportTenths;
    const score = Math.round(supportTenths / 10 + faction.policyPreferences[category] * 10);
    return {
      factionId: faction.id,
      supportTenths,
      score,
      vote: score >= 50 ? ('FOR' as const) : ('AGAINST' as const),
    };
  });
  const seatsFor = mockDefinitions.factions.reduce((total, faction) => {
    const vote = factionVotes.find((item) => item.factionId === faction.id);
    return vote?.vote === 'FOR' ? total + faction.seats : total;
  }, 0);
  return {
    policyId,
    seatsFor,
    seatsAgainst: 100 - seatsFor,
    passed: seatsFor >= 51,
    factionVotes,
  };
}

function indicators(values: Indicators): Indicators {
  return values;
}

const REPORT_ONE_BEFORE = indicators({
  approval: 580,
  stability: 620,
  fiscalHealth: 570,
  growthPct: 48,
  inflationPct: 34,
  unemploymentPct: 56,
  welfare: 500,
  trust: 520,
});

const REPORT_ONE_AFTER = indicators({
  approval: 572,
  stability: 614,
  fiscalHealth: 566,
  growthPct: 47,
  inflationPct: 35,
  unemploymentPct: 55,
  welfare: 508,
  trust: 516,
});

const REPORT_TWO_BEFORE = REPORT_ONE_AFTER;

const REPORT_TWO_AFTER = indicators({
  approval: 566,
  stability: 610,
  fiscalHealth: 562,
  growthPct: 46,
  inflationPct: 36,
  unemploymentPct: 54,
  welfare: 516,
  trust: 510,
});

const REPORT_THREE_BEFORE = REPORT_TWO_AFTER;

const REPORT_THREE_AFTER = indicators({
  approval: 558,
  stability: 620,
  fiscalHealth: 566,
  growthPct: 45,
  inflationPct: 38,
  unemploymentPct: 53,
  welfare: 524,
  trust: 505,
});

const REPORT_FOUR_BEFORE = REPORT_THREE_AFTER;

const REPORT_FOUR_AFTER = mockPreviousIndicators;

const REPORT_FIVE_BEFORE = REPORT_FOUR_AFTER;

const REPORT_FIVE_AFTER = mockGameState.indicators;

const LEDGER_ONE: readonly LedgerEntry[] = [
  {
    id: 'LEDGER-001-01',
    turn: 1,
    order: 0,
    kind: 'POLICY',
    sourceType: 'POLICY',
    reasonCode: 'POLICY_ENACTED',
    sourceId: socialPolicy.id,
    message: 'Bantuan sosial tepat sasaran mulai berlaku.',
  },
  {
    id: 'LEDGER-001-02',
    turn: 1,
    order: 1,
    kind: 'VOTE',
    sourceType: 'VOTE',
    reasonCode: 'VOTE_PASSED',
    sourceId: socialPolicy.id,
    message: 'Voting kebijakan sosial lolos di parlemen.',
  },
  {
    id: 'LEDGER-001-03',
    turn: 1,
    order: 2,
    kind: 'INDICATOR',
    sourceType: 'POLICY',
    reasonCode: 'AID_SUPPORT',
    target: 'approval',
    unit: 'tenths',
    delta: 40,
    message: 'Bantuan langsung menopang persetujuan publik.',
  },
  {
    id: 'LEDGER-001-04',
    turn: 1,
    order: 3,
    kind: 'TREASURY',
    sourceType: 'SYSTEM',
    reasonCode: 'POLICY_COST',
    target: 'treasury',
    unit: 'billion',
    delta: -6_000,
    message: 'Biaya awal penyaluran bantuan sosial.',
  },
];

const LEDGER_TWO: readonly LedgerEntry[] = [
  {
    id: 'LEDGER-002-01',
    turn: 2,
    order: 0,
    kind: 'EVENT',
    sourceType: 'EVENT',
    reasonCode: 'PLACEHOLDER_EMERGENCY_FUND',
    ...(floodEvent !== undefined ? { sourceId: floodEvent.id } : {}),
    target: 'treasury',
    unit: 'billion',
    delta: -6_000,
    message: 'Dana darurat pencairan banjir pesisir.',
  },
  {
    id: 'LEDGER-002-02',
    turn: 2,
    order: 1,
    kind: 'INDICATOR',
    sourceType: 'POLICY',
    reasonCode: 'SWIFT_RESPONSE',
    target: 'approval',
    unit: 'tenths',
    delta: 40,
    message: 'Respons cepat dianggap membantu korban.',
  },
  {
    id: 'LEDGER-002-03',
    turn: 2,
    order: 2,
    kind: 'SYSTEM',
    sourceType: 'BASELINE',
    reasonCode: 'BASELINE',
    message: 'Dinamika dasar kuartal diterapkan.',
  },
];

const LEDGER_THREE: readonly LedgerEntry[] = [
  {
    id: 'LEDGER-003-01',
    turn: 3,
    order: 0,
    kind: 'VOTE',
    sourceType: 'VOTE',
    reasonCode: 'VOTE_PASSED',
    sourceId: fiscalPolicy.id,
    message: 'Pembaruan pajak konsumsi lolos dengan 51 kursi.',
  },
  {
    id: 'LEDGER-003-02',
    turn: 3,
    order: 1,
    kind: 'INDICATOR',
    sourceType: 'POLICY',
    reasonCode: 'REVENUE_STRENGTH',
    target: 'fiscalHealth',
    unit: 'tenths',
    delta: 20,
    message: 'Basis penerimaan baru memperkuat kesehatan fiskal.',
  },
  {
    id: 'LEDGER-003-03',
    turn: 3,
    order: 2,
    kind: 'TREASURY',
    sourceType: 'BASELINE',
    reasonCode: 'BASELINE_REVENUE',
    target: 'treasury',
    unit: 'billion',
    delta: 3_000,
    message: 'Penerimaan kuartalan masuk ke kas negara.',
  },
];

const LEDGER_FOUR: readonly LedgerEntry[] = [
  {
    id: 'LEDGER-004-01',
    turn: 4,
    order: 0,
    kind: 'POLICY',
    sourceType: 'POLICY',
    reasonCode: 'POLICY_ENACTED',
    sourceId: energyPolicy.id,
    message: 'Reformasi subsidi energi mulai dijalankan.',
  },
  {
    id: 'LEDGER-004-02',
    turn: 4,
    order: 1,
    kind: 'TREASURY',
    sourceType: 'SYSTEM',
    reasonCode: 'POLICY_COST',
    target: 'treasury',
    unit: 'billion',
    delta: -8_000,
    message: 'Biaya awal reformasi energi.',
  },
  {
    id: 'LEDGER-004-03',
    turn: 4,
    order: 2,
    kind: 'INDICATOR',
    sourceType: 'POLICY',
    reasonCode: 'ENERGY_PRICE_PASS_THROUGH',
    target: 'inflationPct',
    unit: 'tenths',
    delta: 20,
    message: 'Penyesuaian harga terasa pada inflasi kuartal ini.',
  },
  {
    id: 'LEDGER-004-04',
    turn: 4,
    order: 3,
    kind: 'MINISTRY',
    sourceType: 'MINISTRY',
    reasonCode: 'ENERGY_REFORM',
    ...(energyMinistry !== undefined ? { target: energyMinistry.id } : {}),
    message: 'Kementerian Energi menambah beban kerja reformasi.',
  },
];

const LEDGER_FIVE: readonly LedgerEntry[] = [
  {
    id: 'LEDGER-005-01',
    turn: 5,
    order: 0,
    kind: 'VOTE',
    sourceType: 'VOTE',
    reasonCode: 'VOTE_PASSED',
    sourceId: fiscalPolicy.id,
    message: 'Fraksi tengah menerima lanjutan kebijakan fiskal.',
  },
  {
    id: 'LEDGER-005-02',
    turn: 5,
    order: 1,
    kind: 'TREASURY',
    sourceType: 'SYSTEM',
    reasonCode: 'POLICY_MAINTENANCE',
    target: 'treasury',
    unit: 'billion',
    delta: -2_000,
    message: 'Belanja sosial rutin dibayarkan.',
  },
  {
    id: 'LEDGER-005-03',
    turn: 5,
    order: 2,
    kind: 'INDICATOR',
    sourceType: 'POLICY',
    reasonCode: 'APPROVAL_DRIFT',
    target: 'approval',
    unit: 'tenths',
    delta: -10,
    message: 'Harga kebutuhan pokok menekan persetujuan publik.',
  },
  {
    id: 'LEDGER-005-04',
    turn: 5,
    order: 3,
    kind: 'SYSTEM',
    sourceType: 'BASELINE',
    reasonCode: 'BASELINE',
    message: 'Dinamika dasar kuartal diterapkan.',
  },
];

type MockReportBase = Omit<
  TurnReport,
  'treasuryDeltaBillion' | 'indicatorDeltas' | 'topCauses' | 'policiesPassed' | 'policiesFailed'
>;

function withDerivedFields(report: MockReportBase): TurnReport {
  const indicatorDeltas = Object.fromEntries(
    INDICATOR_KEYS.map((key) => [key, report.indicatorsAfter[key] - report.indicatorsBefore[key]]),
  ) as TurnReport['indicatorDeltas'];
  const topCauses = Object.fromEntries(
    INDICATOR_KEYS.map((key) => [
      key,
      report.ledger
        .filter((entry) => entry.kind === 'INDICATOR' && entry.target === key)
        .map((entry) => ({
          sourceType: entry.sourceType,
          ...(entry.sourceId !== undefined ? { sourceId: entry.sourceId } : {}),
          reasonCode: entry.reasonCode,
          deltaTenths: entry.delta ?? 0,
        }))
        .slice(0, 3),
    ]),
  ) as TurnReport['topCauses'];
  return {
    ...report,
    treasuryDeltaBillion: report.treasuryAfterBillion - report.treasuryBeforeBillion,
    indicatorDeltas,
    topCauses,
    policiesPassed: report.votes.filter((vote) => vote.passed).map((vote) => vote.policyId),
    policiesFailed: report.votes.filter((vote) => !vote.passed).map((vote) => vote.policyId),
  };
}

export function createMockHistory(
  presidentName: string = mockGameState.presidentName,
): TurnReport[] {
  const reports: MockReportBase[] = [
    {
      turn: 1,
      year: 2031,
      quarter: 1,
      presidentName,
      indicatorsBefore: REPORT_ONE_BEFORE,
      indicatorsAfter: REPORT_ONE_AFTER,
      treasuryBeforeBillion: 150_000,
      treasuryAfterBillion: 148_600,
      ledger: [...LEDGER_ONE],
      votes: [buildVote(socialPolicy.id, 'SOCIAL')],
      resolvedEvents: [],
      nextEventIds: [],
      summary: [
        'Bantuan sosial tepat sasaran mulai berjalan.',
        'Kas turun Rp1,4 T setelah biaya awal dan belanja rutin.',
        'Persetujuan publik naik tipis, kepercayaan stabil.',
      ],
    },
    {
      turn: 2,
      year: 2031,
      quarter: 2,
      presidentName,
      indicatorsBefore: REPORT_TWO_BEFORE,
      indicatorsAfter: REPORT_TWO_AFTER,
      treasuryBeforeBillion: 148_600,
      treasuryAfterBillion: 146_900,
      ledger: [...LEDGER_TWO],
      votes: [],
      resolvedEvents: floodEvent === undefined ? [] : [{ eventId: floodEvent.id, choiceId: 'A' }],
      nextEventIds: [],
      summary: [
        'Banjir pesisir ditangani dengan dana darurat penuh.',
        'Respons cepat menahan penurunan persetujuan publik.',
        'Kas berkurang Rp1,7 T pada kuartal bencana.',
      ],
    },
    {
      turn: 3,
      year: 2031,
      quarter: 3,
      presidentName,
      indicatorsBefore: REPORT_THREE_BEFORE,
      indicatorsAfter: REPORT_THREE_AFTER,
      treasuryBeforeBillion: 146_900,
      treasuryAfterBillion: 145_800,
      ledger: [...LEDGER_THREE],
      votes: [buildVote(fiscalPolicy.id, 'FISCAL')],
      resolvedEvents: [],
      nextEventIds: [],
      summary: [
        'Pembaruan pajak konsumsi lolos dengan 51 kursi.',
        'Penerimaan baru memperkuat kesehatan fiskal.',
        'Kepercayaan publik melemah setelah beban pajak terasa.',
      ],
    },
    {
      turn: 4,
      year: 2031,
      quarter: 4,
      presidentName,
      indicatorsBefore: REPORT_FOUR_BEFORE,
      indicatorsAfter: REPORT_FOUR_AFTER,
      treasuryBeforeBillion: 145_800,
      treasuryAfterBillion: 144_600,
      ledger: [...LEDGER_FOUR],
      votes: [],
      resolvedEvents: [],
      nextEventIds: [],
      summary: [
        'Reformasi subsidi energi mulai berlaku.',
        'Inflasi naik, tetapi efisiensi anggaran terlihat.',
        'Kementerian Energi menyerap beban reformasi terbesar.',
      ],
    },
    {
      turn: 5,
      year: 2032,
      quarter: 1,
      presidentName,
      indicatorsBefore: REPORT_FIVE_BEFORE,
      indicatorsAfter: REPORT_FIVE_AFTER,
      treasuryBeforeBillion: 144_600,
      treasuryAfterBillion: mockGameState.treasuryBillion,
      ledger: [...LEDGER_FIVE],
      votes: [buildVote(fiscalPolicy.id, 'FISCAL')],
      resolvedEvents: [],
      nextEventIds: protestEvent === undefined ? [] : [protestEvent.id],
      summary: [...mockLatestSummary],
    },
  ];
  return reports.map(withDerivedFields);
}

export const mockHistory = createMockHistory();

export function voteFactionName(factionId: string): string {
  return factionName(factionId);
}

export function policyName(definitions: GameDefinitions, policyId: string): string {
  return definitions.policies.find((policy) => policy.id === policyId)?.name ?? policyId;
}
