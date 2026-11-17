import type { EventDefinition, GameState } from '@republika/shared';

import type { DefinitionIndex } from '../core/definitions.js';
import type { Ledger } from '../core/ledger.js';
import { sortById } from '../core/order.js';
import { evaluateAll } from '../core/requirements.js';
import type { Rng } from '../core/rng.js';

/**
 * Event yang boleh muncul pada `targetTurn`: syarat terpenuhi, tidak dalam
 * cooldown, belum pernah muncul bila `uniquePerCampaign`, dan tidak sedang
 * menunggu respons. Hasil terurut ID.
 *
 * DECISION: syarat dievaluasi terhadap state akhir kuartal berjalan, tetapi
 * dengan `turn` = kuartal kedatangan event, sehingga `TURN_AT_LEAST: 3`
 * berarti event paling cepat muncul di kuartal 3.
 */
export function eligibleEvents(
  state: GameState,
  index: DefinitionIndex,
  targetTurn: number,
): EventDefinition[] {
  const view: GameState = { ...state, turn: targetTurn };
  const pending = new Set(state.pendingEvents.map((event) => event.eventId));
  return sortById(index.defs.events, (event) => event.id).filter(
    (event) =>
      !pending.has(event.id) &&
      (state.eventCooldowns[event.id] ?? 0) === 0 &&
      !(event.uniquePerCampaign && state.eventsFired.includes(event.id)) &&
      evaluateAll(view, event.eligibility),
  );
}

/**
 * Langkah 11: memilih maksimal `maxEventsPerQuarter` event untuk kuartal
 * berikutnya dengan `weightedPick` tanpa pengembalian (RNG stream turn).
 * Event terpilih langsung mendapat cooldown dan dicatat sebagai sudah muncul.
 */
export function selectNextEvents(
  work: GameState,
  index: DefinitionIndex,
  rng: Rng,
  ledger: Ledger,
  targetTurn: number,
): string[] {
  const max = index.defs.scenario.maxEventsPerQuarter;
  let candidates = eligibleEvents(work, index, targetTurn);
  const selected: string[] = [];
  while (selected.length < max && candidates.length > 0) {
    const picked = rng.weightedPick(
      candidates.map((event) => ({ value: event, weight: event.triggerWeight })),
    );
    if (picked === null) break;
    selected.push(picked.id);
    candidates = candidates.filter((event) => event.id !== picked.id);
    if (picked.cooldownTurns > 0) {
      work.eventCooldowns = { ...work.eventCooldowns, [picked.id]: picked.cooldownTurns };
    }
    if (!work.eventsFired.includes(picked.id)) {
      work.eventsFired = [...work.eventsFired, picked.id];
    }
    ledger.push({
      kind: 'EVENT',
      sourceType: 'EVENT',
      sourceId: picked.id,
      reasonCode: 'EVENT_TRIGGERED',
      target: picked.id,
    });
  }
  return selected;
}
