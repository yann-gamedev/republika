import type { GameState } from '@republika/shared';

import type { DefinitionIndex } from '../core/definitions.js';
import type { Ledger } from '../core/ledger.js';
import { compareIds } from '../core/order.js';
import type { TickedPolicy } from '../policies/lifecycle.js';

export const MIN_EFFECTIVENESS = 40;
export const MAX_EFFECTIVENESS = 90;

/**
 * Langkah 9: effectiveness kementerian naik +1 per kebijakan sedomain yang
 * berjalan pada turn ini (termasuk yang baru habis durasinya). Clamp 40..90
 * dilakukan di langkah normalize.
 */
export function updateMinistryEffectiveness(
  work: GameState,
  ticked: readonly TickedPolicy[],
  index: DefinitionIndex,
  ledger: Ledger,
): void {
  const ministries = [...work.ministries].sort((a, b) => compareIds(a.ministryId, b.ministryId));
  for (const ministry of ministries) {
    const definition = index.ministries.get(ministry.ministryId);
    if (definition === undefined) continue;
    const count = ticked.filter((item) => {
      const policy = index.policies.get(item.policyId);
      return policy !== undefined && definition.categories.includes(policy.category);
    }).length;
    if (count === 0) continue;
    const before = ministry.effectiveness;
    ministry.effectiveness = before + count;
    ledger.push({
      kind: 'MINISTRY',
      sourceType: 'MINISTRY',
      sourceId: ministry.ministryId,
      reasonCode: 'MINISTRY_EXPERIENCE',
      target: ministry.ministryId,
      unit: 'points',
      before,
      delta: count,
      after: ministry.effectiveness,
    });
  }
}
