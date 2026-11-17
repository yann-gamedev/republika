import { INDICATOR_DOMAINS, type EffectRule, type Requirement } from '@republika/shared';

import { copy } from '@/copy/id';
import {
  formatIndicator,
  formatRupiahTriliun,
  formatSignedIndicator,
  formatSignedInteger,
  formatSignedRupiahTriliun,
} from '@/format/formatters';

export interface ContentNames {
  readonly factionName: (factionId: string) => string;
  readonly ministryName: (ministryId: string) => string;
  readonly policyName: (policyId: string) => string;
}

function indicatorTiming(effect: Extract<EffectRule, { type: 'MODIFY_INDICATOR' }>): string {
  if (effect.timing === 'IMMEDIATE') return copy.policies.timelineImmediate;
  if (effect.timing === 'PER_TURN') return copy.policies.timelinePerTurn;
  return copy.policies.timelineDelayed(effect.delayTurns ?? 1);
}

export function effectText(effect: EffectRule, names: ContentNames): string {
  switch (effect.type) {
    case 'MODIFY_INDICATOR': {
      const domain = INDICATOR_DOMAINS[effect.target];
      return copy.policies.effectIndicator(
        domain.shortLabel,
        formatSignedIndicator(effect.deltaTenths),
        indicatorTiming(effect),
      );
    }
    case 'MODIFY_TREASURY':
      return copy.policies.effectTreasury(formatSignedRupiahTriliun(effect.deltaBillion));
    case 'CHANGE_FACTION_SUPPORT': {
      const target =
        effect.target.kind === 'faction'
          ? names.factionName(effect.target.factionId)
          : `#${effect.target.ideologyTag}`;
      return copy.policies.effectSupport(target, formatSignedIndicator(effect.deltaTenths));
    }
    case 'MODIFY_MINISTRY_EFFECTIVENESS':
      return copy.policies.effectMinistry(
        names.ministryName(effect.ministryId),
        formatSignedInteger(effect.delta),
      );
    case 'SET_FLAG':
      return copy.policies.effectFlagSet(effect.flag);
    case 'CLEAR_FLAG':
      return copy.policies.effectFlagClear(effect.flag);
  }
}

export function requirementText(requirement: Requirement, names: ContentNames): string {
  switch (requirement.type) {
    case 'INDICATOR_AT_LEAST':
      return copy.policies.requirementIndicator(
        INDICATOR_DOMAINS[requirement.target].shortLabel,
        '≥',
        formatIndicator(requirement.valueTenths),
      );
    case 'INDICATOR_AT_MOST':
      return copy.policies.requirementIndicator(
        INDICATOR_DOMAINS[requirement.target].shortLabel,
        '≤',
        formatIndicator(requirement.valueTenths),
      );
    case 'TREASURY_AT_LEAST':
      return copy.policies.requirementTreasury(formatRupiahTriliun(requirement.valueBillion));
    case 'POLICY_ACTIVE':
      return copy.policies.requirementPolicyActive(names.policyName(requirement.policyId));
    case 'POLICY_NOT_ACTIVE':
      return copy.policies.requirementPolicyInactive(names.policyName(requirement.policyId));
    case 'FLAG_SET':
      return copy.policies.requirementFlagSet(requirement.flag);
    case 'FLAG_NOT_SET':
      return copy.policies.requirementFlagClear(requirement.flag);
    case 'TURN_AT_LEAST':
      return copy.policies.requirementTurn(requirement.value);
  }
}
