import { loadGameDefinitions } from '@republika/game-data';
import { sliceFixtureBundle } from '@republika/game-data/fixtures';
import type { GameDefinitions, GameState } from '@republika/shared';

import { createInitialState } from '../src/core/initialState.js';

export const POLICY_ENERGY = 'POL-ENERGY-FX-001';
export const POLICY_FISCAL = 'POL-FISCAL-FX-001';
export const POLICY_SOCIAL = 'POL-SOCIAL-FX-001';
export const FACTION_TECH = 'FAC-FX-01';
export const FACTION_PEOPLE = 'FAC-FX-02';
export const FACTION_REGION = 'FAC-FX-03';
export const EVENT_FLOOD = 'EVT-FX-001';

export const loaded = loadGameDefinitions(sliceFixtureBundle);
export const defs: GameDefinitions = loaded.definitions;

export function newState(seed = 'uji'): GameState {
  return createInitialState(defs.scenario, defs, {
    presidentName: 'Arunika Wicaksana',
    cabinetName: 'Kabinet Cakrawala',
    seed,
  });
}

/** Salinan definisi dengan kebijakan diganti (untuk test kasus khusus). */
export function withPolicies(
  patch: (policies: GameDefinitions['policies']) => GameDefinitions['policies'],
): GameDefinitions {
  return { ...defs, policies: patch(defs.policies) };
}
