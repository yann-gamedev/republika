import { loadGameDefinitions } from '@republika/game-data';
import {
  GAME_STATE_VERSION,
  gameStateSchema,
  type EventDefinition,
  type GameDefinitions,
  type GameState,
  type Indicators,
  type PolicyCategory,
  type PolicyDefinition,
} from '@republika/shared';

const loadedContent = loadGameDefinitions();
const definitions = loadedContent.definitions;

const DEFAULT_PRESIDENT = 'Arunika Wicaksana';
const DEFAULT_CABINET = 'Kabinet Cakrawala';

interface FactionPresentation {
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
}

interface NamedPresentation {
  readonly name: string;
  readonly description: string;
}

const FACTION_PRESENTATION: Readonly<Record<string, FactionPresentation>> = {
  'FAC-PLACEHOLDER-01': {
    name: 'Fraksi Cakrawala Nusantara',
    shortName: 'CN',
    description: 'Fraksi teknokrat yang mengutamakan disiplin anggaran dan kepastian regulasi.',
  },
  'FAC-PLACEHOLDER-02': {
    name: 'Fraksi Suara Rakyat',
    shortName: 'SR',
    description: 'Fraksi populis yang mendorong bantuan langsung dan perlindungan upah.',
  },
  'FAC-PLACEHOLDER-03': {
    name: 'Fraksi Hijau Bahari',
    shortName: 'HB',
    description: 'Fraksi progresif-lingkungan yang memprioritaskan transisi energi.',
  },
  'FAC-PLACEHOLDER-04': {
    name: 'Fraksi Tertib Negara',
    shortName: 'TN',
    description: 'Fraksi religius-konservatif yang menekankan ketertiban sosial.',
  },
  'FAC-PLACEHOLDER-05': {
    name: 'Fraksi Bumi Mandiri',
    shortName: 'BM',
    description: 'Fraksi nasionalis yang mengutamakan kemandirian ekonomi.',
  },
  'FAC-PLACEHOLDER-06': {
    name: 'Fraksi Daerah Bersatu',
    shortName: 'DB',
    description: 'Fraksi regionalis yang memperjuangkan anggaran daerah.',
  },
};

const MINISTRY_NAMES: Readonly<Record<string, string>> = {
  'MIN-PLACEHOLDER-FISCAL': 'Kementerian Keuangan',
  'MIN-PLACEHOLDER-SOCIAL': 'Kementerian Sosial',
  'MIN-PLACEHOLDER-ENERGY': 'Kementerian Energi',
  'MIN-PLACEHOLDER-GOVERNANCE': 'Kementerian Dalam Negeri',
};

const POLICY_PRESENTATION: Readonly<Record<string, NamedPresentation>> = {
  'POL-FISCAL-PLACEHOLDER-001': {
    name: 'Pembaruan Pajak Konsumsi',
    description:
      'Memperluas basis penerimaan tanpa menaikkan tarif secara mendadak. Manfaat fiskal datang perlahan, reaksi publik datang lebih cepat.',
  },
  'POL-SOCIAL-PLACEHOLDER-001': {
    name: 'Bantuan Sosial Tepat Sasaran',
    description:
      'Menyalurkan bantuan langsung dengan verifikasi data penerima. Menopang daya beli, tetapi membebani kas setiap kuartal.',
  },
  'POL-ENERGY-PLACEHOLDER-001': {
    name: 'Reformasi Subsidi Energi',
    description:
      'Mengalihkan subsidi menyeluruh menjadi bantuan tepat sasaran secara bertahap. Anggaran lebih sehat, harga terasa di awal.',
  },
  'POL-GOVERNANCE-PLACEHOLDER-001': {
    name: 'Penyederhanaan Birokrasi',
    description:
      'Memangkas lapisan perizinan dan memindahkan layanan ke kanal digital. Stabilitas membaik, sebagian aparat kehilangan posisi.',
  },
};

const EVENT_PRESENTATION: Readonly<Record<string, NamedPresentation>> = {
  'EVT-PLACEHOLDER-001': {
    name: 'Banjir Besar di Pesisir Utara',
    description:
      'Hujan ekstrem merendam tiga kabupaten pesisir. Pemerintah daerah meminta dukungan darurat sebelum kerugian meluas.',
  },
  'EVT-PLACEHOLDER-002': {
    name: 'Unjuk Rasa Mahasiswa',
    description:
      'Kelompok mahasiswa menuntut transparansi anggaran setelah bencana sebelumnya. Massa berkumpul di depan gedung parlemen.',
  },
};

const ARCHETYPE_PRESENTATION: Readonly<Record<string, NamedPresentation>> = {
  'ARC-PLACEHOLDER-FISCAL': {
    name: 'Teknokrat Fiskal',
    description: 'Kas negara terjaga ketat, meski dukungan publik sering dikorbankan.',
  },
};

function applyFactionPresentation(factionId: string, current: GameDefinitions['factions'][number]) {
  const override = FACTION_PRESENTATION[factionId];
  return override === undefined ? current : { ...current, ...override };
}

function applyNamedPresentation<T extends { readonly id: string; readonly name: string }>(
  item: T,
  overrides: Readonly<Record<string, NamedPresentation>>,
): T {
  const override = overrides[item.id];
  if (override === undefined) return item;
  return { ...item, name: override.name, description: override.description };
}

function applyEventPresentation(
  event: EventDefinition,
  overrides: Readonly<Record<string, NamedPresentation>>,
): EventDefinition {
  const override = overrides[event.id];
  if (override === undefined) return event;
  return { ...event, title: override.name, body: override.description };
}

/** Nama tampilan mock dipisah dari konten placeholder agar layar terasa seperti produk jadi. */
export const mockDefinitions: GameDefinitions = {
  ...definitions,
  factions: definitions.factions.map((faction) => applyFactionPresentation(faction.id, faction)),
  ministries: definitions.ministries.map((ministry) => {
    const name = MINISTRY_NAMES[ministry.id];
    return name === undefined ? ministry : { ...ministry, name };
  }),
  policies: definitions.policies.map((policy) =>
    applyNamedPresentation(policy, POLICY_PRESENTATION),
  ),
  events: definitions.events.map((event) => applyEventPresentation(event, EVENT_PRESENTATION)),
  archetypes: definitions.archetypes.map((archetype) =>
    applyNamedPresentation(archetype, ARCHETYPE_PRESENTATION),
  ),
};

export function mockFactionName(factionId: string): string {
  return mockDefinitions.factions.find((faction) => faction.id === factionId)?.name ?? factionId;
}

export function mockMinistryName(ministryId: string): string {
  return (
    mockDefinitions.ministries.find((ministry) => ministry.id === ministryId)?.name ?? ministryId
  );
}

export function mockPolicyName(policyId: string): string {
  return mockDefinitions.policies.find((policy) => policy.id === policyId)?.name ?? policyId;
}

export const mockContentNames = {
  factionName: mockFactionName,
  ministryName: mockMinistryName,
  policyName: mockPolicyName,
} as const;

export function findPolicyByCategory(category: PolicyCategory): PolicyDefinition {
  const policy = mockDefinitions.policies.find((item) => item.category === category);
  if (policy === undefined) {
    throw new Error(`Konten mock tidak memiliki kebijakan kategori ${category}.`);
  }
  return policy;
}

function findEvent(index: number): EventDefinition {
  const event = mockDefinitions.events[index];
  if (event === undefined) {
    throw new Error('Konten mock membutuhkan minimal dua event.');
  }
  return event;
}

const energyPolicy = findPolicyByCategory('ENERGY');
const fiscalPolicy = findPolicyByCategory('FISCAL');
const socialPolicy = findPolicyByCategory('SOCIAL');
const floodEvent = findEvent(0);
const protestEvent = findEvent(1);

const MOCK_FACTION_SUPPORT = [560, 480, 515, 535, 505, 492] as const;
const MOCK_MINISTRY_EFFECTIVENESS = [67, 61, 58, 63] as const;

const baseMockState = {
  stateVersion: GAME_STATE_VERSION,
  rulesetVersion: definitions.scenario.rulesetVersion,
  seed: 'mock-seed',
  // DECISION: mock UI memakai kampanye 20 kuartal agar tata letak teruji,
  // sementara konten Tahap 1 masih vertical slice 4 kuartal.
  turn: 6,
  maxTurns: 20,
  status: 'active' as const,
  actionPointsPerTurn: definitions.scenario.actionPointsPerTurn,
  actionPointsRemaining: 1,
  treasuryBillion: 143_500,
  indicators: {
    approval: 542,
    stability: 618,
    fiscalHealth: 571,
    growthPct: 46,
    inflationPct: 38,
    unemploymentPct: 52,
    welfare: 534,
    trust: 508,
  },
  factions: mockDefinitions.factions.map((faction, index) => ({
    factionId: faction.id,
    supportTenths: MOCK_FACTION_SUPPORT[index] ?? faction.initialSupportTenths,
  })),
  ministries: mockDefinitions.ministries.map((ministry, index) => ({
    ministryId: ministry.id,
    effectiveness: MOCK_MINISTRY_EFFECTIVENESS[index] ?? ministry.initialEffectiveness,
  })),
  activePolicies: [
    {
      policyId: energyPolicy.id,
      enactedTurn: 4,
      remainingTurns: 3,
      perTurnCostBillion: energyPolicy.perTurnCostBillion,
      lastTickedTurn: 5,
    },
    {
      policyId: socialPolicy.id,
      enactedTurn: 4,
      remainingTurns: 2,
      perTurnCostBillion: socialPolicy.perTurnCostBillion,
      lastTickedTurn: 5,
    },
  ],
  pendingCommands: [
    {
      type: 'ENACT_POLICY' as const,
      commandId: 'mock-command-001',
      policyId: fiscalPolicy.id,
      apCost: fiscalPolicy.apCost,
    },
  ],
  pendingEvents: [
    {
      eventId: protestEvent.id,
      arrivedTurn: 6,
      resolvedChoiceId: null,
    },
  ],
  commandIdsThisTurn: ['mock-command-001'],
  lobbyThisTurn: [
    mockDefinitions.factions[2]?.id ?? mockDefinitions.factions[0]?.id ?? 'FAC-UNKNOWN-01',
  ],
  // DECISION: tidak ada cooldown aktif pada mock agar katalog punya satu
  // kebijakan yang bisa diajukan. Cooldown tetap dirender bila state memuatnya.
  policyCooldowns: {},
  eventCooldowns: { [floodEvent.id]: 1 },
  eventsFired: [floodEvent.id, protestEvent.id],
  flags: ['PLACEHOLDER_FLOOD_HANDLED'],
  delayedEffects: [
    {
      sourceType: 'POLICY' as const,
      sourceId: energyPolicy.id,
      createdTurn: 4,
      remainingTurns: 1,
      effect: {
        type: 'MODIFY_INDICATOR' as const,
        target: 'welfare' as const,
        deltaTenths: 30,
        timing: 'DELAYED' as const,
        delayTurns: 2,
        reasonCode: 'PLACEHOLDER_TARGETED_AID',
      },
    },
  ],
  campaignStats: {
    policiesEnacted: 3,
    policiesByCategory: {
      FISCAL: 1,
      SOCIAL: 1,
      ENERGY: 1,
      GOVERNANCE: 0,
    },
    votesHeld: 3,
    votesFailed: 1,
    lobbies: 5,
    eventsResolved: 1,
    totalDeficitBillion: 0,
    totalPolicySpendingBillion: 9_000,
  },
};

/**
 * State contoh untuk semua layar Tahap 1. Fungsi ini mengembalikan state yang
 * sudah lolos schema; UI hanya membaca, tidak memodifikasi.
 */
export function createMockGameState(
  presidentName: string = DEFAULT_PRESIDENT,
  cabinetName: string = DEFAULT_CABINET,
): GameState {
  const trimmedCabinet = cabinetName.trim();
  return gameStateSchema.parse({
    ...baseMockState,
    presidentName: presidentName.trim(),
    ...(trimmedCabinet.length > 0 ? { cabinetName: trimmedCabinet } : {}),
  });
}

export const mockGameState = createMockGameState();

export const mockPreviousIndicators: Indicators = {
  approval: 552,
  stability: 616,
  fiscalHealth: 568,
  growthPct: 46,
  inflationPct: 39,
  unemploymentPct: 53,
  welfare: 532,
  trust: 512,
};

export interface MockTrendPoint {
  readonly turn: number;
  readonly year: number;
  readonly quarter: number;
  readonly approvalTenths: number;
  readonly trustTenths: number;
}

export const mockTrend: readonly MockTrendPoint[] = [
  { turn: 1, year: 2031, quarter: 1, approvalTenths: 572, trustTenths: 516 },
  { turn: 2, year: 2031, quarter: 2, approvalTenths: 566, trustTenths: 510 },
  { turn: 3, year: 2031, quarter: 3, approvalTenths: 558, trustTenths: 505 },
  { turn: 4, year: 2031, quarter: 4, approvalTenths: 552, trustTenths: 512 },
  { turn: 5, year: 2032, quarter: 1, approvalTenths: 542, trustTenths: 508 },
];

export const mockLatestSummary = [
  'Kebijakan fiskal lolos dengan 51 kursi setelah lobi fraksi tengah.',
  'Kas turun Rp1,1 T untuk belanja sosial dan biaya administrasi.',
  'Persetujuan publik melemah 1,0 poin, tetapi kepercayaan mulai stabil.',
] as const;

export const mockLatestReport = {
  turn: 5,
  year: 2032,
  quarter: 1,
  approvalDeltaTenths: -10,
  treasuryDeltaBillion: -1_100,
  summary: mockLatestSummary,
} as const;

export const mockMinisterNames: Readonly<Record<string, string>> = {
  'MIN-PLACEHOLDER-FISCAL': 'Damar Prasetya',
  'MIN-PLACEHOLDER-SOCIAL': 'Sekar Wulandari',
  'MIN-PLACEHOLDER-ENERGY': 'Bima Argapati',
  'MIN-PLACEHOLDER-GOVERNANCE': 'Nadia Prameswari',
};

export const mockContentHash = loadedContent.contentHash;
export const mockContentWarnings = loadedContent.warnings;
export const mockRulesetVersion = definitions.scenario.rulesetVersion;
export const mockStartYear = definitions.scenario.startYear;
