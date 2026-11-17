import {
  GAME_STATE_VERSION,
  cabinetNameSchema,
  presidentNameSchema,
  type GameDefinitions,
  type GameState,
  type Indicators,
  type ScenarioDefinition,
} from '@republika/shared';

import { sortById } from './order.js';

function zeroIndicators(): Indicators {
  return {
    approval: 0,
    stability: 0,
    fiscalHealth: 0,
    growthPct: 0,
    inflationPct: 0,
    unemploymentPct: 0,
    welfare: 0,
    trust: 0,
  };
}

export interface InaugurationInput {
  readonly presidentName: string;
  readonly cabinetName?: string;
  /** Seed PRNG kampanye; diambil di lapisan platform, bukan di engine. */
  readonly seed: string;
}

/**
 * Membuat state kuartal 1 dari skenario dan definisi konten. Nama presiden
 * divalidasi (2–40 karakter, di-trim, tanpa karakter kontrol). Fraksi dan
 * kementerian disimpan terurut ID.
 */
export function createInitialState(
  scenario: ScenarioDefinition,
  defs: GameDefinitions,
  input: InaugurationInput,
): GameState {
  const presidentName = presidentNameSchema.parse(input.presidentName);
  const cabinetName =
    input.cabinetName === undefined ? '' : cabinetNameSchema.parse(input.cabinetName);
  if (input.seed.length === 0) throw new Error('Seed kampanye wajib diisi.');

  return {
    stateVersion: GAME_STATE_VERSION,
    presidentName,
    ...(cabinetName.length > 0 ? { cabinetName } : {}),
    rulesetVersion: scenario.rulesetVersion,
    seed: input.seed,
    turn: 1,
    maxTurns: scenario.maxTurns,
    status: 'active',
    actionPointsPerTurn: scenario.actionPointsPerTurn,
    actionPointsRemaining: scenario.actionPointsPerTurn,
    treasuryBillion: scenario.initialTreasuryBillion,
    indicators: { ...scenario.initialIndicators },
    factions: sortById(defs.factions, (faction) => faction.id).map((faction) => ({
      factionId: faction.id,
      supportTenths: faction.initialSupportTenths,
    })),
    ministries: sortById(defs.ministries, (ministry) => ministry.id).map((ministry) => ({
      ministryId: ministry.id,
      effectiveness: ministry.initialEffectiveness,
    })),
    activePolicies: [],
    pendingCommands: [],
    pendingEvents: [],
    lobbyThisTurn: [],
    commandIdsThisTurn: [],
    policyCooldowns: {},
    eventCooldowns: {},
    eventsFired: [],
    flags: [],
    delayedEffects: [],
    campaignStats: {
      policiesEnacted: 0,
      policiesByCategory: { FISCAL: 0, SOCIAL: 0, ENERGY: 0, GOVERNANCE: 0 },
      votesHeld: 0,
      votesFailed: 0,
      lobbies: 0,
      eventsResolved: 0,
      totalDeficitBillion: 0,
      totalPolicySpendingBillion: 0,
      quartersPlayed: 0,
      indicatorSums: zeroIndicators(),
      indicatorMin: { ...scenario.initialIndicators },
      indicatorMax: { ...scenario.initialIndicators },
    },
  };
}
