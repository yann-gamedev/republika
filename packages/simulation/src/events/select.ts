import { UNREST_FLAG_PREFIX, type EventDefinition, type GameState } from '@republika/shared';

import type { DefinitionIndex } from '../core/definitions.js';
import type { Ledger } from '../core/ledger.js';
import { sortById } from '../core/order.js';
import { evaluateAll } from '../core/requirements.js';
import type { Rng } from '../core/rng.js';

/**
 * DECISION: event yang mensyaratkan flag `UNREST_<id>` (event daerah) mendapat
 * bobot 3x saat syaratnya terpenuhi. Angka awal untuk playtest; naikkan bila
 * event daerah masih jarang muncul, turunkan bila terlalu mendominasi.
 */
export const UNREST_EVENT_WEIGHT_MULTIPLIER = 3;

/** Event daerah yang dipicu gejolak: syarat `FLAG_SET UNREST_<id>`. */
export function isUnrestEvent(event: EventDefinition): boolean {
  return event.eligibility.some(
    (requirement) =>
      requirement.type === 'FLAG_SET' && requirement.flag.startsWith(UNREST_FLAG_PREFIX),
  );
}

/** Bobot undian event; event gejolak mendapat pengali saat syaratnya terpenuhi. */
export function eventSelectionWeight(event: EventDefinition): number {
  return isUnrestEvent(event)
    ? event.triggerWeight * UNREST_EVENT_WEIGHT_MULTIPLIER
    : event.triggerWeight;
}

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
      candidates.map((event) => ({ value: event, weight: eventSelectionWeight(event) })),
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
