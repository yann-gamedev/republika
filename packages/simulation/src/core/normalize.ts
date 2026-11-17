import { INDICATOR_KEYS, type GameState } from '@republika/shared';

import { MAX_EFFECTIVENESS, MIN_EFFECTIVENESS } from '../politics/ministries.js';
import type { Ledger } from './ledger.js';
import { clamp, clampToDomain } from './math.js';
import { compareIds } from './order.js';

export const MIN_SUPPORT_TENTHS = 0;
export const MAX_SUPPORT_TENTHS = 1000;

/**
 * Langkah 10: clamp indikator, dukungan fraksi (0..100), dan effectiveness
 * kementerian (40..90). Setiap clamp dicatat dengan `reasonCode: "CLAMPED"`
 * agar ledger tetap bisa merekonstruksi state.
 */
export function normalizeState(work: GameState, ledger: Ledger): void {
  for (const key of INDICATOR_KEYS) {
    const before = work.indicators[key];
    const after = clampToDomain(key, before);
    if (after === before) continue;
    work.indicators[key] = after;
    ledger.push({
      kind: 'INDICATOR',
      sourceType: 'SYSTEM',
      reasonCode: 'CLAMPED',
      target: key,
      unit: 'tenths',
      before,
      delta: after - before,
      after,
    });
  }
  const factions = [...work.factions].sort((a, b) => compareIds(a.factionId, b.factionId));
  for (const faction of factions) {
    const before = faction.supportTenths;
    const after = clamp(before, MIN_SUPPORT_TENTHS, MAX_SUPPORT_TENTHS);
    if (after === before) continue;
    faction.supportTenths = after;
    ledger.push({
      kind: 'FACTION',
      sourceType: 'SYSTEM',
      reasonCode: 'CLAMPED',
      target: faction.factionId,
      unit: 'tenths',
      before,
      delta: after - before,
      after,
    });
  }
  const ministries = [...work.ministries].sort((a, b) => compareIds(a.ministryId, b.ministryId));
  for (const ministry of ministries) {
    const before = ministry.effectiveness;
    const after = clamp(before, MIN_EFFECTIVENESS, MAX_EFFECTIVENESS);
    if (after === before) continue;
    ministry.effectiveness = after;
    ledger.push({
      kind: 'MINISTRY',
      sourceType: 'SYSTEM',
      reasonCode: 'CLAMPED',
      target: ministry.ministryId,
      unit: 'points',
      before,
      delta: after - before,
      after,
    });
  }
}
