import type { GameDefinitions, GameState, TurnReport } from '@republika/shared';

import { createInitialState } from '../src/core/initialState.js';
import { resolveTurn } from '../src/core/resolveTurn.js';
import { createRng } from '../src/core/rng.js';
import { evaluateArchetype } from '../src/report/archetype.js';
import { playQuarter, type Strategy } from './bots/index.js';

export interface CampaignRun {
  readonly strategy: Strategy;
  readonly seed: string;
  readonly initial: GameState;
  readonly final: GameState;
  readonly reports: readonly TurnReport[];
  readonly archetypeName: string | null;
}

/**
 * Menjalankan satu kampanye penuh dengan bot. Murni: seed + strategi + konten
 * yang sama selalu menghasilkan kampanye yang sama.
 */
export function runCampaign(options: {
  readonly defs: GameDefinitions;
  readonly seed: string;
  readonly strategy: Strategy;
  readonly turns?: number;
}): CampaignRun {
  const defs: GameDefinitions =
    options.turns === undefined
      ? options.defs
      : { ...options.defs, scenario: { ...options.defs.scenario, maxTurns: options.turns } };
  const initial = createInitialState(defs.scenario, defs, {
    presidentName: 'Presiden Simulasi',
    seed: options.seed,
  });
  // Stream RNG bot terpisah dari stream event engine.
  const botRng = createRng(`${options.seed}:bot:${options.strategy}`);
  const reports: TurnReport[] = [];
  let state = initial;
  while (state.status === 'active') {
    state = playQuarter(options.strategy, state, defs, botRng);
    const result = resolveTurn(
      state,
      { type: 'END_QUARTER', commandId: `end-${state.turn}` },
      defs,
    );
    if (!result.ok)
      throw new Error(`Bot gagal mengakhiri kuartal ${state.turn}: ${result.error.code}`);
    reports.push(result.report);
    state = result.state;
  }
  const archetype = evaluateArchetype(state, defs.archetypes);
  return {
    strategy: options.strategy,
    seed: options.seed,
    initial,
    final: state,
    reports,
    archetypeName: archetype?.name ?? null,
  };
}
