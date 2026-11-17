import type { GameDefinitions, GameState, PendingCommand, VoteOutcome } from '@republika/shared';

import { indexDefinitions } from '../core/definitions.js';
import type { Ledger } from '../core/ledger.js';
import { compareIds } from '../core/order.js';
import { activatePolicy } from '../policies/lifecycle.js';

/** Ambang skor fraksi dalam persepuluhan (50,0). */
export const FACTION_YES_THRESHOLD_TENTHS = 500;
/** Kursi minimal agar kebijakan lolos (dari 100). */
export const PASS_SEATS = 51;
/** Voting gagal: trust −2,0 (AGENT §5.5). */
export const VOTE_FAIL_TRUST_PENALTY_TENTHS = 20;
/** Voting gagal: cooldown 1 kuartal. */
export const VOTE_FAIL_COOLDOWN_TURNS = 1;

/** Bonus lobi per fraksi (persepuluhan), hanya untuk voting turn berjalan. */
export type LobbyBonuses = Readonly<Record<string, number>>;

export interface FactionVotePrediction {
  readonly factionId: string;
  readonly seats: number;
  readonly supportTenths: number;
  readonly preference: number;
  readonly lobbyBonusTenths: number;
  /** support + preference × 10 + lobi, dalam persepuluhan. */
  readonly scoreTenths: number;
  readonly vote: 'FOR' | 'AGAINST';
}

export interface VotePrediction {
  readonly policyId: string;
  readonly yesSeats: number;
  readonly noSeats: number;
  readonly passed: boolean;
  readonly byFaction: readonly FactionVotePrediction[];
}

/**
 * Prediksi voting AGENT §5.5. Skor fraksi = support + preference[kategori] × 10
 * + bonus lobi; fraksi setuju sebagai blok jika skor ≥ 50. Lolos jika ≥ 51 kursi.
 */
export function predictVote(
  state: GameState,
  policyId: string,
  defs: GameDefinitions,
  lobbyBonuses: LobbyBonuses = {},
): VotePrediction {
  const index = indexDefinitions(defs);
  const policy = index.policies.get(policyId);
  if (policy === undefined) throw new Error(`Kebijakan ${policyId} tidak ditemukan.`);
  const byFaction = index.factionsSorted.map((faction): FactionVotePrediction => {
    const supportTenths =
      state.factions.find((item) => item.factionId === faction.id)?.supportTenths ??
      faction.initialSupportTenths;
    const preference = faction.policyPreferences[policy.category];
    const lobbyBonusTenths = lobbyBonuses[faction.id] ?? 0;
    const scoreTenths = supportTenths + preference * 100 + lobbyBonusTenths;
    return {
      factionId: faction.id,
      seats: faction.seats,
      supportTenths,
      preference,
      lobbyBonusTenths,
      scoreTenths,
      vote: scoreTenths >= FACTION_YES_THRESHOLD_TENTHS ? 'FOR' : 'AGAINST',
    };
  });
  const yesSeats = byFaction
    .filter((faction) => faction.vote === 'FOR')
    .reduce((sum, faction) => sum + faction.seats, 0);
  const totalSeats = byFaction.reduce((sum, faction) => sum + faction.seats, 0);
  return {
    policyId,
    yesSeats,
    noSeats: totalSeats - yesSeats,
    passed: yesSeats >= PASS_SEATS,
    byFaction,
  };
}

export function toVoteOutcome(prediction: VotePrediction): VoteOutcome {
  return {
    policyId: prediction.policyId,
    seatsFor: prediction.yesSeats,
    seatsAgainst: prediction.noSeats,
    passed: prediction.passed,
    factionVotes: prediction.byFaction.map((faction) => ({
      factionId: faction.factionId,
      supportTenths: Math.max(0, Math.min(1000, faction.supportTenths)),
      score: faction.scoreTenths,
      vote: faction.vote,
    })),
  };
}

/**
 * Langkah 3: memproses lobi pending (urut factionId). Memotong kas, mencatat
 * bonus ke ledger, dan mengembalikan peta bonus untuk voting turn ini saja.
 */
export function applyLobbies(
  work: GameState,
  pending: readonly PendingCommand[],
  defs: GameDefinitions,
  ledger: Ledger,
): LobbyBonuses {
  const bonuses: Record<string, number> = {};
  const lobbies = pending
    .filter((command) => command.type === 'LOBBY_FACTION')
    .map((command) => command.factionId)
    .sort(compareIds);
  for (const factionId of lobbies) {
    const before = work.treasuryBillion;
    const cost = defs.scenario.lobbyCostBillion;
    work.treasuryBillion = before - cost;
    ledger.push({
      kind: 'TREASURY',
      sourceType: 'LOBBY',
      sourceId: factionId,
      reasonCode: 'LOBBY_COST',
      target: 'treasury',
      unit: 'billion',
      before,
      delta: -cost,
      after: work.treasuryBillion,
    });
    bonuses[factionId] = defs.scenario.lobbySupportBonusTenths;
    ledger.push({
      kind: 'VOTE',
      sourceType: 'LOBBY',
      sourceId: factionId,
      reasonCode: 'LOBBY_BONUS',
      target: factionId,
      unit: 'tenths',
      delta: defs.scenario.lobbySupportBonusTenths,
    });
    work.lobbyThisTurn = [...work.lobbyThisTurn, factionId];
    work.campaignStats.lobbies += 1;
    work.campaignStats.totalPolicySpendingBillion += cost;
  }
  return bonuses;
}

export interface VoteResolution {
  readonly passed: readonly string[];
  readonly failed: readonly string[];
  readonly outcomes: readonly VoteOutcome[];
}

/**
 * Langkah 4: memproses pengajuan kebijakan urut `policyId`. Kebijakan tanpa
 * voting langsung diaktifkan. Kebijakan yang lolos diaktifkan; yang gagal
 * terkena trust −2,0, cooldown 1 kuartal, tanpa biaya kas (AP tetap terpakai).
 */
export function resolveVotes(
  work: GameState,
  pending: readonly PendingCommand[],
  defs: GameDefinitions,
  lobbyBonuses: LobbyBonuses,
  ledger: Ledger,
): VoteResolution {
  const index = indexDefinitions(defs);
  const passed: string[] = [];
  const failed: string[] = [];
  const outcomes: VoteOutcome[] = [];
  const policyIds = pending
    .filter((command) => command.type === 'ENACT_POLICY')
    .map((command) => command.policyId)
    .sort(compareIds);

  for (const policyId of policyIds) {
    const policy = index.policies.get(policyId);
    if (policy === undefined) continue;
    if (!policy.needsVote) {
      activatePolicy(work, policy, ledger);
      passed.push(policyId);
      continue;
    }
    const prediction = predictVote(work, policyId, defs, lobbyBonuses);
    outcomes.push(toVoteOutcome(prediction));
    work.campaignStats.votesHeld += 1;
    ledger.push({
      kind: 'VOTE',
      sourceType: 'VOTE',
      sourceId: policyId,
      reasonCode: prediction.passed ? 'VOTE_PASSED' : 'VOTE_FAILED',
      target: policyId,
      message: `${prediction.yesSeats}/${prediction.yesSeats + prediction.noSeats} kursi setuju.`,
    });
    if (prediction.passed) {
      activatePolicy(work, policy, ledger);
      passed.push(policyId);
      continue;
    }
    failed.push(policyId);
    work.campaignStats.votesFailed += 1;
    const before = work.indicators.trust;
    work.indicators.trust = before - VOTE_FAIL_TRUST_PENALTY_TENTHS;
    ledger.push({
      kind: 'INDICATOR',
      sourceType: 'VOTE',
      sourceId: policyId,
      reasonCode: 'VOTE_FAILED',
      target: 'trust',
      unit: 'tenths',
      before,
      delta: -VOTE_FAIL_TRUST_PENALTY_TENTHS,
      after: work.indicators.trust,
    });
    work.policyCooldowns = { ...work.policyCooldowns, [policyId]: VOTE_FAIL_COOLDOWN_TURNS };
  }
  return { passed, failed, outcomes };
}
