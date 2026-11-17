import type { GameDefinitions, GameState } from '@republika/shared';

import type { DefinitionIndex } from '../core/definitions.js';
import type { Ledger } from '../core/ledger.js';
import { compareIds } from '../core/order.js';
import type { Rng } from '../core/rng.js';
import type { EffectContext } from '../policies/effects.js';
import { applyOnsetEffects } from '../policies/lifecycle.js';

export interface ResolvedEvent {
  readonly eventId: string;
  readonly choiceId: string;
}

/**
 * Langkah 2: menerapkan respons event (urut eventId). Efek IMMEDIATE dan
 * PER_TURN berlaku sekali sekarang; DELAYED dijadwalkan. Tanpa pengali
 * kementerian. Event yang ditanggapi dihapus dari daftar pending.
 */
export function applyEventResponses(work: GameState, context: EffectContext): ResolvedEvent[] {
  const resolved: ResolvedEvent[] = [];
  const ordered = [...work.pendingEvents].sort((a, b) => compareIds(a.eventId, b.eventId));
  for (const pending of ordered) {
    if (pending.resolvedChoiceId === null) continue;
    const event = context.index.events.get(pending.eventId);
    const choice = event?.choices.find((item) => item.id === pending.resolvedChoiceId);
    if (event === undefined || choice === undefined) continue;
    context.ledger.push({
      kind: 'EVENT',
      sourceType: 'EVENT',
      sourceId: event.id,
      reasonCode: 'EVENT_RESOLVED',
      target: choice.id,
    });
    // DECISION: efek PER_TURN pada opsi event dijalankan sekali (event tidak punya durasi).
    applyOnsetEffects(work, choice.effects, { sourceType: 'EVENT', sourceId: event.id }, context, {
      perTurnAsImmediate: true,
    });
    work.campaignStats.eventsResolved += 1;
    resolved.push({ eventId: event.id, choiceId: choice.id });
  }
  const resolvedIds = new Set(resolved.map((item) => item.eventId));
  work.pendingEvents = work.pendingEvents.filter((item) => !resolvedIds.has(item.eventId));
  return resolved;
}

/**
 * Langkah 11: memilih event untuk kuartal berikutnya. Stub Tahap 2 — selalu
 * kosong; seleksi berbobot dengan PRNG diisi di Tahap 3.
 */
export function selectNextEvents(
  _work: GameState,
  _defs: GameDefinitions,
  _index: DefinitionIndex,
  _rng: Rng,
  _ledger: Ledger,
): string[] {
  return [];
}
