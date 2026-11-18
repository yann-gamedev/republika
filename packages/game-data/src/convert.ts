import {
  trillionToBillion,
  toTenths,
  type ArchetypeDefinition,
  type BaselineJson,
  type BaselineParams,
  type EventChoice,
  type EventDefinition,
  type EventJson,
  type EffectJson,
  type EffectRule,
  type FactionDefinition,
  type FactionJson,
  type MinistryDefinition,
  type MinistryJson,
  type PolicyDefinition,
  type PolicyJson,
  type Requirement,
  type RequirementJson,
  type ScenarioDefinition,
  type ScenarioJson,
} from '@republika/shared';

function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) {
    throw new Error(`Field ${field} tidak tersedia setelah validasi schema.`);
  }
  return value;
}

export function convertRequirement(requirement: RequirementJson): Requirement {
  switch (requirement.type) {
    case 'INDICATOR_AT_LEAST':
      return {
        type: 'INDICATOR_AT_LEAST',
        target: requirement.target,
        valueTenths: toTenths(requirement.value),
      };
    case 'INDICATOR_AT_MOST':
      return {
        type: 'INDICATOR_AT_MOST',
        target: requirement.target,
        valueTenths: toTenths(requirement.value),
      };
    case 'TREASURY_AT_LEAST':
      return {
        type: 'TREASURY_AT_LEAST',
        valueBillion: trillionToBillion(requirement.valueTrillion),
      };
    case 'POLICY_ACTIVE':
      return { type: 'POLICY_ACTIVE', policyId: requirement.policyId };
    case 'POLICY_NOT_ACTIVE':
      return { type: 'POLICY_NOT_ACTIVE', policyId: requirement.policyId };
    case 'FLAG_SET':
      return { type: 'FLAG_SET', flag: requirement.flag };
    case 'FLAG_NOT_SET':
      return { type: 'FLAG_NOT_SET', flag: requirement.flag };
    case 'TURN_AT_LEAST':
      return { type: 'TURN_AT_LEAST', value: requirement.value };
  }
}

export function convertEffect(effect: EffectJson): EffectRule {
  switch (effect.type) {
    case 'MODIFY_INDICATOR': {
      const target = required(effect.target, 'target');
      const delta = toTenths(required(effect.delta, 'delta'));
      const timing = required(effect.timing, 'timing');
      if (timing === 'DELAYED') {
        return {
          type: 'MODIFY_INDICATOR',
          target,
          deltaTenths: delta,
          timing,
          delayTurns: required(effect.delayTurns, 'delayTurns'),
          reasonCode: effect.reasonCode,
        };
      }
      return {
        type: 'MODIFY_INDICATOR',
        target,
        deltaTenths: delta,
        timing,
        reasonCode: effect.reasonCode,
      };
    }
    case 'MODIFY_TREASURY':
      return {
        type: 'MODIFY_TREASURY',
        deltaBillion: trillionToBillion(required(effect.deltaTrillion, 'deltaTrillion')),
        reasonCode: effect.reasonCode,
      };
    case 'CHANGE_FACTION_SUPPORT': {
      const deltaTenths = toTenths(required(effect.delta, 'delta'));
      if (effect.factionId !== undefined) {
        return {
          type: 'CHANGE_FACTION_SUPPORT',
          target: { kind: 'faction', factionId: effect.factionId },
          deltaTenths,
          reasonCode: effect.reasonCode,
        };
      }
      return {
        type: 'CHANGE_FACTION_SUPPORT',
        target: {
          kind: 'ideologyTag',
          ideologyTag: required(effect.ideologyTag, 'ideologyTag'),
        },
        deltaTenths,
        reasonCode: effect.reasonCode,
      };
    }
    case 'MODIFY_MINISTRY_EFFECTIVENESS':
      return {
        type: 'MODIFY_MINISTRY_EFFECTIVENESS',
        ministryId: required(effect.ministryId, 'ministryId'),
        delta: required(effect.delta, 'delta'),
        reasonCode: effect.reasonCode,
      };
    case 'SET_FLAG':
      return {
        type: 'SET_FLAG',
        flag: required(effect.flag, 'flag'),
        reasonCode: effect.reasonCode,
      };
    case 'CLEAR_FLAG':
      return {
        type: 'CLEAR_FLAG',
        flag: required(effect.flag, 'flag'),
        reasonCode: effect.reasonCode,
      };
  }
}

export function convertPolicy(policy: PolicyJson): PolicyDefinition {
  return {
    id: policy.id,
    version: policy.version,
    name: policy.name,
    description: policy.description,
    category: policy.category,
    apCost: policy.apCost,
    fiscalCostBillion: trillionToBillion(policy.fiscalCostTrillion),
    perTurnCostBillion: trillionToBillion(policy.perTurnCostTrillion),
    needsVote: policy.needsVote,
    durationTurns: policy.durationTurns,
    cooldownTurns: policy.cooldownTurns,
    requirements: policy.requirements.map(convertRequirement),
    conflicts: [...policy.conflicts],
    effects: policy.effects.map(convertEffect),
    modifiers: policy.modifiers.map((modifier) => ({
      when: modifier.when.map(convertRequirement),
      appliesTo: modifier.appliesTo,
      multiplier: modifier.multiplier,
    })),
  };
}

export function convertFaction(faction: FactionJson): FactionDefinition {
  return {
    id: faction.id,
    version: faction.version,
    name: faction.name,
    shortName: faction.shortName,
    seats: faction.seats,
    color: faction.color,
    ideologyTags: [...faction.ideologyTags],
    baseSupportTenths: toTenths(faction.baseSupport),
    initialSupportTenths: toTenths(faction.initialSupport),
    policyPreferences: { ...faction.policyPreferences },
    description: faction.description,
    leadership: faction.leadership.map((item) => ({ role: item.role, name: item.name })),
    members: [...faction.members],
  };
}

export function convertMinistry(ministry: MinistryJson): MinistryDefinition {
  return {
    id: ministry.id,
    version: ministry.version,
    name: ministry.name,
    categories: [...ministry.categories],
    initialEffectiveness: ministry.initialEffectiveness,
  };
}

export function convertEventChoice(choice: EventJson['choices'][number]): EventChoice {
  const converted: EventChoice = {
    id: choice.id,
    label: choice.label,
    neutral: choice.neutral,
    effects: choice.effects.map(convertEffect),
    ...(choice.hint !== undefined ? { hint: choice.hint } : {}),
  };
  return converted;
}

export function convertEvent(event: EventJson): EventDefinition {
  return {
    id: event.id,
    version: event.version,
    title: event.title,
    body: event.body,
    eligibility: event.eligibility.map(convertRequirement),
    triggerWeight: event.triggerWeight,
    cooldownTurns: event.cooldownTurns,
    uniquePerCampaign: event.uniquePerCampaign,
    choices: event.choices.map(convertEventChoice),
  };
}

export function convertScenario(scenario: ScenarioJson): ScenarioDefinition {
  return {
    rulesetVersion: scenario.rulesetVersion,
    maxTurns: scenario.maxTurns,
    actionPointsPerTurn: scenario.actionPointsPerTurn,
    maxEventsPerQuarter: scenario.maxEventsPerQuarter,
    lobbyCostBillion: trillionToBillion(scenario.lobbyCostTrillion),
    lobbySupportBonusTenths: toTenths(scenario.lobbySupportBonus),
    startYear: scenario.startYear,
    initialIndicators: {
      approval: toTenths(scenario.initialIndicators.approval),
      stability: toTenths(scenario.initialIndicators.stability),
      fiscalHealth: toTenths(scenario.initialIndicators.fiscalHealth),
      growthPct: toTenths(scenario.initialIndicators.growthPct),
      inflationPct: toTenths(scenario.initialIndicators.inflationPct),
      unemploymentPct: toTenths(scenario.initialIndicators.unemploymentPct),
      welfare: toTenths(scenario.initialIndicators.welfare),
      trust: toTenths(scenario.initialIndicators.trust),
    },
    initialTreasuryBillion: trillionToBillion(scenario.initialTreasuryTrillion),
  };
}

export function convertBaseline(baseline: BaselineJson): BaselineParams {
  return {
    inflationTargetTenths: toTenths(baseline.inflationTargetPct),
    inflationReversion: baseline.inflationReversion,
    growthTargetTenths: toTenths(baseline.growthTargetPct),
    growthReversion: baseline.growthReversion,
    okunCoefficient: baseline.okunCoefficient,
    okunNeutralGrowthTenths: toTenths(baseline.okunNeutralGrowthPct),
    approvalAnchorTenths: toTenths(baseline.approvalAnchor),
    approvalReversion: baseline.approvalReversion,
    baseRevenueBillion: trillionToBillion(baseline.baseRevenueTrillionPerTurn),
    baseSpendingBillion: trillionToBillion(baseline.baseSpendingTrillionPerTurn),
    negativeTreasuryFiscalHealthPenaltyTenths: toTenths(
      baseline.negativeTreasuryFiscalHealthPenalty,
    ),
    factionSupportReversion: baseline.factionSupportReversion,
    factionApprovalInfluence: baseline.factionApprovalInfluence,
  };
}

export function convertArchetype(archetype: ArchetypeDefinition): ArchetypeDefinition {
  return {
    ...archetype,
    conditions: [...archetype.conditions],
  };
}
