import {
  INDICATOR_DOMAINS,
  type EffectRule,
  type EventChoice,
  type GameDefinitions,
  type GameState,
  type IndicatorKey,
} from '@republika/shared';

import { applyCommand, type PlayerCommand } from '../../src/core/commands.js';
import { compareIds } from '../../src/core/order.js';
import type { Rng } from '../../src/core/rng.js';
import { projectPolicy } from '../../src/policies/projection.js';
import { predictVote } from '../../src/politics/voting.js';

/** Command tanpa commandId (Omit yang terdistribusi ke tiap anggota union). */
type CommandInput = PlayerCommand extends unknown
  ? PlayerCommand extends infer C
    ? C extends PlayerCommand
      ? Omit<C, 'commandId'>
      : never
    : never
  : never;

export const STRATEGIES = ['random', 'greedy-approval', 'austerity', 'welfare', 'no-op'] as const;
export type Strategy = (typeof STRATEGIES)[number];

/** Bobot tujuan bot: nilai positif = ingin indikator naik. Kas dalam per triliun. */
interface Objective {
  readonly indicators: Partial<Record<IndicatorKey, number>>;
  readonly treasuryPerTrillion: number;
}

const OBJECTIVES: Record<Exclude<Strategy, 'random' | 'no-op'>, Objective> = {
  'greedy-approval': { indicators: { approval: 1 }, treasuryPerTrillion: 0 },
  austerity: { indicators: { fiscalHealth: 1 }, treasuryPerTrillion: 0.05 },
  welfare: {
    indicators: { welfare: 1, unemploymentPct: -0.5, approval: 0.3 },
    treasuryPerTrillion: 0,
  },
};

/** Nilai perubahan indikator ternormalisasi rentang domain (−1..1 per rentang penuh). */
function indicatorScore(objective: Objective, key: IndicatorKey, deltaTenths: number): number {
  const weight = objective.indicators[key] ?? 0;
  const domain = INDICATOR_DOMAINS[key];
  return (weight * deltaTenths) / ((domain.max - domain.min) * 10);
}

function effectScore(objective: Objective, effect: EffectRule): number {
  if (effect.type === 'MODIFY_INDICATOR')
    return indicatorScore(objective, effect.target, effect.deltaTenths);
  if (effect.type === 'MODIFY_TREASURY')
    return (objective.treasuryPerTrillion * effect.deltaBillion) / 1000;
  return 0;
}

function policyScore(
  objective: Objective,
  state: GameState,
  defs: GameDefinitions,
  policyId: string,
): number {
  const projection = projectPolicy(state, policyId, defs);
  const indicators = projection.indicators.reduce(
    (sum, item) => sum + indicatorScore(objective, item.indicator, item.expectedTenths),
    0,
  );
  const treasury =
    (objective.treasuryPerTrillion *
      (projection.treasuryEffectBillion - projection.totalCostBillion)) /
    1000;
  return indicators + treasury;
}

function neutralChoice(choices: readonly EventChoice[]): EventChoice | undefined {
  return choices.find((choice) => choice.neutral) ?? choices[0];
}

function chooseEvent(
  strategy: Strategy,
  choices: readonly EventChoice[],
  rng: Rng,
): EventChoice | undefined {
  if (strategy === 'no-op') return neutralChoice(choices);
  if (strategy === 'random') return choices[rng.nextInt(0, choices.length - 1)];
  const objective = OBJECTIVES[strategy];
  return [...choices].sort((a, b) => {
    const score = (choice: EventChoice) =>
      choice.effects.reduce((sum, effect) => sum + effectScore(objective, effect), 0);
    return score(b) - score(a) || compareIds(a.id, b.id);
  })[0];
}

/**
 * Keputusan bot untuk satu kuartal: jawab semua event, lalu ajukan kebijakan
 * dan lobi sesuai strategi. Murni dan deterministik (keacakan dari `rng`).
 * Command yang ditolak engine dilewati.
 */
export function playQuarter(
  strategy: Strategy,
  start: GameState,
  defs: GameDefinitions,
  rng: Rng,
): GameState {
  let state = start;
  let counter = 0;
  const tryCommand = (command: CommandInput): boolean => {
    counter += 1;
    const result = applyCommand(
      state,
      { ...command, commandId: `bot-${state.turn}-${counter}` } as PlayerCommand,
      defs,
    );
    state = result.state;
    return result.error === undefined;
  };

  for (const pending of [...state.pendingEvents].sort((a, b) => compareIds(a.eventId, b.eventId))) {
    const event = defs.events.find((item) => item.id === pending.eventId);
    const choice = event === undefined ? undefined : chooseEvent(strategy, event.choices, rng);
    if (choice !== undefined)
      tryCommand({ type: 'RESPOND_EVENT', eventId: pending.eventId, choiceId: choice.id });
  }

  if (strategy === 'no-op') return state;

  const policies = [...defs.policies].sort((a, b) => compareIds(a.id, b.id));
  if (strategy === 'random') {
    const shuffled = [...policies];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = rng.nextInt(0, index);
      [shuffled[index], shuffled[swap]] = [
        shuffled[swap] as (typeof shuffled)[number],
        shuffled[index] as (typeof shuffled)[number],
      ];
    }
    for (const policy of shuffled) {
      if (state.actionPointsRemaining === 0) break;
      if (rng.nextInt(0, 1) === 1) tryCommand({ type: 'ENACT_POLICY', policyId: policy.id });
    }
    const factions = [...defs.factions].sort((a, b) => compareIds(a.id, b.id));
    if (state.actionPointsRemaining > 0 && factions.length > 0 && rng.nextInt(0, 2) === 0) {
      const faction = factions[rng.nextInt(0, factions.length - 1)];
      if (faction !== undefined) tryCommand({ type: 'LOBBY_FACTION', factionId: faction.id });
    }
    return state;
  }

  const objective = OBJECTIVES[strategy];
  const ranked = policies
    .map((policy) => ({ policy, score: policyScore(objective, state, defs, policy.id) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || compareIds(a.policy.id, b.policy.id));
  for (const { policy } of ranked) {
    if (state.actionPointsRemaining === 0) break;
    tryCommand({ type: 'ENACT_POLICY', policyId: policy.id });
  }

  // Sisa AP: lobi fraksi penolak dengan skor tertinggi untuk voting yang diprediksi gagal.
  for (const pending of state.pendingCommands) {
    if (state.actionPointsRemaining === 0) break;
    if (pending.type !== 'ENACT_POLICY') continue;
    const policy = defs.policies.find((item) => item.id === pending.policyId);
    if (policy?.needsVote !== true) continue;
    const prediction = predictVote(state, policy.id, defs);
    if (prediction.passed) continue;
    const target = [...prediction.byFaction]
      .filter((faction) => faction.vote === 'AGAINST')
      .sort((a, b) => b.scoreTenths - a.scoreTenths || compareIds(a.factionId, b.factionId))[0];
    if (target !== undefined) tryCommand({ type: 'LOBBY_FACTION', factionId: target.factionId });
  }
  return state;
}
