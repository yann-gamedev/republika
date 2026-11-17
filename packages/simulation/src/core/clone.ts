import type { GameState } from '@republika/shared';

/** Salinan dalam state. State selalu JSON murni, jadi serialisasi JSON aman dan deterministik. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
