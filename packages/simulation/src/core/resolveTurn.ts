import type { GameDefinitions, GameState, LedgerEntry, TurnReport } from '@republika/shared';

import { applyBaseline } from '../economy/baseline.js';
import { applyEventResponses, selectNextEvents } from '../events/events.js';
import type { EffectContext } from '../policies/effects.js';
import {
  applyImmediateEffects,
  chargeUpfrontCosts,
  tickActivePolicies,
  tickCooldowns,
  tickDelayedEffects,
} from '../policies/lifecycle.js';
import { updateMinistryEffectiveness } from '../politics/ministries.js';
import { applyLobbies, resolveVotes } from '../politics/voting.js';
import { buildReport } from '../report/buildReport.js';
import { cloneState } from './clone.js';
import { validateEndQuarter } from './commands.js';
import { indexDefinitions } from './definitions.js';
import type { CommandError } from './errors.js';
import { Ledger } from './ledger.js';
import { normalizeState } from './normalize.js';
import { createTurnRng } from './rng.js';

export interface EndQuarterCommand {
  readonly type: 'END_QUARTER';
  readonly commandId: string;
}

export type ResolveTurnResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly report: TurnReport;
      readonly ledger: readonly LedgerEntry[];
    }
  | { readonly ok: false; readonly state: GameState; readonly error: CommandError };

/**
 * Orkestrator akhir kuartal dengan urutan persis AGENT §5.10:
 *  1 validasi · 2 respons event · 3 lobi · 4 voting · 5 biaya awal ·
 *  6 efek IMMEDIATE · 7 tick kebijakan/cooldown/tertunda · 8 baseline ·
 *  9 effectiveness kementerian · 10 normalize · 11 event berikutnya ·
 *  12 laporan, turn += 1, status.
 * Murni: state masukan tidak dimutasi; waktu, seed, dan konten berasal dari argumen.
 */
export function resolveTurn(
  state: GameState,
  command: EndQuarterCommand,
  defs: GameDefinitions,
): ResolveTurnResult {
  // 1. Validasi command dan AP (AP sudah dipesan saat command diterima).
  const error = validateEndQuarter(state, command.commandId);
  if (error !== null) return { ok: false, state, error };

  const index = indexDefinitions(defs);
  const snapshot = cloneState(state);
  const work = cloneState(state);
  const ledger = new Ledger(state.turn);
  const context: EffectContext = { snapshot, index, ledger };
  const pending = work.pendingCommands;

  // 2. Respons event.
  const resolvedEvents = applyEventResponses(work, context);
  // 3. Lobi.
  const lobbyBonuses = applyLobbies(work, pending, defs, ledger);
  // 4. Voting (urut policyId).
  const votes = resolveVotes(work, pending, defs, lobbyBonuses, ledger);
  // 5. Biaya awal kebijakan yang aktif.
  chargeUpfrontCosts(work, votes.passed, index, ledger);
  // 6. Efek IMMEDIATE (DELAYED dijadwalkan).
  applyImmediateEffects(work, votes.passed, context);
  // 7. Tick cooldown, kebijakan aktif, dan efek tertunda.
  work.policyCooldowns = tickCooldowns(work.policyCooldowns, snapshot.policyCooldowns);
  work.eventCooldowns = tickCooldowns(work.eventCooldowns, snapshot.eventCooldowns);
  const ticked = tickActivePolicies(work, context);
  tickDelayedEffects(work, context);
  // 8. Baseline.
  applyBaseline(work, defs.baseline, ticked, index, ledger);
  // 9. Effectiveness kementerian.
  updateMinistryEffectiveness(work, ticked, index, ledger);
  // 10. Normalize + clamp.
  normalizeState(work, ledger);
  // 11. Event untuk kuartal berikutnya (stub Tahap 2).
  const rng = createTurnRng(state.seed, state.turn);
  const nextEventIds = selectNextEvents(work, defs, index, rng, ledger);

  // 12. Laporan, statistik, dan maju ke kuartal berikutnya.
  const treasuryDrop = snapshot.treasuryBillion - work.treasuryBillion;
  if (treasuryDrop > 0) work.campaignStats.totalDeficitBillion += treasuryDrop;
  const report = buildReport({
    before: snapshot,
    after: work,
    startYear: defs.scenario.startYear,
    ledger: ledger.entries,
    votes: votes.outcomes,
    policiesPassed: votes.passed,
    policiesFailed: votes.failed,
    resolvedEvents,
    nextEventIds,
  });

  const isFinal = state.turn >= state.maxTurns;
  // Bonus lobi dan pengajuan hanya berlaku untuk kuartal ini.
  work.pendingCommands = [];
  work.lobbyThisTurn = [];
  work.commandIdsThisTurn = [];
  work.actionPointsRemaining = work.actionPointsPerTurn;
  work.pendingEvents = [
    ...work.pendingEvents,
    ...nextEventIds.map((eventId) => ({
      eventId,
      arrivedTurn: Math.min(state.turn + 1, state.maxTurns),
      resolvedChoiceId: null,
    })),
  ];
  if (isFinal) {
    // DECISION: turn tidak melewati maxTurns (skema); kampanye ditandai selesai.
    work.status = 'completed';
  } else {
    work.turn = state.turn + 1;
  }

  return { ok: true, state: work, report, ledger: ledger.entries };
}
