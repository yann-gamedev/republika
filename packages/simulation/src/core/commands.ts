import type { GameCommand, GameDefinitions, GameState, PendingCommand } from '@republika/shared';

import { indexDefinitions, type DefinitionIndex } from './definitions.js';
import { commandError, type CommandError, type CommandErrorCode } from './errors.js';
import { evaluateAll } from './requirements.js';

/** Biaya AP lobi fraksi (AGENT §5.4). */
export const LOBBY_AP_COST = 1;

/** Command yang diproses `applyCommand`; `END_QUARTER` ditangani `resolveTurn`. */
export type PlayerCommand = Exclude<GameCommand, { type: 'END_QUARTER' }>;

export type CommandResult =
  | { readonly state: GameState; readonly error?: undefined }
  | { readonly state: GameState; readonly error: CommandError };

function fail(state: GameState, code: CommandErrorCode): CommandResult {
  return { state, error: commandError(code) };
}

function accept(state: GameState, commandId: string, patch: Partial<GameState>): CommandResult {
  return {
    state: {
      ...state,
      ...patch,
      commandIdsThisTurn: [...state.commandIdsThisTurn, commandId],
    },
  };
}

/** Kebijakan yang aktif atau sedang diajukan pada kuartal ini. */
function engagedPolicyIds(state: GameState): Set<string> {
  const ids = new Set(state.activePolicies.map((policy) => policy.policyId));
  for (const pending of state.pendingCommands) {
    if (pending.type === 'ENACT_POLICY') ids.add(pending.policyId);
  }
  return ids;
}

/** Konflik ditulis satu arah di konten, tetapi berlaku dua arah. */
export function conflictsWith(index: DefinitionIndex, policyId: string, otherId: string): boolean {
  const policy = index.policies.get(policyId);
  const other = index.policies.get(otherId);
  return (
    (policy?.conflicts.includes(otherId) ?? false) || (other?.conflicts.includes(policyId) ?? false)
  );
}

/**
 * Validasi bersama untuk semua command pemain. Mengembalikan kode error pertama
 * yang ditemukan, atau `null` bila boleh dilanjutkan.
 */
function commonCheck(state: GameState, commandId: string): CommandErrorCode | null {
  if (state.status === 'completed') return 'GAME_COMPLETED';
  if (state.commandIdsThisTurn.includes(commandId)) return 'DUPLICATE_COMMAND';
  return null;
}

/**
 * Menerapkan satu command pemain secara murni. Jika gagal, state dikembalikan
 * tanpa perubahan bersama `error` berkode stabil.
 */
export function applyCommand(
  state: GameState,
  command: PlayerCommand,
  defs: GameDefinitions,
): CommandResult {
  const common = commonCheck(state, command.commandId);
  if (common !== null) return fail(state, common);
  const index = indexDefinitions(defs);

  switch (command.type) {
    case 'ENACT_POLICY': {
      const policy = index.policies.get(command.policyId);
      if (policy === undefined) return fail(state, 'UNKNOWN_POLICY');
      if (state.activePolicies.some((active) => active.policyId === policy.id)) {
        return fail(state, 'ALREADY_ACTIVE');
      }
      const pendingSame = state.pendingCommands.some(
        (pending) => pending.type === 'ENACT_POLICY' && pending.policyId === policy.id,
      );
      if (pendingSame) return fail(state, 'ALREADY_PENDING');
      if ((state.policyCooldowns[policy.id] ?? 0) > 0) return fail(state, 'ON_COOLDOWN');
      for (const otherId of engagedPolicyIds(state)) {
        if (conflictsWith(index, policy.id, otherId)) return fail(state, 'CONFLICT');
      }
      if (!evaluateAll(state, policy.requirements)) return fail(state, 'REQUIREMENT_NOT_MET');
      if (state.actionPointsRemaining < policy.apCost) return fail(state, 'INSUFFICIENT_AP');
      const pending: PendingCommand = {
        type: 'ENACT_POLICY',
        commandId: command.commandId,
        policyId: policy.id,
        apCost: policy.apCost,
      };
      return accept(state, command.commandId, {
        actionPointsRemaining: state.actionPointsRemaining - policy.apCost,
        pendingCommands: [...state.pendingCommands, pending],
      });
    }

    case 'LOBBY_FACTION': {
      if (!index.factions.has(command.factionId)) return fail(state, 'UNKNOWN_FACTION');
      const alreadyLobbied =
        state.lobbyThisTurn.includes(command.factionId) ||
        state.pendingCommands.some(
          (pending) => pending.type === 'LOBBY_FACTION' && pending.factionId === command.factionId,
        );
      if (alreadyLobbied) return fail(state, 'LOBBY_LIMIT');
      if (state.actionPointsRemaining < LOBBY_AP_COST) return fail(state, 'INSUFFICIENT_AP');
      const pending: PendingCommand = {
        type: 'LOBBY_FACTION',
        commandId: command.commandId,
        factionId: command.factionId,
        apCost: LOBBY_AP_COST,
      };
      return accept(state, command.commandId, {
        actionPointsRemaining: state.actionPointsRemaining - LOBBY_AP_COST,
        pendingCommands: [...state.pendingCommands, pending],
      });
    }

    case 'RESPOND_EVENT': {
      const pendingEvent = state.pendingEvents.find((event) => event.eventId === command.eventId);
      const event = index.events.get(command.eventId);
      if (pendingEvent === undefined || event === undefined) return fail(state, 'UNKNOWN_EVENT');
      if (!event.choices.some((choice) => choice.id === command.choiceId)) {
        return fail(state, 'UNKNOWN_CHOICE');
      }
      // DECISION: respons boleh diganti sebelum END_QUARTER; pilihan terakhir yang berlaku.
      return accept(state, command.commandId, {
        pendingEvents: state.pendingEvents.map((item) =>
          item.eventId === command.eventId ? { ...item, resolvedChoiceId: command.choiceId } : item,
        ),
      });
    }

    case 'CANCEL_PENDING': {
      const target = state.pendingCommands.find(
        (pending) => pending.commandId === command.pendingCommandId,
      );
      if (target === undefined) return fail(state, 'UNKNOWN_PENDING_COMMAND');
      return accept(state, command.commandId, {
        actionPointsRemaining: Math.min(
          state.actionPointsPerTurn,
          state.actionPointsRemaining + target.apCost,
        ),
        pendingCommands: state.pendingCommands.filter(
          (pending) => pending.commandId !== command.pendingCommandId,
        ),
      });
    }

    default: {
      const unreachable: never = command;
      throw new Error(`Command tidak dikenal: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** Validasi END_QUARTER (langkah 1 AGENT §5.10). `null` berarti boleh diproses. */
export function validateEndQuarter(state: GameState, commandId: string): CommandError | null {
  const common = commonCheck(state, commandId);
  if (common !== null) return commandError(common);
  if (state.pendingEvents.some((event) => event.resolvedChoiceId === null)) {
    return commandError('EVENT_RESPONSE_REQUIRED');
  }
  return null;
}
