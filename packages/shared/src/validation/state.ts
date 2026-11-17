import { z } from 'zod';

import { GAME_STATE_VERSION } from '../types/constants.js';
import {
  commandIdSchema,
  flagSchema,
  idSchema,
  presidentNameSchema,
  uniqueStrings,
  versionSchema,
} from './common.js';
import { indicatorsSchema } from './indicators.js';
import { effectRuleSchema } from './rules.js';

const nonNegativeInt = z.number().int().min(0);
const supportTenths = z.number().int().min(0).max(1000);
const effectiveness = z.number().int().min(40).max(90);

export const factionStateSchema = z.object({
  factionId: idSchema,
  supportTenths,
});

export type FactionState = z.infer<typeof factionStateSchema>;

export const ministryStateSchema = z.object({
  ministryId: idSchema,
  effectiveness,
});

export type MinistryState = z.infer<typeof ministryStateSchema>;

export const activePolicySchema = z.object({
  policyId: idSchema,
  enactedTurn: z.number().int().min(1).max(100),
  remainingTurns: nonNegativeInt.max(100),
  perTurnCostBillion: nonNegativeInt,
});

export type ActivePolicy = z.infer<typeof activePolicySchema>;

export const pendingCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ENACT_POLICY'),
    commandId: commandIdSchema,
    policyId: idSchema,
    apCost: nonNegativeInt.max(5),
  }),
  z.object({
    type: z.literal('LOBBY_FACTION'),
    commandId: commandIdSchema,
    factionId: idSchema,
    apCost: nonNegativeInt.max(5),
  }),
]);

export type PendingCommand = z.infer<typeof pendingCommandSchema>;

export const pendingEventSchema = z.object({
  eventId: idSchema,
  arrivedTurn: z.number().int().min(1).max(100),
  resolvedChoiceId: z.string().min(1).max(20).nullable().default(null),
});

export type PendingEvent = z.infer<typeof pendingEventSchema>;

export const delayedEffectSchema = z.object({
  sourceId: idSchema,
  remainingTurns: z.number().int().min(1).max(40),
  effect: effectRuleSchema,
});

export type DelayedEffect = z.infer<typeof delayedEffectSchema>;

export const campaignStatsSchema = z.object({
  policiesEnacted: nonNegativeInt,
  policiesByCategory: z.object({
    FISCAL: nonNegativeInt,
    SOCIAL: nonNegativeInt,
    ENERGY: nonNegativeInt,
    GOVERNANCE: nonNegativeInt,
  }),
  votesHeld: nonNegativeInt,
  votesFailed: nonNegativeInt,
  lobbies: nonNegativeInt,
  eventsResolved: nonNegativeInt,
  totalDeficitBillion: z.number().int(),
  totalPolicySpendingBillion: nonNegativeInt,
});

export type CampaignStats = z.infer<typeof campaignStatsSchema>;

export const flagsSchema = z.array(flagSchema).refine(uniqueStrings, 'Flag tidak boleh duplikat.');

export const gameStateSchema = z
  .object({
    stateVersion: z.literal(GAME_STATE_VERSION),
    presidentName: presidentNameSchema,
    cabinetName: z.string().trim().max(40).optional(),
    rulesetVersion: versionSchema,
    rulesetMigratedFrom: versionSchema.optional(),
    turn: z.number().int().min(1).max(100),
    maxTurns: z.number().int().min(1).max(100),
    status: z.enum(['active', 'completed']),
    actionPointsPerTurn: z.number().int().min(1).max(5),
    actionPointsRemaining: z.number().int().min(0).max(5),
    treasuryBillion: z.number().int().min(-1_000_000).max(1_000_000),
    indicators: indicatorsSchema,
    factions: z.array(factionStateSchema).min(1),
    ministries: z.array(ministryStateSchema).min(1),
    activePolicies: z.array(activePolicySchema),
    pendingCommands: z.array(pendingCommandSchema),
    pendingEvents: z.array(pendingEventSchema),
    lobbyThisTurn: z.array(idSchema),
    policyCooldowns: z.record(z.string(), nonNegativeInt),
    eventCooldowns: z.record(z.string(), nonNegativeInt),
    flags: flagsSchema,
    delayedEffects: z.array(delayedEffectSchema),
    campaignStats: campaignStatsSchema,
    archetypeId: idSchema.optional(),
  })
  .superRefine((state, context) => {
    if (state.actionPointsRemaining > state.actionPointsPerTurn) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actionPointsRemaining'],
        message: 'Sisa AP tidak boleh melebihi AP per kuartal.',
      });
    }
    if (state.turn > state.maxTurns) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['turn'],
        message: 'Turn tidak boleh melebihi maxTurns.',
      });
    }
    if (!uniqueStrings(state.factions.map((faction) => faction.factionId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['factions'],
        message: 'FactionState tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.ministries.map((ministry) => ministry.ministryId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ministries'],
        message: 'MinistryState tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.activePolicies.map((policy) => policy.policyId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['activePolicies'],
        message: 'Kebijakan aktif tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.pendingCommands.map((command) => command.commandId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pendingCommands'],
        message: 'ID command pending tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.pendingEvents.map((event) => event.eventId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pendingEvents'],
        message: 'Event pending tidak boleh duplikat.',
      });
    }
    if (!uniqueStrings(state.lobbyThisTurn)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lobbyThisTurn'],
        message: 'Satu fraksi hanya boleh dilobi sekali per kuartal.',
      });
    }
    if (
      state.rulesetMigratedFrom !== undefined &&
      state.rulesetMigratedFrom >= state.rulesetVersion
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rulesetMigratedFrom'],
        message: 'rulesetMigratedFrom harus lebih kecil dari rulesetVersion.',
      });
    }
  });

export type GameState = z.infer<typeof gameStateSchema>;

export const ledgerKindSchema = z.enum([
  'INDICATOR',
  'TREASURY',
  'FACTION',
  'MINISTRY',
  'POLICY',
  'VOTE',
  'EVENT',
  'SYSTEM',
]);

export const ledgerEntrySchema = z.object({
  id: z.string().min(1).max(100),
  turn: z.number().int().min(1).max(100),
  kind: ledgerKindSchema,
  reasonCode: z.string().min(1).max(64),
  sourceId: z.string().min(1).max(64).optional(),
  policyId: idSchema.optional(),
  factionId: idSchema.optional(),
  ministryId: idSchema.optional(),
  eventId: idSchema.optional(),
  indicator: z.string().min(1).max(40).optional(),
  deltaTenths: z.number().int().optional(),
  amountBillion: z.number().int().optional(),
  message: z.string().max(300).optional(),
});

export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

export const voteOutcomeSchema = z.object({
  policyId: idSchema,
  seatsFor: z.number().int().min(0).max(100),
  seatsAgainst: z.number().int().min(0).max(100),
  passed: z.boolean(),
  factionVotes: z.array(
    z.object({
      factionId: idSchema,
      supportTenths,
      score: z.number().int(),
      vote: z.enum(['FOR', 'AGAINST']),
    }),
  ),
});

export type VoteOutcome = z.infer<typeof voteOutcomeSchema>;

export const resolvedEventSchema = z.object({
  eventId: idSchema,
  choiceId: z.string().min(1).max(20),
});

export const turnReportSchema = z.object({
  turn: z.number().int().min(1).max(100),
  year: z.number().int().min(2000).max(2200),
  quarter: z.number().int().min(1).max(4),
  presidentName: z.string().min(2).max(40),
  indicatorsBefore: indicatorsSchema,
  indicatorsAfter: indicatorsSchema,
  treasuryBeforeBillion: z.number().int(),
  treasuryAfterBillion: z.number().int(),
  ledger: z.array(ledgerEntrySchema),
  votes: z.array(voteOutcomeSchema),
  resolvedEvents: z.array(resolvedEventSchema),
  nextEventIds: z.array(idSchema),
  summary: z.array(z.string().max(300)).max(20),
});

export type TurnReport = z.infer<typeof turnReportSchema>;

export const policyCategoryCountsSchema = z.object({
  FISCAL: nonNegativeInt,
  SOCIAL: nonNegativeInt,
  ENERGY: nonNegativeInt,
  GOVERNANCE: nonNegativeInt,
});
