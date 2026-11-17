import type { GameState, LedgerEntry, TurnReport } from '@republika/shared';

import { applyCommand, type PlayerCommand } from '../src/core/commands.js';
import { resolveTurn } from '../src/core/resolveTurn.js';
import {
  EVENT_FLOOD,
  FACTION_REGION,
  FACTION_TECH,
  POLICY_ENERGY,
  POLICY_FISCAL,
  POLICY_SOCIAL,
  defs,
  newState,
} from './helpers.js';

/**
 * Skrip tetap 4 kuartal untuk fixture engine:
 *  K1 Energi (tanpa voting) + Fiskal (gagal voting → cooldown 1).
 *  K2 Fiskal ditolak (ON_COOLDOWN); lobi dua fraksi.
 *  K3 event banjir disuntikkan → opsi A; Fiskal + lobi Daerah → lolos.
 *  K4 Energi habis (cooldown), Sosial diajukan.
 */
export const SCRIPT: ReadonlyArray<ReadonlyArray<PlayerCommand>> = [
  [
    { type: 'ENACT_POLICY', commandId: 'k1-energy', policyId: POLICY_ENERGY },
    { type: 'ENACT_POLICY', commandId: 'k1-fiscal', policyId: POLICY_FISCAL },
  ],
  [
    { type: 'ENACT_POLICY', commandId: 'k2-fiscal', policyId: POLICY_FISCAL },
    { type: 'LOBBY_FACTION', commandId: 'k2-lobby-tech', factionId: FACTION_TECH },
    { type: 'LOBBY_FACTION', commandId: 'k2-lobby-region', factionId: FACTION_REGION },
  ],
  [
    { type: 'RESPOND_EVENT', commandId: 'k3-flood', eventId: EVENT_FLOOD, choiceId: 'A' },
    { type: 'ENACT_POLICY', commandId: 'k3-fiscal', policyId: POLICY_FISCAL },
    { type: 'LOBBY_FACTION', commandId: 'k3-lobby-region', factionId: FACTION_REGION },
  ],
  [{ type: 'ENACT_POLICY', commandId: 'k4-social', policyId: POLICY_SOCIAL }],
];

export interface ScriptRun {
  readonly initial: GameState;
  readonly states: readonly GameState[];
  readonly reports: readonly TurnReport[];
  readonly ledger: readonly LedgerEntry[];
  readonly rejections: ReadonlyArray<{ turn: number; commandId: string; code: string }>;
}

export function runScript(seed = 'fixture-4q'): ScriptRun {
  const initial = newState(seed);
  let state = initial;
  const states: GameState[] = [];
  const reports: TurnReport[] = [];
  const ledger: LedgerEntry[] = [];
  const rejections: Array<{ turn: number; commandId: string; code: string }> = [];
  SCRIPT.forEach((commands, position) => {
    if (position === 2) {
      // Pemilihan event masih stub (Tahap 3); event disuntikkan agar jalur respons teruji.
      state = {
        ...state,
        pendingEvents: [{ eventId: EVENT_FLOOD, arrivedTurn: state.turn, resolvedChoiceId: null }],
      };
    }
    for (const command of commands) {
      const result = applyCommand(state, command, defs);
      if (result.error !== undefined) {
        rejections.push({
          turn: state.turn,
          commandId: command.commandId,
          code: result.error.code,
        });
      }
      state = result.state;
    }
    const resolved = resolveTurn(
      state,
      { type: 'END_QUARTER', commandId: `end-${position + 1}` },
      defs,
    );
    if (!resolved.ok) throw new Error(resolved.error.code);
    state = resolved.state;
    states.push(state);
    reports.push(resolved.report);
    ledger.push(...resolved.ledger);
  });
  return { initial, states, reports, ledger, rejections };
}
