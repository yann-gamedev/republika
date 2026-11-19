import {
  BACKGROUND_NONE,
  GAME_STATE_VERSION,
  PROMISE_COUNT,
  cabinetNameSchema,
  presidentNameSchema,
  type GameDefinitions,
  type GameState,
  type Honorific,
  type Indicators,
  type LedgerEntry,
  type PortraitHead,
  type ScenarioDefinition,
} from '@republika/shared';

import { officeHoldersFromContent, provincesFromContent } from '../politics/campaignState.js';
import { Ledger } from './ledger.js';
import { clampToDomain } from './math.js';
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
  /** Tahap 6B. Default: Bapak, peci, tanpa latar belakang, tanpa janji. */
  readonly honorific?: Honorific;
  readonly head?: PortraitHead;
  readonly backgroundId?: string;
  readonly promiseIds?: readonly string[];
}

export interface InitialCampaign {
  readonly state: GameState;
  /** Entri `BACKGROUND_APPLIED` (turn 1, ID berawalan `B`) untuk history save. */
  readonly ledger: readonly LedgerEntry[];
}

function validateChoices(
  defs: GameDefinitions,
  backgroundId: string,
  promiseIds: readonly string[],
) {
  if (
    backgroundId !== BACKGROUND_NONE &&
    !defs.backgrounds.some((background) => background.id === backgroundId)
  ) {
    throw new Error(`Latar belakang ${backgroundId} tidak ada di konten.`);
  }
  if (promiseIds.length !== 0 && promiseIds.length !== PROMISE_COUNT) {
    throw new Error(`Pilih tepat ${PROMISE_COUNT} janji kampanye.`);
  }
  if (new Set(promiseIds).size !== promiseIds.length) {
    throw new Error('Janji kampanye tidak boleh ganda.');
  }
  for (const id of promiseIds) {
    if (!defs.promises.some((promise) => promise.id === id)) {
      throw new Error(`Janji ${id} tidak ada di konten.`);
    }
  }
}

/**
 * State kuartal 1 dari skenario dan konten, plus modifier latar belakang yang
 * diterapkan tepat sekali di sini (ledger `BACKGROUND_APPLIED`). Nama presiden
 * divalidasi (2–40 karakter, di-trim, tanpa karakter kontrol). Fraksi,
 * kementerian, jabatan, dan provinsi disimpan terurut ID.
 */
export function createCampaign(
  scenario: ScenarioDefinition,
  defs: GameDefinitions,
  input: InaugurationInput,
): InitialCampaign {
  const presidentName = presidentNameSchema.parse(input.presidentName);
  const cabinetName =
    input.cabinetName === undefined ? '' : cabinetNameSchema.parse(input.cabinetName);
  if (input.seed.length === 0) throw new Error('Seed kampanye wajib diisi.');
  const backgroundId = input.backgroundId ?? BACKGROUND_NONE;
  const promiseIds = [...(input.promiseIds ?? [])].sort();
  validateChoices(defs, backgroundId, promiseIds);

  const indicators: Indicators = { ...scenario.initialIndicators };
  let treasuryBillion = scenario.initialTreasuryBillion;
  const ledger = new Ledger(1, 'B');
  const background = defs.backgrounds.find((item) => item.id === backgroundId);
  for (const modifier of background?.startModifiers ?? []) {
    const before = indicators[modifier.target];
    const after = clampToDomain(modifier.target, before + modifier.deltaTenths);
    indicators[modifier.target] = after;
    ledger.push({
      kind: 'INDICATOR',
      sourceType: 'BACKGROUND',
      sourceId: backgroundId,
      reasonCode: 'BACKGROUND_APPLIED',
      target: modifier.target,
      unit: 'tenths',
      before,
      delta: after - before,
      after,
    });
  }
  if (background !== undefined && background.treasuryBillion !== 0) {
    ledger.push({
      kind: 'TREASURY',
      sourceType: 'BACKGROUND',
      sourceId: backgroundId,
      reasonCode: 'BACKGROUND_APPLIED',
      target: 'treasury',
      unit: 'billion',
      before: treasuryBillion,
      delta: background.treasuryBillion,
      after: treasuryBillion + background.treasuryBillion,
    });
    treasuryBillion += background.treasuryBillion;
  }

  const state: GameState = {
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
    treasuryBillion,
    indicators,
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
      // Statistik min/max mulai dari nilai awal setelah latar belakang.
      indicatorMin: { ...indicators },
      indicatorMax: { ...indicators },
    },
    president: {
      honorific: input.honorific ?? 'Bapak',
      head: input.head ?? 'peci',
      backgroundId,
    },
    promiseIds,
    ...officeHoldersFromContent(defs),
    reshuffleUsedTurn: 0,
    provinces: provincesFromContent(defs),
  };
  return { state, ledger: ledger.entries };
}

/** Bentuk lama: hanya state (ledger latar belakang dibuang). */
export function createInitialState(
  scenario: ScenarioDefinition,
  defs: GameDefinitions,
  input: InaugurationInput,
): GameState {
  return createCampaign(scenario, defs, input).state;
}
